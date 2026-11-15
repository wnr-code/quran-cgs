// Penjajakan: skrip resmi tombol/overlay untuk mengetahui cara membentuk alamat popup.
const out = []
for (const u of ['https://edge-cdn.trakteer.id/js/embed/trbtn-overlay.min.js', 'https://edge-cdn.trakteer.id/js/embed/trbtn.min.js']) {
  const t = await (await fetch(u)).text()
  for (let i = 0; i < t.length; i += 3500) out.push(`[${u.split('/').pop()} ${i}] ` + t.slice(i, i + 3500).replace(/\n/g, ' '))
}
for (const l of out) console.log('::notice::' + l.replace(/%/g, '%25'))
