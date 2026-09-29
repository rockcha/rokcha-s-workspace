import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { partsOfSpeech } from '@/features/vocabulary/model'
import type { Meaning, Word } from '@/features/vocabulary/model'
import type { useVocabulary } from '@/features/vocabulary/use-vocabulary'

export function WordEditor({ item, state, close, restoreFocus }: { item?: Word; state: ReturnType<typeof useVocabulary>; close: () => void; restoreFocus: () => void }) {
  const [word, setWord] = useState(item?.word ?? '')
  const [meanings, setMeanings] = useState<(Meaning & { key: string })[]>(() => (item?.meanings ?? [{ part: '명사', text: '' }]).map(meaning => ({ ...meaning, key: crypto.randomUUID() })))
  const [error, setError] = useState('')
  return <Dialog open onOpenChange={open => { if (!open && !state.busy) close() }}><DialogContent className="max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
    <DialogTitle>단어 {item ? '수정' : '추가'}</DialogTitle><DialogDescription>품사를 고르고 뜻을 하나씩 추가해 주세요.</DialogDescription>
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault()
      const message = await state.mutate('save', { id: item?.id, revision: item?.revision, word: word.trim(), meanings: meanings.map(meaning => ({ part: meaning.part, text: meaning.text.trim() })) })
      if (message) setError(message)
      else { toast.success(`단어를 ${item ? '수정' : '추가'}했어요.`, { id: 'vocabulary-mutation' }); close() }
    }}><fieldset disabled={state.busy} className="space-y-4">
      <label className="grid gap-2 text-sm">영단어<Input autoFocus required maxLength={120} value={word} onChange={event => setWord(event.target.value)} /></label>
      {meanings.map((meaning, index) => <div key={meaning.key} className="space-y-2 rounded-xl border p-3">
        <div className="flex items-center justify-between gap-2"><Select disabled={state.busy} value={meaning.part} onValueChange={part => setMeanings(meanings.map(value => value.key === meaning.key ? { ...value, part: part as Meaning['part'] } : value))}><SelectTrigger aria-label={`품사 ${index + 1}`}><SelectValue /></SelectTrigger><SelectContent>{partsOfSpeech.map(part => <SelectItem key={part} value={part}>{part}</SelectItem>)}</SelectContent></Select><Button type="button" variant="destructive-ghost" size="icon" aria-label={`뜻 ${index + 1} 삭제`} disabled={meanings.length === 1} onClick={() => setMeanings(meanings.filter(value => value.key !== meaning.key))}><X aria-hidden="true" /></Button></div>
        <label className="grid gap-2 text-sm">뜻 {index + 1}<Textarea aria-label={`뜻 ${index + 1}`} required maxLength={1000} value={meaning.text} onChange={event => setMeanings(meanings.map(value => value.key === meaning.key ? { ...value, text: event.target.value } : value))} /></label>
      </div>)}
      <Button type="button" variant="outline" disabled={meanings.length >= 50} onClick={() => setMeanings([...meanings, { key: crypto.randomUUID(), part: '명사', text: '' }])}><Plus aria-hidden="true" />뜻 추가</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>취소</Button><Button type="submit" disabled={!word.trim() || meanings.some(meaning => !meaning.text.trim())}>{state.busy ? '저장 중…' : '저장'}</Button></div>
    </fieldset></form>
  </DialogContent></Dialog>
}
