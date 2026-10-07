import { duration, durationLabel, groupRecords, monthRecords } from '@/features/lesson-history/model'
import type { LessonRecord } from '@/features/lesson-history/model'

// JPEG pages preserve the bundled Korean font without external font requests.
export async function downloadLessonPdf(records: LessonRecord[], month: string) {
  const items = monthRecords(records, month)
  if (!items.length) throw new Error('선택한 달에 수업 내역이 없어요.')
  // Fontsource splits Korean glyphs into subsets; explicitly load all report glyphs.
  const glyphs = [...new Set(`록차의 작업실 년 월 수업 내역 총 회 시간 분 날짜·시간순 수업별 ${items.map(item => item.name).join(' ')} ${month} 0123456789–():`)].join('')
  await document.fonts.load('24px "Gowun Dodum"', glyphs)
  await document.fonts.ready
  const width = 1240, height = 1754, margin = 85
  const pages: Uint8Array[] = []
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('PDF를 만들지 못했어요.')
  let y = margin
  function newPage() {
    context!.fillStyle = '#ffffff'; context!.fillRect(0, 0, width, height)
    context!.fillStyle = '#25372b'; context!.font = '24px "Gowun Dodum"'
    y = margin
  }
  function finishPage() {
    context!.font = '20px "Gowun Dodum"'; context!.fillStyle = '#627064'
    context!.fillText(`록차의 작업실 · ${month} · ${pages.length + 1}`, margin, height - 50)
    const binary = atob(canvas.toDataURL('image/jpeg', 0.95).split(',')[1])
    pages.push(Uint8Array.from(binary, char => char.charCodeAt(0)))
  }
  function line(text: string, heading = false) {
    const size = heading ? 30 : 24
    context!.font = `${size}px "Gowun Dodum"`
    // Wrap every line, including long Korean class names, before page breaks.
    let current = ''
    const lines: string[] = []
    for (const char of text) {
      if (char === '\n' || context!.measureText(current + char).width > width - margin * 2) {
        lines.push(current); current = char === '\n' ? '' : char
      } else current += char
    }
    lines.push(current)
    for (const part of lines) {
      if (y + 42 > height - 100) { finishPage(); newPage() }
      context!.font = `${size}px "Gowun Dodum"`; context!.fillStyle = '#25372b'
      context!.fillText(part, margin, y); y += heading ? 54 : 42
    }
  }
  newPage()
  line(`${month.replace('-', '년 ')}월 수업 내역`, true)
  line(`총 ${items.length}회 · ${durationLabel(items.reduce((sum, item) => sum + duration(item), 0))}`)
  line('')
  line('날짜·시간순 내역', true)
  for (const item of items) line(`${item.date}  ${item.start}–${item.end}  ${item.name}  (${durationLabel(duration(item))})`)
  line(''); line('수업별 내역', true)
  for (const [name, group] of groupRecords(items)) {
    line(`${name} · ${group.length}회 · 총 ${durationLabel(group.reduce((sum, item) => sum + duration(item), 0))}`, true)
    for (const item of group) line(`${item.date}  ${item.start}–${item.end}  (${durationLabel(duration(item))})`)
    line('')
  }
  finishPage()
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets = [0]
  let length = 0
  const append = (data: string | Uint8Array) => { const bytes = typeof data === 'string' ? encoder.encode(data) : data; chunks.push(bytes); length += bytes.length }
  const object = (id: number, body: string) => { offsets[id] = length; append(`${id} 0 obj\n${body}\nendobj\n`) }
  append('%PDF-1.4\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`)
  pages.forEach((jpeg, index) => {
    const id = 3 + index * 3
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Image ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`)
    const commands = 'q 595.28 0 0 841.89 0 0 cm /Image Do Q\n'
    object(id + 1, `<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`)
    offsets[id + 2] = length
    append(`${id + 2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`)
    append(jpeg); append('\nendstream\nendobj\n')
  })
  const xref = length
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`)
  for (const offset of offsets.slice(1)) append(`${String(offset).padStart(10, '0')} 00000 n \n`)
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  const bytes = new Uint8Array(length)
  let position = 0
  for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length }
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url; link.download = `수업내역_${month}.pdf`; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
