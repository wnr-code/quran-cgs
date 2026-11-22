// Minimal Capacitor-only behavior; page rendering and business logic stay in the shared web app.
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { on } from '../utils/helpers.js'
import { navigate, currentRoute } from '../router.js'

let initialized = false

async function syncStatusBar() {
  const theme = document.documentElement.dataset.theme
  const style = theme === 'dark' || theme === 'ramadan' ? Style.Dark : Style.Light
  await StatusBar.setStyle({ style }).catch(() => {})
}

function handleBackButton() {
  if (document.body.classList.contains('sheet-open')) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    return
  }
  if (document.body.classList.contains('reading-mode')) {
    const immersiveButton = document.querySelector('[data-act="immersive"]')
    if (immersiveButton) {
      immersiveButton.click()
      return
    }
  }

  if (currentRoute().path !== '/') {
    const navigationCount = Number(sessionStorage.getItem('qk-nav')) || 0
    if (navigationCount > 1 && history.length > 1) history.back()
    else navigate('/')
    return
  }
  void App.exitApp()
}

/** Initialize Android status-bar styling and hardware-back behavior once. */
export function initializeNativeShell() {
  if (!Capacitor.isNativePlatform() || initialized) return false
  initialized = true
  void syncStatusBar()
  on('settings:changed', () => void syncStatusBar())
  void App.addListener('backButton', handleBackButton).catch(() => {})
  return true
}

/** Reveal the already-rendered web splash when the Capacitor native launch screen is ready to go. */
export async function hideNativeSplash() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await SplashScreen.hide({ fadeOutDuration: 220 })
  } catch {
    // The Android launch splash may already have been hidden by the operating system.
  }
}
