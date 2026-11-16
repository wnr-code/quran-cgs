// One-time bridge from the former Compose app's SharedPreferences/files into the shared PWA stores.
import { Capacitor, registerPlugin } from '@capacitor/core'
import { mapDetail } from '../api/equran.js'
import { surahRepo, kv } from '../database/repositories.js'
import { getLastRead, savePosition } from './reading-position.js'
import { getSettings, saveSettings } from './storage.js'
import { CITIES } from '../data/cities.js'
import { isAyahNo, validateSurahDetail } from '../utils/validation.js'

const LegacyMigration = registerPlugin('LegacyMigration')
const TASBIH_TARGETS = new Set([33, 99, 100])

/** Map a validated old Android EQuran cache file into the exact record shape used by the current API adapter. */
export function mapLegacyChapter(raw, expectedSurah) {
  if (!Number.isInteger(Number(expectedSurah)) || Number(expectedSurah) < 1 || Number(expectedSurah) > 114) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    const source = parsed && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed
    const chapter = mapDetail(source)
    return validateSurahDetail(chapter, Number(expectedSurah)) ? chapter : null
  } catch {
    return null
  }
}

const positiveInt = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isSafeInteger(n) && n >= 0 ? n : fallback
}

/** Read legacy values and restore the small settings before the first shared page renders. */
export async function prepareLegacyNativeData() {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('LegacyMigration')) return null
  const legacy = await LegacyMigration.getLegacyData()
  if (!legacy || legacy.complete) return null

  const prefs = legacy.preferences && typeof legacy.preferences === 'object' ? legacy.preferences : {}
  const imported = { position: false, location: false, tasbih: false, surahs: 0 }

  const surah = Number(prefs.last_surah)
  const ayah = Number(prefs.last_ayah)
  if (isAyahNo(surah, ayah) && !(await getLastRead())) {
    savePosition({ surah, ayah })
    imported.position = true
  }

  const oldCity = typeof prefs.city_name === 'string' ? prefs.city_name.trim() : ''
  if (oldCity && !getSettings().location) {
    const city = CITIES.find((item) => item.name.toLocaleLowerCase('id') === oldCity.toLocaleLowerCase('id'))
    if (city) {
      saveSettings({ location: { ...city } })
      imported.location = true
    }
  }

  if ((await kv.get('tasbih')) == null) {
    const oldCount = positiveInt(prefs.tasbih_count)
    const requestedTarget = positiveInt(prefs.tasbih_target, 33)
    const target = TASBIH_TARGETS.has(requestedTarget) ? requestedTarget : 33
    await kv.set('tasbih', {
      count: oldCount % target,
      target,
      total: oldCount,
      rounds: Math.floor(oldCount / target)
    })
    imported.tasbih = true
  }

  return { legacy, imported }
}

/** Import the potentially larger chapter files after the first view is visible. Safe to retry on next launch. */
export async function importLegacyNativeSurahs(migration) {
  if (!migration) return { migrated: false, reason: 'not-pending' }
  const { legacy, imported } = migration
  const numbers = [...new Set((Array.isArray(legacy.surahs) ? legacy.surahs : []).map(Number))]
    .filter((number) => Number.isInteger(number) && number >= 1 && number <= 114)
    .sort((a, b) => a - b)
  let failed = false

  for (const number of numbers) {
    try {
      if (await surahRepo.get(number)) continue
      const result = await LegacyMigration.getLegacySurah({ number })
      const chapter = mapLegacyChapter(result && result.content, number)
      if (!chapter) {
        failed = true
        continue
      }
      await surahRepo.put(chapter)
      const stored = await surahRepo.get(number)
      if (!stored || !validateSurahDetail(stored, number)) {
        failed = true
        continue
      }
      imported.surahs++
    } catch (error) {
      failed = true
      console.warn(`[migration] cache surah ${number} tidak dapat dipindahkan`, error)
    }
  }

  if (!failed) {
    try {
      await LegacyMigration.completeLegacyMigration()
    } catch (error) {
      failed = true
      console.warn('[migration] penanda migrasi native gagal disimpan', error)
    }
  }
  return { migrated: true, complete: !failed, imported }
}

export async function migrateLegacyNativeData() {
  const migration = await prepareLegacyNativeData()
  return migration ? importLegacyNativeSurahs(migration) : { migrated: false, reason: 'not-pending' }
}

/** Remove leftover legacy preferences/cache when the user explicitly wipes all app data. */
export async function clearLegacyNativeData() {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('LegacyMigration')) return
  await LegacyMigration.clearLegacyData()
}
