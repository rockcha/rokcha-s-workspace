export function safeWebUrl(value: string): string | null {
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

// Browser CORS rules apply; no third-party proxy receives saved URLs.
export async function fetchPreviewImage(value: string): Promise<string | null> {
  const url = safeWebUrl(value)
  if (!url) return null
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!response.ok) return null
    if (response.headers.get('content-type')?.startsWith('image/')) return safeWebUrl(response.url || url)
    if (!response.headers.get('content-type')?.includes('text/html')) return null
    const reader = response.body?.getReader()
    if (!reader) return null
    const decoder = new TextDecoder()
    let html = ''
    let bytes = 0
    try {
      while (bytes < 512_000) {
        const { value: chunk, done } = await reader.read()
        if (done) break
        bytes += chunk.byteLength
        html += decoder.decode(chunk, { stream: true })
        if (html.includes('</head>')) break
      }
    } finally {
      await reader.cancel()
    }
    // A template keeps remote HTML inert, including images and scripts.
    const template = document.createElement('template')
    template.innerHTML = html
    const image = template.content.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[property="twitter:image"]')?.getAttribute('content')
    return image ? safeWebUrl(new URL(image, response.url || url).href) : null
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}
