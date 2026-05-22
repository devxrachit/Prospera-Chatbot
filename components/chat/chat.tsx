'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import type { Message as AIMessage } from 'ai';
import { AlertCircle, X } from 'lucide-react';
import { Message, ThinkingIndicator } from './message';
import { ChatInput } from './chat-input';

interface ChatProps {
  conversationId: string;
  initialMessages: AIMessage[];
  conversationTitle: string;
}

export function Chat({ conversationId, initialMessages, conversationTitle }: ChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, status } = useChat({
    api: '/api/chat',
    initialMessages,
    body: { conversationId },
    onError: (error) => {
      console.error('Chat error:', error);
      const msg = error.message ?? '';
      if (msg.includes('429') || msg.toLowerCase().includes('too many')) {
        setErrorMsg('You\'re sending messages too quickly. Please wait a moment and try again.');
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, status]);

  const isStreaming = status === 'streaming';
  const showThinking = isLoading && !isStreaming && messages[messages.length - 1]?.role === 'user';

  return (
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div className="flex items-center h-12 border-b border-border px-4 shrink-0">
        <h1 className="text-sm font-medium text-foreground truncate">{conversationTitle}</h1>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="mb-4 text-4xl font-bold tracking-tight text-foreground">Prospera</div>
            <p className="text-muted-foreground max-w-sm">
              Ask me anything — I can search the web, run code, query your documents, and more.
            </p>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            {showThinking && <ThinkingIndicator />}
          </>
        )}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div
          role="alert"
          className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="flex-1">{errorMsg}</span>
          <button
            aria-label="Dismiss error"
            onClick={() => setErrorMsg(null)}
            className="shrink-0 hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onStop={stop}
      />
    </div>
  );
}
