import { useEffect, useState } from 'react'
import { loadNews } from '@/features/news/api'
import type { NewsData, NewsTopic } from '@/features/news/api'

export function useNews(topic: NewsTopic, enabled = true) {
  const [data, setData] = useState<NewsData | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let active = true
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      void loadNews(topic).then(result => {
        if (active) setData(result)
      }).catch((cause: unknown) => {
        if (active) setError(cause instanceof Error && cause.name === 'Error' ? cause.message : '뉴스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
      }).finally(() => { if (active) setLoading(false) })
    }, 200)
    return () => { active = false; clearTimeout(timer) }
  }, [topic, attempt, enabled])
  return { data: data?.topic === topic ? data : null, loading, error, refresh: () => setAttempt(value => value + 1) }
}