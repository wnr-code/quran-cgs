import { pageHeader } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { kv } from '../database/repositories.js'
import { $, toast } from '../utils/helpers.js'
import { qnum } from '../utils/arabic-numbers.js'

export default async function tasbih(root) {
  const st = { count: 0, target: 33, total: 0, rounds: 0, ...((await kv.get('tasbih')) || {}) }
  root.innerHTML = `<div class="page tasbih-page">${pageHeader('Tasbih Digital')}
    <section class="card tasbih-card ornament">
      <p class="eyebrow">Hitungan</p>
      <button class="tasbih-btn" data-tap aria-label="Tambah hitungan"><b data-count></b><small data-of></small></button>
      <p class="np-sub" data-info></p>
    </section>
    <section class="card"><div class="field"><span>Target</span><div class="seg" data-targets>${[33, 99, 100, 1000].map((t) => `<button data-t="${t}">${t}</button>`).join('')}</div></div>
      <label class="field inline"><span>Target kustom</span><input type="number" min="1" max="100000" inputmode="numeric" data-custom /></label>
      <div class="btn-row"><button class="btn" data-reset>${icon('refresh')}Reset hitungan</button><button class="btn btn-danger" data-reset-all>${icon('trash')}Reset semua</button></div>
      <p class="hint">Hitungan tersimpan otomatis di perangkat. Sentuh lingkaran atau tekan spasi untuk menambah.</p></section></div>`
  const save = () => kv.set('tasbih', st)
  const render = () => {
    $('[data-count]', root).textContent = qnum(st.count)
    $('[data-of]', root).textContent = `dari ${st.target}`
    $('[data-info]', root).textContent = `Putaran selesai: ${st.rounds} · Total zikir: ${st.total}`
    root.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', +b.dataset.t === st.target))
    $('[data-custom]', root).value = [33, 99, 100, 1000].includes(st.target) ? '' : st.target
    $('.tasbih-btn', root).style.setProperty('--p', Math.min(1, st.count / st.target))
  }
  const tap = () => {
    st.count++
    st.total++
    if (st.count >= st.target) {
      st.rounds++
      st.count = 0
      if (navigator.vibrate) navigator.vibrate([80, 60, 80])
      toast(`Target ${st.target} tercapai`)
    } else if (navigator.vibrate) navigator.vibrate(12)
    render()
    save()
  }
  const page = root.firstElementChild
  page.addEventListener('click', (e) => {
    if (e.target.closest('[data-tap]')) return tap()
    const t = e.target.closest('[data-t]')
    if (t) {
      st.target = +t.dataset.t
      st.count = Math.min(st.count, st.target - 1)
    } else if (e.target.closest('[data-reset]')) st.count = 0
    else if (e.target.closest('[data-reset-all]')) Object.assign(st, { count: 0, total: 0, rounds: 0 })
    else return
    render()
    save()
  })
  $('[data-custom]', root).addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10)
    if (v >= 1 && v <= 100000) {
      st.target = v
      st.count = Math.min(st.count, v - 1)
      render()
      save()
    }
  })
  const onKey = (e) => {
    if (e.code === 'Space' && !e.target.closest('input, button')) {
      e.preventDefault()
      tap()
    }
  }
  document.addEventListener('keydown', onKey)
  render()
  return () => document.removeEventListener('keydown', onKey)
}
