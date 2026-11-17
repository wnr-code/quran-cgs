// Rebuild the app-aligned Tajweed index from the upstream Hafs annotations and a matching Tanzil text.
// Usage: node scripts/gen-tajweed-spans.mjs <tajweed.hafs.uthmani-pause-sajdah.json> <tanzil-uthmani.txt>
// The upstream annotation JSON and Tanzil text are external inputs; this script does not download them.
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { arabicBaseTokens, arabicTokenFingerprint, TAJWEED_RULES } from '../src/utils/tajweed.js'

const [annotationPath, tanzilPath] = process.argv.slice(2)
if (!annotationPath || !tanzilPath) {
  throw new Error('Usage: node scripts/gen-tajweed-spans.mjs <tajweed.hafs.uthmani-pause-sajdah.json> <tanzil-uthmani.txt>')
}

const sourceRecords = JSON.parse(readFileSync(annotationPath, 'utf8'))
const sourceText = new Map()
for (const line of readFileSync(tanzilPath, 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const first = line.indexOf('|')
  const second = line.indexOf('|', first + 1)
  if (first < 1 || second < 0) throw new Error(`Unexpected Tanzil row: ${line.slice(0, 80)}`)
  const surah = Number(line.slice(0, first))
  const ayah = Number(line.slice(first + 1, second))
  const text = line.slice(second + 1)
  const key = `${surah}:${ayah}`
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || !text || sourceText.has(key)) {
    throw new Error(`Invalid or duplicate Tanzil row: ${key}`)
  }
  sourceText.set(key, text)
}

const require = createRequire(import.meta.url)
const chapters = require('quran-json/dist/quran_id.json')
const targets = new Map()
for (const chapter of chapters) {
  for (const verse of chapter.verses) targets.set(`${chapter.id}:${verse.id}`, verse.text)
}
if (sourceRecords.length !== 6236 || sourceText.size !== 6236 || targets.size !== 6236) {
  throw new Error(`Expected 6,236 source, Tanzil, and app verses; got ${sourceRecords.length}, ${sourceText.size}, ${targets.size}`)
}

const ruleIds = TAJWEED_RULES.map(({ id }) => id)
const ruleIndex = new Map(ruleIds.map((id, index) => [id, index]))
const expectedMismatches = new Set(['12:39', '12:41'])
const seen = new Set()
const verses = []
const mismatches = []
let annotationCount = 0
let unannotatedCount = 0

function sourceBody(raw, surah, ayah) {
  if (ayah !== 1 || surah === 1 || surah === 9) return { body: raw, prefix: 0 }
  const words = raw.split(' ')
  if (words.length < 5 || !words[0].startsWith('ب')) throw new Error(`Unexpected basmalah in ${surah}:1`)
  const prefixText = `${words.slice(0, 4).join(' ')} `
  if (!raw.startsWith(prefixText)) throw new Error(`Could not isolate basmalah in ${surah}:1`)
  return { body: raw.slice(prefixText.length), prefix: prefixText.length }
}

function tokensInRange(tokens, start, end) {
  const selected = []
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.start < end && token.end > start) selected.push(index)
  }
  return selected
}

for (const record of sourceRecords) {
  const surah = record.surah
  const ayah = record.ayah
  const key = `${surah}:${ayah}`
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || seen.has(key)) throw new Error(`Invalid or duplicate annotation record: ${key}`)
  seen.add(key)
  const raw = sourceText.get(key)
  const target = targets.get(key)
  if (!raw || !target || !Array.isArray(record.annotations)) throw new Error(`Missing source/app verse or annotations: ${key}`)
  // Source offsets are Unicode codepoint indices. All characters in these Arabic texts must be BMP
  // codepoints for their offsets to equal JavaScript's UTF-16 string indices.
  if (raw.length !== Array.from(raw).length || target.length !== Array.from(target).length) {
    throw new Error(`Unexpected supplementary codepoint in ${key}; offset conversion needs review`)
  }
  if (!record.annotations.length) {
    unannotatedCount++
    continue
  }

  const { body, prefix } = sourceBody(raw, surah, ayah)
  const sourceTokens = arabicBaseTokens(body)
  const targetTokens = arabicBaseTokens(target)
  if (sourceTokens.map(({ value }) => value).join('') !== targetTokens.map(({ value }) => value).join('')) {
    mismatches.push(key)
    continue
  }

  const spans = []
  for (const annotation of record.annotations) {
    const rule = ruleIndex.get(annotation.rule)
    if (rule === undefined) throw new Error(`Unknown Tajweed rule ${annotation.rule} in ${key}`)
    const start = annotation.start - prefix
    const end = annotation.end - prefix
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= end || end > body.length) {
      throw new Error(`Invalid source offset in ${key}: ${JSON.stringify(annotation)}`)
    }
    const selected = tokensInRange(sourceTokens, start, end)
    if (!selected.length) throw new Error(`Annotation has no Arabic letter in ${key}: ${JSON.stringify(annotation)}`)
    spans.push([selected[0], selected.at(-1) + 1, rule])
  }
  if (spans.length) {
    verses.push([surah, ayah, targetTokens.length, arabicTokenFingerprint(targetTokens), spans])
    annotationCount += spans.length
  }
}

if (seen.size !== 6236) throw new Error(`Expected 6,236 unique annotation records; got ${seen.size}`)
if (mismatches.length !== expectedMismatches.size || mismatches.some((key) => !expectedMismatches.has(key))) {
  throw new Error(`Unexpected app/source text mismatch list: ${mismatches.join(', ') || '(none)'}`)
}
if ([...expectedMismatches].some((key) => !mismatches.includes(key))) {
  throw new Error(`Expected text mismatches changed: ${mismatches.join(', ')}`)
}

const output = {
  version: 1,
  source: 'SadaqaWorks/quran-tajweed, output/tajweed.hafs.uthmani-pause-sajdah.json',
  sourceCommit: '40753ddd0cc815851dda73a5ae43c022e17496c3',
  sourceUrl: 'https://github.com/SadaqaWorks/quran-tajweed/tree/40753ddd0cc815851dda73a5ae43c022e17496c3/output/tajweed.hafs.uthmani-pause-sajdah.json',
  license: 'CC BY 4.0',
  changes: 'Source codepoint offsets are mapped to app Arabic-letter tokens; a per-ayah fingerprint prevents highlighting mismatched text. 12:39 and 12:41 are omitted because their local text does not match the annotation source.',
  coverage: {
    sourceVerses: sourceRecords.length,
    annotatedVerses: verses.length,
    annotatedSpans: annotationCount,
    unannotatedVerses: unannotatedCount,
    skippedTextMismatches: mismatches
  },
  rules: ruleIds,
  verses
}
writeFileSync('src/data/tajweed-spans.json', `${JSON.stringify(output)}\n`)
console.log(`[tajweed] ${verses.length} annotated verses, ${annotationCount} spans; ${unannotatedCount} unannotated; skipped text mismatches: ${mismatches.join(', ')}`)
