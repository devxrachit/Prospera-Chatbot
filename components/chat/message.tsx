'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { Message as AIMessage } from 'ai';
import { ToolInvocationCard, type ToolInvocation } from './tool-invocation';

interface MessageProps {
  message: AIMessage;
}

function CodeBlock({
  inline,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
  if (inline) {
    return (
      <code
        className="rounded bg-muted px-1 py-0.5 font-mono text-sm text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  }
  return (
    <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 my-3 text-sm">
      <code className={cn('font-mono text-zinc-100', className)} {...props}>
        {children}
      </code>
    </pre>
  );
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const toolInvocations = message.toolInvocations as ToolInvocation[] | undefined;
  const hasTools = toolInvocations && toolInvocations.length > 0;
  const text = message.content as string;
  const hasText = text.trim().length > 0;

  return (
    <div className={cn('flex gap-3 py-4 px-4 sm:px-6', isUser && 'flex-row-reverse')}>
      {/* Avatar dot */}
      <div
        className={cn(
          'mt-1 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {isUser ? 'U' : 'P'}
      </div>

      {/* Content */}
      {isUser ? (
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 bg-primary text-primary-foreground">
          <p className="text-sm whitespace-pre-wrap">{text}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 min-w-0 max-w-[85%] sm:max-w-[75%]">
          {hasTools && (
            <div className="space-y-1.5">
              {toolInvocations.map((inv) => (
                <ToolInvocationCard key={inv.toolCallId} invocation={inv} />
              ))}
            </div>
          )}
          {hasText && (
            <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm dark:prose-invert max-w-none
                  prose-p:leading-relaxed prose-p:my-1
                  prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                  prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
                  prose-pre:p-0 prose-pre:bg-transparent prose-pre:my-0"
                components={{
                  code: CodeBlock as React.ComponentType<React.ClassAttributes<HTMLElement> & React.HTMLAttributes<HTMLElement>>,
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ThinkingIndicator() {
  return (
    <div className="flex gap-3 py-4 px-4 sm:px-6">
      <div className="mt-1 h-7 w-7 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
        P
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
      </div>
    </div>
  );
}
