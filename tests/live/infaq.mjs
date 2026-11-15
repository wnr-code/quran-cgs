// Penjajakan: alamat popup pembayaran infaq yang benar.
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const out = []
const get = async (url, opt = {}) => {
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(25000), headers: { 'User-Agent': UA, Accept: 'text/html,application/json', Referer: 'https://quran.cgs.my.id/' }, ...opt })
    const body = await res.text()
    return { status: res.status, loc: res.headers.get('location') || '', xfo: res.headers.get('x-frame-options') || '', csp: (res.headers.get('content-security-policy') || '').slice(0, 160), body }
  } catch (e) {
    return { status: 0, loc: '', xfo: '', csp: '', body: String(e.message) }
  }
}
const cfg = await get('https://quran.cgs.my.id/api/infaq/config')
out.push('config: ' + cfg.status + ' ' + cfg.body.slice(0, 300))
for (const u of ['lanteraku', 'trakteer']) {
  for (const p of ['', '/tip', '/tip/embed/modal', '/tip/embed', '/embed/modal', '/tip?quantity=2', '/summary/embed', '/showcase/embed']) {
    const r = await get(`https://trakteer.id/${u}${p}`)
    const title = (/<title>([^<]*)/i.exec(r.body) || [])[1] || ''
    const hints = [...new Set((r.body.match(/[a-z0-9_./:-]*embed[a-z0-9_./:-]*/gi) || []).slice(0, 12))].join(' , ')
    const price = [...new Set((r.body.match(/(unit[_-]?price|data-price|"price"|min[_-]?(amount|price)|minimum)[^,;>]{0,40}/gi) || []).slice(0, 8))].join(' | ')
    out.push(`${u}${p} → ${r.status} ${r.loc} xfo=${r.xfo} len=${r.body.length} title="${title.trim().slice(0, 70)}" embed:[${hints.slice(0, 500)}] price:[${price.slice(0, 300)}]`)
  }
}
for (const u of ['https://edge-cdn.trakteer.id/js/embed/trbtn.min.js', 'https://cdn.trakteer.id/js/embed/trbtn.min.js', 'https://edge-cdn.trakteer.id/js/embed/trbtn-overlay.min.js', 'https://edge-cdn.trakteer.id/js/trbtn-overlay.min.js']) {
  const r = await get(u)
  out.push(`${u} → ${r.status} len=${r.body.length} :: ${(r.body.match(/[^"'`\s]{0,80}embed[^"'`\s]{0,80}/gi) || []).slice(0, 8).join(' , ').slice(0, 600)}`)
}
console.log('::notice::' + out.join('%0A'))
