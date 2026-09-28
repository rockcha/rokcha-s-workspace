import type { Material } from '@/features/materials/api'

// Browser downloads use the user's Google session; no token is placed in the URL.
export function materialDownload(file: Pick<Material, 'drive_id' | 'url'>) {
  const original = new URL(file.url)
  const id = encodeURIComponent(file.drive_id)
  const kind = original.hostname === 'docs.google.com' ? original.pathname.split('/')[1] : ''
  let url: URL
  let label = '다운로드'
  if (kind === 'document') {
    url = new URL(`https://docs.google.com/document/d/${id}/export?format=pdf`)
    label = 'PDF 다운로드'
  } else if (kind === 'spreadsheets') {
    url = new URL(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`)
    label = 'Excel 다운로드'
  } else if (kind === 'presentation') {
    url = new URL(`https://docs.google.com/presentation/d/${id}/export/pptx`)
    label = 'PowerPoint 다운로드'
  } else if (kind === 'drawings') {
    url = new URL(`https://docs.google.com/drawings/d/${id}/export/png`)
    label = 'PNG 다운로드'
  } else {
    url = new URL('https://drive.google.com/uc')
    url.searchParams.set('export', 'download')
    url.searchParams.set('id', file.drive_id)
  }
  const resourceKey = original.searchParams.get('resourcekey')
  if (resourceKey) url.searchParams.set('resourcekey', resourceKey)
  return { url: url.href, label }
}
