// Persistent, device-local inbox for product news and reminders. No account or server sync.
import { APP } from '../config.js'
import { emit } from '../utils/helpers.js'
import { isAndroidApp, isNativePlatform } from './platform.js'
import { compareVersions, fetchPlayVersion } from './play-version.js'
import { NativePrayerNotifications } from './native-prayer-plugin.js'
import { navigate } from '../router.js'

const STORAGE_KEY = 'quranku:inbox:v1'
const MAX_REMINDERS = 100
const MAX_READ_IDS = 500

// Versioned content announcements stay available after being read, so the inbox also acts as a small archive.
const ANNOUNCEMENTS = [
  {
    id: 'content:tahlil-nu-online-v1',
    type: 'content',
    title: 'Tahlil & Doa Arwah kini tersedia',
    body: 'Rangkaian lengkap tersedia offline, dengan Surah Yasin sebagai bacaan lanjutan.',
    route: '/doa/tahlil',
    at: Date.UTC(2026, 10, 14)
  }
]

function loadState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      readIds: Array.isArray(value.readIds) ? value.readIds.filter((x) => typeof x === 'string').slice(-MAX_READ_IDS) : [],
      reminders: Array.isArray(value.reminders) ? value.reminders.filter((x) => x && typeof x.id === 'string').slice(-MAX_REMINDERS) : [],
      update: value.update && typeof value.update === 'object' ? value.update : null,
      installedBuild: value.installedBuild && typeof value.installedBuild === 'object' ? value.installedBuild : null,
      installedUpdate: value.installedUpdate && typeof value.installedUpdate === 'object' ? value.installedUpdate : null
    }
  } catch {
    return { readIds: [], reminders: [], update: null, installedBuild: null, installedUpdate: null }
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

const readSet = (state) => new Set(state.readIds)
const asTime = (value, fallback = Date.now()) => {
  const time = Number(value)
  return Number.isFinite(time) && time > 0 ? time : fallback
}
const safeRoute = (value) => typeof value === 'string' && /^\/[a-z0-9/-]*(?:\?[a-z0-9=&%-]*)?$/i.test(value) ? value : '/'

/** Record a delivered browser reminder. Repeated deliveries with the same ID are idempotent. */
export function recordInboxReminder({ id, title, body = '', route = '/', at = Date.now(), source = 'web' } = {}) {
  const state = loadState()
  const reminderId = String(id || `web:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`).slice(0, 180)
  const item = {
    id: reminderId,
    type: 'reminder',
    title: String(title || 'Pengingat QuranKu').slice(0, 120),
    body: String(body || '').slice(0, 500),
    route: safeRoute(route),
    at: asTime(at),
    source
  }
  const index = state.reminders.findIndex((entry) => entry.id === reminderId)
  if (index >= 0) {
    const old = state.reminders[index]
    if (old.title === item.title && old.body === item.body && old.route === item.route && old.at === item.at) return old
    state.reminders[index] = item
  } else {
    state.reminders.push(item)
  }
  state.reminders.sort((a, b) => asTime(a.at, 0) - asTime(b.at, 0))
  state.reminders = state.reminders.slice(-MAX_REMINDERS)
  if (saveState(state)) emit('inbox:changed')
  return item
}

function semverParts(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] || ''] : null
}

export function compareAppVersions(left, right) {
  const a = semverParts(left)
  const b = semverParts(right)
  if (!a || !b) return 0
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1
  if (a[3] === b[3]) return 0
  if (!a[3]) return 1
  if (!b[3]) return -1
  return a[3].localeCompare(b[3])
}

function compareBuilds(left, right) {
  const a = String(left || '')
  const b = String(right || '')
  if (a === b) return 0
  if (a === 'dev') return -1
  if (b === 'dev') return 1
  return a.localeCompare(b, 'en', { numeric: true })
}

export function isRemoteBuildNewer(remote, local = APP) {
  if (!remote || !semverParts(remote.version) || typeof remote.number !== 'string') return false
  const versionOrder = compareAppVersions(remote.version, local.version)
  return versionOrder > 0 || (versionOrder === 0 && compareBuilds(remote.number, local.build) > 0)
}

