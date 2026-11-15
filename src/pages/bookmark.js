import { bookmarkRepo, noteRepo, historyRepo, exportBackup, importBackup } from '../database/repositories.js'
import { getLastRead } from '../services/reading-position.js'
import { getSettings, replaceSettings } from '../services/storage.js'
import { pageHeader, emptyState } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { confirmDialog } from '../components/modal.js'
import { $, esc, toast, downloadFile } from '../utils/helpers.js'
import { qnum } from '../utils/arabic-numbers.js'
import { formatDateTime, dateKey } from '../utils/format.js'

let tab = 'bookmark'
let cat = ''

export async function doExport() {
  const data = await exportBackup(getSettings())
  downloadFile(`quranku-backup-${dateKey()}.json`, JSON.stringify(data, null, 2))
  toast('Cadangan diekspor')
}

export function doImport(after) {
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.accept = 'application/json,.json'
  inp.onchange = async () => {
    const f = inp.files[0]
    if (!f) return
    try {
      if (f.size > 20 * 1024 * 1024) throw new Error('Berkas terlalu besar')
      const data = JSON.parse(await f.text())
      const c = await importBackup(data)
      if (data.settings && typeof data.settings === 'object') replaceSettings(data.settings)
      toast(`Impor berhasil: ${c.bookmarks} bookmark, ${c.notes} catatan`)
      after && after()
    } catch (e) {
      toast('Impor gagal: ' + (e.message || 'berkas tidak valid'))
    }
  }
  inp.click()
}

export default async function bookmark(root) {
  root.innerHTML = `<div class="page">
    ${pageHeader('Bookmark & Riwayat', { back: false, actions: `<button class="icon-btn" data-export aria-label="Ekspor cadangan">${icon('download')}</button><button class="icon-btn" data-import aria-label="Impor cadangan">${icon('upload')}</button>` })}
    <div class="tabs" role="tablist"><button data-tab="bookmark">Bookmark</button><button data-tab="notes">Catatan</button><button data-tab="history">Riwayat</button></div>
    <div data-body></div></div>`
  const body = $('[data-body]', root)

  const item = (href, title, sub, extra, del) => `<div class="row-link with-del"><a href="${href}"><span><strong>${title}</strong><small>${sub}</small>${extra || ''}</span></a>${del ? `<button class="icon-btn sm" ${del} aria-label="Hapus">${icon('trash')}</button>` : ''}</div>`

  async function render() {
    root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab))
    if (tab === 'bookmark') {
      const all = await bookmarkRepo.all()
      const cats = Array.from(new Set(all.map((b) => b.category)))
      if (cat && !cats.includes(cat)) cat = ''
      const items = cat ? all.filter((b) => b.category === cat) : all
      body.innerHTML = all.length
        ? `<div class="chips"><button class="chip ${cat ? '' : 'on'}" data-cat="">Semua (${all.length})</button>${cats.map((c) => `<button class="chip ${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
          <div class="list">${items.map((b) => item(b.type === 'tafsir' ? `#/tafsir/${b.surah}/${b.ayah}` : `#/surah/${b.surah}/${b.ayah}`, `${esc(b.surahName || 'Surah ' + b.surah)} <span class="ref">${b.surah}:${b.ayah}</span>`, `${b.type === 'tafsir' ? 'Tafsir · ' : ''}${esc(b.category)} · ${formatDateTime(b.createdAt)}`, '', `data-del-bm="${esc(b.id)}"`)).join('')}</div>`
        : emptyState('bookmark', 'Belum ada bookmark', 'Sentuh ayat saat membaca lalu pilih Bookmark.', '<a class="btn btn-primary" href="#/quran">Buka Al-Qur’an</a>')
    } else if (tab === 'notes') {
      const all = await noteRepo.all()
      body.innerHTML = all.length
        ? `<div class="list">${all.map((x) => item(`#/surah/${x.surah}/${x.ayah}`, `${esc(x.surahName || 'Surah ' + x.surah)} <span class="ref">${x.surah}:${x.ayah}</span>`, formatDateTime(x.updatedAt), `<p class="note-text">${esc(x.text)}</p>`, `data-del-note="${esc(x.id)}"`)).join('')}</div>`
        : emptyState('note', 'Belum ada catatan', 'Catatan pribadi hanya tersimpan di perangkat ini.')
    } else {
      const [all, last] = await Promise.all([historyRepo.all(), getLastRead()])
      body.innerHTML =
        (last ? `<a class="card last-card" href="#/surah/${last.surah}?resume=1"><p class="eyebrow">Bacaan terakhir</p><h2>${esc(last.surahName || '')} · Ayat <span class="qn">${qnum(last.ayah)}</span></h2><p class="muted">${formatDateTime(last.at)}</p></a>` : '') +
        (all.length
          ? `<div class="list">${all.map((h) => item(`#/surah/${h.surah}/${h.ayah}`, `${esc(h.surahName || 'Surah ' + h.surah)} <span class="ref">${h.surah}:${h.ayah}</span>`, formatDateTime(h.at))).join('')}</div><div class="btn-row"><button class="btn btn-danger" data-clear-history>${icon('trash')}Hapus riwayat</button></div>`
          : emptyState('clock', 'Riwayat kosong', 'Surah yang Anda buka akan muncul di sini.'))
    }
  }

  root.firstElementChild.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tab]')
    if (t) {
      tab = t.dataset.tab
      return render()
    }
    const c = e.target.closest('[data-cat]')
    if (c) {
      cat = c.dataset.cat
      return render()
    }
    const bm = e.target.closest('[data-del-bm]')
    if (bm) {
      await bookmarkRepo.remove(bm.dataset.delBm)
      toast('Bookmark dihapus')
      return render()
    }
    const nt = e.target.closest('[data-del-note]')
    if (nt) {
      if (await confirmDialog('Hapus catatan ini?', { danger: true, ok: 'Hapus' })) {
        await noteRepo.remove(nt.dataset.delNote)
        render()
      }
      return
    }
    if (e.target.closest('[data-clear-history]')) {
      if (await confirmDialog('Hapus seluruh riwayat bacaan?', { danger: true, ok: 'Hapus' })) {
        await historyRepo.clear()
        render()
      }
      return
    }
    if (e.target.closest('[data-export]')) return doExport()
    if (e.target.closest('[data-import]')) return doImport(render)
  })
  render()
}
