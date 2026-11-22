// Teks & tautan untuk membagikan doa atau konten lain. Doa lama tetap memakai bentuk { title, ar, latin, arti, ref, tab | path }.
export function doaText(p) {
  return [p.title, p.ar, p.latin, p.arti && `Artinya: ${p.arti}`, p.ref && `(${p.ref})`].filter(Boolean).join('\n\n')
}
export const shareUrl = (p, origin) => p.url || `${origin}${p.path || `/doa/${p.tab}`}`
export const doaUrl = shareUrl
export const shareContent = (p) => (typeof p.text === 'string' ? p.text : doaText(p))
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t)

/** Tautan bagikan ke media sosial (dibuka di aplikasi/tab masing-masing). */
export function shareLinks(p, origin) {
  const url = doaUrl(p, origin)
  const text = shareContent(p)
  const full = `${text}\n\nDibagikan dari QuranKu`
  const e = encodeURIComponent
  return {
    whatsapp: `https://wa.me/?text=${e(`${full}\n${url}`)}`,
    telegram: `https://t.me/share/url?url=${e(url)}&text=${e(full)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
    x: `https://twitter.com/intent/tweet?text=${e(cut(`${p.title}\n${p.text ?? p.ar ?? ''}`, 200))}&url=${e(url)}`
  }
}