/** Notice a new native/PWA app build even when the service worker already activated it. */
export function recordCurrentAppBuild() {
  const state = loadState()
  const current = { version: APP.version, build: String(APP.build || 'dev') }
  const previous = state.installedBuild
  let changed = false
  const buildIsNewer = previous && (
    compareAppVersions(current.version, previous.version) > 0 ||
    (compareAppVersions(current.version, previous.version) === 0 && compareBuilds(current.build, previous.build) > 0)
  )
  if (buildIsNewer) {
    const matchesPending = state.update && state.update.version === current.version && state.update.build === current.build
    if (!matchesPending) {
      const id = `installed:${current.version}:${current.build}`
      state.installedUpdate = { id, ...current, at: Date.now() }
      changed = true
    }
  }
  state.installedBuild = current
  if (saveState(state) && changed) emit('inbox:changed')
  return changed
}

/** Keep a discovered web update in the inbox across the automatic service-worker reload. */
export function recordAvailableUpdate(remote) {
  if (!remote || !semverParts(remote.version) || typeof remote.number !== 'string' || !/^[A-Za-z0-9.-]{1,48}$/.test(remote.number)) return false
  const isNewer = compareAppVersions(remote.version, APP.version) > 0 ||
    (compareAppVersions(remote.version, APP.version) === 0 && compareBuilds(remote.number, APP.build) > 0)
  if (!isNewer) return false
  const state = loadState()
  const id = `update:${remote.version}:${remote.number}`
  if (state.update && state.update.id === id) return true
  state.update = { id, version: remote.version, build: remote.number, at: Date.now() }
  if (saveState(state)) emit('inbox:changed')
  return true
}

function routeForNativeReminder(kind) {
  if (kind === 'calendar') return '/kalender'
  if (kind === 'tilawah' || kind === 'goal') return '/target'
  return '/salat'
}

async function getNativeReminders() {
  if (!isAndroidApp()) return []
  try {
    const result = await NativePrayerNotifications.getNotifications()
    const records = Array.isArray(result?.items) ? result.items : []
    return records.filter((item) => item && (item.eventId || item.id)).map((item) => ({
      id: `android:${String(item.eventId || item.id)}`,
      type: 'reminder',
      title: String(item.title || 'Pengingat QuranKu'),
      body: String(item.body || ''),
      route: routeForNativeReminder(String(item.kind || '')),
      at: asTime(item.at),
      source: 'android',
      unread: item.read !== true
    }))
  } catch {
    return []
  }
}

async function importVisibleServiceWorkerNotifications() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration || typeof registration.getNotifications !== 'function') return
    const notifications = await registration.getNotifications()
    for (const notification of notifications) {
      const data = notification.data || {}
      if (!data.inboxId) continue
      const item = data.inboxItem || {}
      recordInboxReminder({
        id: data.inboxId,
        title: item.title || notification.title,
        body: item.body || notification.body,
        route: item.route || data.route || '/',
        at: item.at || data.at || notification.timestamp,
        source: 'web'
      })
    }
  } catch {}
}

/** All news, update notices, and delivered reminders, newest first. */
export async function getInboxItems() {
  await importVisibleServiceWorkerNotifications()
  const state = loadState()
  const read = readSet(state)
  const items = ANNOUNCEMENTS.map((item) => ({ ...item, unread: !read.has(item.id) }))
  if (state.update) {
    const installed = compareAppVersions(APP.version, state.update.version) > 0 ||
      (compareAppVersions(APP.version, state.update.version) === 0 && compareBuilds(APP.build, state.update.build) >= 0)
    items.push({
      id: state.update.id,
      type: 'update',
      title: installed ? 'Pembaruan QuranKu terpasang' : 'Pembaruan QuranKu tersedia',
      body: installed
        ? `QuranKu versi ${state.update.version} (build ${state.update.build}) kini terpasang.`
        : `Versi ${state.update.version} tersedia. Buka Pengaturan untuk memeriksa dan memasang pembaruan.`,
      route: '/pengaturan',
      at: asTime(state.update.at),
      unread: !read.has(state.update.id)
    })
  }
  if (state.installedUpdate) {
    items.push({
      id: state.installedUpdate.id,
      type: 'update',
      title: 'Aplikasi QuranKu diperbarui',
      body: `QuranKu versi ${state.installedUpdate.version} (build ${state.installedUpdate.build}) kini terpasang.`,
      route: '/pengaturan',
      at: asTime(state.installedUpdate.at),
      unread: !read.has(state.installedUpdate.id)
    })
  }
  // Di APK, pembaruan hanya bisa dipasang lewat Play Store — bukan dari bundel web yang lebih baru.
  if (isNativePlatform()) {
    const play = await fetchPlayVersion().catch(() => null)
    if (play && compareVersions(play, APP.version) > 0) {
      const id = `play:${play}`
      items.push({
        id,
        type: 'update',
        title: 'Pembaruan di Play Store',
        body: `QuranKu versi ${play} sudah tersedia di Play Store. Ketuk untuk membuka Play Store dan memperbarui.`,
        external: APP.playStoreUrl,
        at: Date.now(),
        unread: !read.has(id)
      })
    }
  }
  for (const item of state.reminders) items.push({ ...item, unread: !read.has(item.id) })
  items.push(...(await getNativeReminders()))
  return items.sort((a, b) => asTime(b.at, 0) - asTime(a.at, 0))
}

