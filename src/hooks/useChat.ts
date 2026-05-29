'use client'

import { useState, useCallback, useRef } from 'react'

export interface ChatFacility {
  facility_id: string
  facility_name: string
  provider_name?: string | null
  county?: string | null
  city?: string | null
  program_type?: string | null
  program_type_label?: string | null
  total_capacity?: number | null
  infant_capacity?: number | null
  phone_number?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface ChatMeta {
  facilities: ChatFacility[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  meta?: ChatMeta
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // `content` is what the user sees in their bubble. `apiContent` (optional) is
  // what's actually sent to the model — used to attach hidden context like a
  // selected address without cluttering the visible message.
  const sendMessage = useCallback(async (content: string, apiContent?: string) => {
    const userMsg: Message = { id: generateId(), role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)

    const prevMessages = [
      ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: apiContent ?? content },
    ]

    const assistantId = generateId()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: prevMessages }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let built = ''
      let flushTimer: ReturnType<typeof setTimeout> | null = null
      const flush = () => {
        const snapshot = built
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: snapshot } : m))
        flushTimer = null
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.meta) {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, meta: parsed.meta as ChatMeta } : m))
            }
            if (parsed.text) {
              built += parsed.text
              if (flushTimer === null) flushTimer = setTimeout(flush, 40)
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e
          }
        }
      }
      if (flushTimer !== null) { clearTimeout(flushTimer); flushTimer = null }
      flush()
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        const msg = (err as Error).message || 'Something went wrong. Please try again.'
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `*${msg}*` } : m))
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [messages])

  const stopStreaming = useCallback(() => { abortRef.current?.abort() }, [])
  const clearMessages = useCallback(() => { setMessages([]) }, [])

  return { messages, isStreaming, sendMessage, stopStreaming, clearMessages }
}
