'use client';

import { useRef, useCallback } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
}

export function ChatInput({ input, isLoading, onInputChange, onSubmit, onStop }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
        e.preventDefault();
        if (input.trim()) {
          onSubmit(e as unknown as React.FormEvent);
        }
      }
    },
    [input, isLoading, onSubmit],
  );

  // Auto-resize the textarea
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onInputChange(e);
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
      }
    },
    [onInputChange],
  );

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 py-3">
      <form onSubmit={onSubmit} className="relative flex items-end gap-2 max-w-3xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message Prospera… (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={isLoading}
            className={cn(
              'w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:opacity-50',
              'max-h-[200px] overflow-y-auto',
            )}
          />
        </div>

        {isLoading ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onStop}
            className="shrink-0 h-10 w-10 rounded-xl"
            aria-label="Stop generation"
          >
            <Square className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim()}
            className="shrink-0 h-10 w-10 rounded-xl"
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </form>

      <p className="text-center text-xs text-muted-foreground mt-2">
        Prospera can make mistakes. Verify important information.
      </p>
    </div>
  );
}