export async function getInboxUnreadCount() {
  return (await getInboxItems()).filter((item) => item.unread).length
}

export async function markInboxItemRead(id) {
  const itemId = String(id || '')
  if (!itemId) return false
  if (itemId.startsWith('android:')) {
    try {
      await NativePrayerNotifications.markNotificationRead({ eventId: itemId.slice('android:'.length) })
    } catch {}
  } else {
    const state = loadState()
    if (!state.readIds.includes(itemId)) {
      state.readIds.push(itemId)
      state.readIds = state.readIds.slice(-MAX_READ_IDS)
      saveState(state)
    }
  }
  emit('inbox:changed')
  return true
}

export async function markAllInboxRead() {
  const items = await getInboxItems()
  const state = loadState()
  for (const item of items) {
    if (item.id.startsWith('android:')) continue
    if (!state.readIds.includes(item.id)) state.readIds.push(item.id)
  }
  state.readIds = state.readIds.slice(-MAX_READ_IDS)
  saveState(state)
  if (isAndroidApp()) {
    try { await NativePrayerNotifications.markAllNotificationsRead() } catch {}
  }
  emit('inbox:changed')
}

function onServiceWorkerMessage(event) {
  const data = event.data || {}
  if (data.type === 'quranku:inbox-notification' && data.item) {
    recordInboxReminder({ ...data.item, source: 'web' })
  } else if (data.type === 'quranku:notification-opened') {
    const item = data.item || {}
    const id = String(data.inboxId || item.id || '')
    if (id) recordInboxReminder({ ...item, id, source: 'web' })
    if (id) void markInboxItemRead(id)
    navigate(safeRoute(data.route || item.route || '/notifikasi'))
  }
}

function consumeOpenedNotification() {
  if (typeof location === 'undefined' || typeof history === 'undefined') return
  const raw = location.pathname + location.search + (location.hash.startsWith('#/') ? location.hash.slice(1) : '')
  const question = raw.indexOf('?')
  if (question < 0) return
  const route = raw.slice(0, question) || '/'
  const params = new URLSearchParams(raw.slice(question + 1))
  const encoded = params.get('inboxOpen')
  if (!encoded) return
  params.delete('inboxOpen')
  try {
    const payload = JSON.parse(encoded)
    const item = payload?.item && typeof payload.item === 'object' ? payload.item : null
    const id = String(payload?.inboxId || item?.id || '')
    if (id && item) recordInboxReminder({ ...item, id, source: 'web' })
    if (id) void markInboxItemRead(id)
  } catch {}
  const rest = params.toString()
  const cleanPath = `${route === '/' ? '/' : route}${rest ? `?${rest}` : ''}`
  history.replaceState(history.state, '', cleanPath)
}

let serviceWorkerBound = false
let visibilityBound = false
export function initInbox() {
  if (!serviceWorkerBound && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)
    serviceWorkerBound = true
  }
  if (!visibilityBound && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') emit('inbox:changed')
    })
    visibilityBound = true
  }
  recordCurrentAppBuild()
  consumeOpenedNotification()
}
