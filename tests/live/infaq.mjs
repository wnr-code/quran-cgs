// Penjajakan: buka alamat popup dengan peramban sungguhan (melewati pemeriksaan bot bila bisa).
import puppeteer from 'puppeteer'
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] })
const out = []
for (const path of ['/lanteraku', '/lanteraku/tip/embed/modal', '/lanteraku/tip/embed/modal?embedId=0&ref=https://quran.cgs.my.id/', '/lanteraku/tip']) {
  const p = await b.newPage()
  await p.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36')
  await p.setViewport({ width: 412, height: 915, isMobile: true })
  let status = 0
  p.on('response', (r) => { if (r.request().isNavigationRequest() && r.frame() === p.mainFrame()) status = r.status() })
  try {
    await p.goto('https://trakteer.id' + path, { waitUntil: 'domcontentloaded', timeout: 40000 })
    for (let i = 0; i < 10 && /just a moment/i.test(await p.title()); i++) await new Promise((r) => setTimeout(r, 2500))
    const info = await p.evaluate(() => ({ title: document.title, text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 260), price: [...document.querySelectorAll('[data-price],[data-unit-price],input[name=quantity],input[name=price]')].map((e) => e.outerHTML.slice(0, 160)).slice(0, 4).join(' | '), embed: (document.documentElement.innerHTML.match(/[^"'\s]{0,60}embed[^"'\s]{0,60}/gi) || []).slice(0, 6).join(' , ') }))
    out.push(`${path} → ${status} title="${info.title}" text="${info.text}" price=[${info.price}] embed=[${info.embed}]`)
  } catch (e) {
    out.push(`${path} → gagal ${e.message}`)
  }
  await p.close()
}
await b.close()
for (const l of out) console.log('::notice::' + l.replace(/%/g, '%25').replace(/\n/g, ' '))
