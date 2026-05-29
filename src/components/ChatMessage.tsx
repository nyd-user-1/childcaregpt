'use client'

import { ChatMarkdown } from '@/components/ChatMarkdown'
import { ChatResponseFooter } from '@/components/ChatResponseFooter'
import { ChatFacilityCards } from '@/components/ChatFacilityCards'
import { AppLogo } from '@/components/AppLogo'
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
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)' }}>
        <AppLogo className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        {message.content
          ? <ChatMarkdown text={message.content} />
          : <p className="text-[15px] italic text-[var(--paper-faint)]" style={SERIF}>Thinking…</p>}
        {message.meta?.facilities?.length ? (
          <ChatFacilityCards facilities={message.meta.facilities} />
        ) : null}
        {isStreaming && message.content && (
          <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse" style={{ background: 'var(--paper-accent)' }} />
        )}
        {!isStreaming && message.content && (
          <ChatResponseFooter content={message.content} onFollowUp={onFollowUp} />
        )}
      </div>
    </div>
  )
}
