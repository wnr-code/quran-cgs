// Tajweed annotations are precomputed, sourced from quran-tajweed (Hafs) rather than inferred here.
// Alignment is fail-closed: an ayah is highlighted only when its normalized Arabic-letter fingerprint matches.
export const TAJWEED_RULES = [
  { id: 'ghunnah', name: 'Ghunnah', description: 'Dengung pada bacaan yang ditandai sumber.' },
  { id: 'idghaam_ghunnah', name: 'Idgham bighunnah', description: 'Peleburan dengan dengung, pada huruf yang diberi tanda oleh sumber.' },
  { id: 'idghaam_no_ghunnah', name: 'Idgham bilaghunnah', description: 'Peleburan tanpa dengung, pada huruf yang diberi tanda oleh sumber.' },
  { id: 'idghaam_mutajanisayn', name: 'Idgham mutajanisain', description: 'Peleburan dua huruf yang makhrajnya sama, dengan sifat berbeda.' },
  { id: 'idghaam_mutaqaribayn', name: 'Idgham mutaqaribain', description: 'Peleburan dua huruf yang makhraj atau sifatnya berdekatan.' },
  { id: 'idghaam_shafawi', name: 'Idgham syafawi', description: 'Peleburan mim sukun ke mim berikutnya.' },
  { id: 'ikhfa', name: 'Ikhfa haqiqi', description: 'Nun sukun atau tanwin dibaca samar dengan dengung pada huruf yang ditandai.' },
  { id: 'ikhfa_shafawi', name: 'Ikhfa syafawi', description: 'Mim sukun dibaca samar ketika bertemu ba.' },
  { id: 'iqlab', name: 'Iqlab', description: 'Nun sukun atau tanwin berubah menjadi bunyi mim samar ketika bertemu ba.' },
  { id: 'madd_2', name: 'Madd asli (2 harakat)', description: 'Tanda mad yang pada data sumber diberi panjang dua harakat.' },
  { id: 'madd_246', name: 'Madd aridh / lin', description: 'Tanda mad yang panjangnya dapat berbeda saat waqaf (2, 4, atau 6 harakat).' },
  { id: 'madd_6', name: 'Madd lazim (6 harakat)', description: 'Tanda mad lazim, dibaca enam harakat.' },
  { id: 'madd_munfasil', name: 'Madd jaiz munfasil', description: 'Mad pada akhir kata bertemu hamzah di kata berikutnya; panjang mengikuti riwayat dan metode.' },
  { id: 'madd_muttasil', name: 'Madd wajib muttasil', description: 'Mad dan hamzah berada dalam satu kata; panjang mengikuti riwayat dan metode.' },
  { id: 'qalqalah', name: 'Qalqalah', description: 'Pantulan ringan pada huruf qalqalah yang ditandai.' },
  { id: 'hamzat_wasl', name: 'Hamzatul washl', description: 'Hamzah washl; cara membacanya bergantung pada sambungan bacaan.' },
  { id: 'lam_shamsiyyah', name: 'Lam syamsiyyah', description: 'Lam pada alif-lam syamsiyyah tidak dilafalkan sebagai lam tersendiri.' },
  { id: 'silent', name: 'Huruf tidak dilafalkan', description: 'Huruf/tanda yang tidak dilafalkan pada posisi yang ditandai sumber.' }
]

const RULE_BY_ID = new Map(TAJWEED_RULES.map((rule, index) => [rule.id, { ...rule, index }]))
const BASE_LETTER = /^[\u0621-\u064a\u066e\u066f\u0671-\u06d3\u06fa-\u06fc\u06ff]$/u
const MARK = /^\p{M}$/u
const SMALL_QURAN_MARKS = new Set(['ـ', 'ۥ', 'ۦ', 'ۧ', 'ۨ', '۩', '۪', '۫', '۬', 'ۭ'])
const MODIFIER = (char) => MARK.test(char) || SMALL_QURAN_MARKS.has(char)

function canonicalLetter(char) {
  if (char === 'ٰ' || 'ٱأإآٲٳٵ'.includes(char)) return 'ا'
  if ('ىئ'.includes(char)) return 'ي'
  if (char === 'ؤ') return 'و'
  return char
}

/** Arabic base-letter tokens with exact offsets into the original UTF-16 string. */
export function arabicBaseTokens(text) {
  if (typeof text !== 'string' || !text) return []
  const clusters = []
  let current = null
  let offset = 0
  for (const char of text) {
    const end = offset + char.length
    if (char !== 'ـ' && char !== 'ٰ' && BASE_LETTER.test(char)) {
      current = { letter: char, start: offset, end }
      clusters.push(current)
    } else if (char === 'ٰ') {
      // Tanzil's annotation rules count dagger alif as a base letter, unlike ordinary harakat.
      // Keep its visual range attached to the preceding grapheme so wrapping never strands a mark.
      if (current) current.end = end
      const dagger = { letter: char, start: current ? current.start : offset, end }
      current = dagger
      clusters.push(dagger)
    } else if (MODIFIER(char)) {
      if (current) current.end = end
    } else {
      current = null
    }
    offset = end
  }

  const tokens = []
  for (let i = 0; i < clusters.length; i++) {
    const item = clusters[i]
    if (item.letter === 'ء' && i + 1 < clusters.length && 'اٱأإآ'.includes(clusters[i + 1].letter)) {
      const next = clusters[++i]
      tokens.push({ value: 'ا', start: item.start, end: next.end })
    } else {
      tokens.push({ value: canonicalLetter(item.letter), start: item.start, end: item.end })
    }
  }
  return tokens
}

// 64-bit FNV-1a is used only as a compact, synchronous mismatch guard—not for security.
export function arabicTokenFingerprint(tokens) {
  let hash = 0xcbf29ce484222325n
  for (const token of tokens) {
    for (const char of token.value) {
      hash ^= BigInt(char.codePointAt(0))
      hash = BigInt.asUintN(64, hash * 0x100000001b3n)
    }
  }
  return hash.toString(16).padStart(16, '0')
}

export function createTajweedIndex(data) {
  const index = new Map()
  if (!data || !Array.isArray(data.verses) || !Array.isArray(data.rules)) return index
  if (data.rules.length !== TAJWEED_RULES.length || data.rules.some((id, i) => id !== TAJWEED_RULES[i].id)) {
    throw new Error('Tajweed rule index does not match the bundled guide')
  }
  for (const verse of data.verses) {
    if (Array.isArray(verse) && Number.isInteger(verse[0]) && Number.isInteger(verse[1])) index.set(`${verse[0]}:${verse[1]}`, verse)
  }
  return index
}

/** Translate trusted base-letter offsets to the active text only after exact fingerprint validation. */
export function mapTajweedRanges(text, record) {
  if (!record || !Array.isArray(record[4])) return []
  const tokens = arabicBaseTokens(text)
  if (tokens.length !== record[2] || arabicTokenFingerprint(tokens) !== record[3]) return []
  const ranges = []
  for (const span of record[4]) {
    if (!Array.isArray(span) || span.length !== 3) continue
    const [start, end, ruleIndex] = span
    const rule = TAJWEED_RULES[ruleIndex]
    if (!rule || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > tokens.length) continue
    ranges.push({ start: tokens[start].start, end: tokens[end - 1].end, rule: rule.id, label: rule.name })
  }
  return ranges
}

export const TAJWEED_GUIDE = TAJWEED_RULES
export const tajweedLabel = (id) => RULE_BY_ID.get(id)?.name || ''
