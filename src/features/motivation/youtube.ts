export function youtubeId(value: string): string | null {
  try {
    const url = new URL(value.trim())
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    const parts = url.pathname.split('/').filter(Boolean)
    let id: string | null = null
    if (host === 'youtu.be' && parts.length === 1) id = parts[0]
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v')
      else if (['shorts', 'embed', 'live'].includes(parts[0]) && parts.length === 2) id = parts[1]
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  } catch { return null }
}
