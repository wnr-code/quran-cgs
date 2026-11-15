import { pageHeader } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import data from '../data/asmaul-husna.json'
import { $, esc, debounce } from '../utils/helpers.js'
import { qnum } from '../utils/arabic-numbers.js'

export default function asmaul(root) {
  root.innerHTML = `<div class="page">${pageHeader('Asmaul Husna', { subtitle: '99 nama Allah' })}
    <div class="search-box">${icon('search')}<input type="search" placeholder="Cari nama atau arti…" aria-label="Cari" autocomplete="off" /></div>
    <div class="asma-grid" data-list></div>
    <p class="hint pad">Sumber data: ${esc(data.source)}. Audio belum tersedia dari sumber data.</p></div>`
  const list = $('[data-list]', root)
  const input = $('input', root)
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '')
  const render = () => {
    const q = norm(input.value)
    const items = q ? data.items.filter((x) => norm(x.latin).includes(q) || norm(x.arti).includes(q)) : data.items
    list.innerHTML = items.map((x) => `<article class="asma"><span class="num-star"><span>${qnum(x.id)}</span></span><p class="asma-ar" lang="ar" dir="rtl">${esc(x.arab)}</p><strong>${esc(x.latin)}</strong><small>${esc(x.arti)}</small></article>`).join('') || '<p class="muted pad">Tidak ditemukan.</p>'
  }
  input.addEventListener('input', debounce(render, 120))
  render()
}
