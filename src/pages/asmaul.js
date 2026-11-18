import { pageHeader } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { openSheet } from '../components/modal.js'
import { getSurah } from '../api/api-adapter.js'
import data from '../data/asmaul-husna.json'
import { $, esc, debounce, copyText, toast } from '../utils/helpers.js'
import { qnum } from '../utils/arabic-numbers.js'
import { APP } from '../config.js'
import { createShareImage } from '../utils/ayah-image.js'
import { fi, openShare } from '../components/share-sheet.js'

const TOTAL = data.items.length

export default function asmaul(root) {
  root.innerHTML = `<div class="page asma-page">${pageHeader('Asmaul Husna', { subtitle: `${TOTAL} nama Allah yang indah` })}
    <section class="card ornament asma-hero">
      <p class="eyebrow">Asmaul Husna</p>
      <h2>${TOTAL} Nama Allah</h2>
      <div data-verse></div>
    </section>
    <div class="search-box">${icon('search')}<input type="search" placeholder="Cari nama, arti, atau makna…" aria-label="Cari" autocomplete="off" /></div>
    <p class="asma-count" data-count></p>
    <div class="asma-grid" data-list></div>
    <p class="hint pad">Sentuh sebuah nama untuk melihat makna, faedah, dan rujukan ayatnya, lalu salin atau bagikan.</p>
    <footer class="src-foot">${fi('book-open')}<p><strong>Sumber:</strong> <a class="link" href="#/sumber">${esc(data.source)}</a>. Makna &amp; faedah adalah ringkasan dari sumber tersebut; rujukan ayat dapat dibuka untuk dibaca langsung.</p></footer></div>`
  const list = $('[data-list]', root)
  const input = $('input', root)
  const count = $('[data-count]', root)
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '')
  const render = () => {
    const q = norm(input.value)
    const items = q ? data.items.filter((x) => norm(x.latin).includes(q) || norm(x.arti).includes(q) || (q.length > 3 && norm(x.makna).includes(q))) : data.items
    count.textContent = q ? `${items.length} dari ${TOTAL} nama` : ''
    count.hidden = !q
    list.innerHTML =
      items
        .map(
          (x) => `<button type="button" class="asma" data-id="${x.id}">
            <span class="asma-no"><span>${qnum(x.id)}</span></span>
            <span class="asma-ar" lang="ar" dir="rtl">${esc(x.arab)}</span>
            <span class="asma-rule" aria-hidden="true"></span>
            <strong>${esc(x.latin)}</strong>
            <small>${esc(x.arti)}</small>
          </button>`
        )
        .join('') || '<p class="muted pad">Tidak ditemukan.</p>'
  }
  input.addEventListener('input', debounce(render, 120))
  render()

  // Sentuh kartu: tampilan besar satu nama, bisa pindah ke nama sebelum/sesudahnya.
  const detail = (x) => `<div class="asma-detail">
      <span class="asma-no lg"><span>${qnum(x.id)}</span></span>
      <p class="asma-detail-ar" lang="ar" dir="rtl">${esc(x.arab)}</p>
      <h3>${esc(x.latin)}</h3>
      <p class="asma-detail-arti">${esc(x.arti)}</p>
    </div>
    ${x.makna ? `<section class="asma-sec"><h4>${icon('book')}Makna</h4><p>${esc(x.makna)}</p></section>` : ''}
    ${x.amalan ? `<section class="asma-sec"><h4>${icon('hands')}Faedah &amp; amalan</h4><p>${esc(x.amalan)}</p></section>` : ''}
    ${x.ref && x.ref.length ? `<section class="asma-sec"><h4>${icon('bookmark')}Rujukan</h4><div class="asma-refs">${x.ref.map((r) => (r.s ? `<a class="chip chip-link" href="#/surah/${r.s}/${r.a}">${esc(r.t)}</a>` : `<span class="asma-ref-note">${esc(r.t)}</span>`)).join('')}</div></section>` : ''}
    <div class="asma-detail-acts">
      <button class="btn" data-copy>${fi('copy')}Salin</button>
      <button class="btn btn-primary" data-share>${fi('share')}Bagikan</button>
    </div>
    <div class="asma-detail-nav">
      <button class="btn" data-go="-1" ${x.id <= 1 ? 'disabled' : ''}>${icon('back')}Sebelumnya</button>
      <span class="asma-pos">${x.id} / ${TOTAL}</span>
      <button class="btn" data-go="1" ${x.id >= TOTAL ? 'disabled' : ''}>Berikutnya${icon('forward')}</button>
    </div>`
  list.addEventListener('click', (e) => {
    const card = e.target.closest('.asma')
    if (!card) return
    let cur = data.items.find((x) => x.id === +card.dataset.id)
    openSheet({
      title: 'Asmaul Husna',
      content: `<div data-asma-detail>${detail(cur)}</div>`,
      onOpen(body) {
        const box = body.querySelector('[data-asma-detail]')
        body.addEventListener('click', async (ev) => {
          const go = ev.target.closest('[data-go]')
          if (go) {
            const nx = data.items.find((x) => x.id === cur.id + Number(go.dataset.go))
            if (nx) {
              cur = nx
              box.innerHTML = detail(cur)
            }
          } else if (ev.target.closest('[data-share]')) {
            openShare(
              { title: `Asmaul Husna ke-${cur.id}: ${cur.latin}`, ar: cur.arab, latin: cur.latin, arti: [cur.arti, cur.makna].filter(Boolean).join('. '), path: '/asmaul-husna' },
              {
                title: 'Bagikan Asmaul Husna',
                what: 'Asmaul Husna',
                image: {
                  filename: `quranku-asmaul-husna-${cur.id}.png`,
                  create: ({ theme, format }) => createShareImage({
                    heading: 'ASMAUL HUSNA',
                    blocks: [{
                      label: `Asmaul Husna ke-${cur.id}`,
                      arabic: cur.arab,
                      latin: cur.latin,
                      translation: [cur.arti, cur.makna].filter(Boolean).join('. ')
                    }],
                    reference: `${cur.id}. ${cur.latin}`,
                    sourceUrl: `${APP.origin}/#/asmaul-husna`,
                    theme,
                    format
                  })
                }
              }
            )
          } else if (ev.target.closest('[data-copy]')) {
            toast((await copyText(`${cur.arab}\n${cur.latin} — ${cur.arti}${cur.makna ? '\n\n' + cur.makna : ''}`)) ? 'Disalin' : 'Gagal menyalin')
          }
        })
      }
    })
  })

  // Ayat tentang Asmaul Husna (QS. Al-A'raf 7:180) diambil apa adanya dari sumber teks Al-Qur'an aplikasi.
  let alive = true
  getSurah(7)
    .then((s) => {
      const a = s && s.ayat && s.ayat[179]
      const box = $('[data-verse]', root)
      if (!alive || !a || !box) return
      box.innerHTML = `<p class="asma-verse-ar" lang="ar" dir="rtl">${esc(a.teksArab)}</p>
        ${a.teksIndonesia ? `<p class="asma-verse-id">“${esc(a.teksIndonesia)}”</p>` : ''}
        <a class="asma-verse-ref" href="#/surah/7/180">QS. ${esc(s.namaLatin)} 7:180</a>`
    })
    .catch(() => {})
  return () => {
    alive = false
  }
}
