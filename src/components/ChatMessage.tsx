'use client'

import { ChatMarkdown } from '@/components/ChatMarkdown'
import { ChatResponseFooter } from '@/components/ChatResponseFooter'
import { ChatFacilityCards } from '@/components/ChatFacilityCards'
import { ChatStartApplicationCard } from '@/components/ChatStartApplicationCard'
import type { Message } from '@/hooks/useChat'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }

export function ChatMessage({ message, isStreaming, onFollowUp }: { message: Message; isStreaming?: boolean; onFollowUp?: (q: string) => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-[15.5px] leading-[1.55]"
          style={{ background: 'var(--paper-accent)', color: '#fff' }}>
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0">
        {message.content
          ? <div className="chat-stream"><ChatMarkdown text={message.content} /></div>
          : <p className="text-[15px] italic text-[var(--paper-faint)]" style={SERIF}>Thinking…</p>}
        {message.meta?.facilities?.length ? (
          <ChatFacilityCards facilities={message.meta.facilities} />
        ) : null}
        {message.meta?.eligDraft ? (
          <ChatStartApplicationCard draft={message.meta.eligDraft} />
        ) : null}
        {isStreaming && message.content && (
          <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse" style={{ background: 'var(--paper-accent)' }} />
        )}
        {!isStreaming && message.content && (
          <ChatResponseFooter content={message.content} onFollowUp={onFollowUp} />
        )}
    </div>
  )
}
