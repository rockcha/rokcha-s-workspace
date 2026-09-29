export const partsOfSpeech = ['명사', '동사', '형용사', '부사', '대명사', '전치사', '접속사', '감탄사', '관사', '숙어', '기타'] as const
export type Meaning = { part: typeof partsOfSpeech[number]; text: string }
export type Word = { id: string; word: string; meanings: Meaning[]; revision: number }

export function validWord(value: unknown): value is Word {
  if (!value || typeof value !== 'object') return false
  const item = value as Word
  return typeof item.id === 'string' && typeof item.word === 'string' && !!item.word.trim() && Number.isInteger(item.revision) && Array.isArray(item.meanings) && item.meanings.length > 0 && item.meanings.every(meaning => meaning && partsOfSpeech.includes(meaning.part) && typeof meaning.text === 'string' && !!meaning.text.trim())
}
