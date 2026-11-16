export function formatCoordinate(value) {
  const number = Number(value)
  return Number.isFinite(number) ? `${number.toFixed(4)}°` : '—'
}

export function formatCoordinates(loc) {
  return `Lintang ${formatCoordinate(loc && loc.lat)} · Bujur ${formatCoordinate(loc && loc.lng)}`
}
