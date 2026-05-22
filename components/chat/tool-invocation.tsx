'use client';

import { useState } from 'react';
import { Search, Code2, Cloud, BookOpen, ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolInvocation {
  state: 'partial-call' | 'call' | 'result';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}

const TOOL_META: Record<string, { label: string; Icon: React.FC<{ className?: string }> }> = {
  webSearch:   { label: 'Web Search',       Icon: Search   },
  executeCode: { label: 'Code Execution',   Icon: Code2    },
  getWeather:  { label: 'Weather',          Icon: Cloud    },
  ragSearch:   { label: 'Document Search',  Icon: BookOpen },
};

function getArgSummary(toolName: string, args: Record<string, unknown>): string {
  if (toolName === 'webSearch')   return `"${args.query}"`;
  if (toolName === 'ragSearch')   return `"${args.query}"`;
  if (toolName === 'executeCode') {
    const code = String(args.code ?? '');
    return code.split('\n')[0].slice(0, 60) + (code.length > 60 ? '…' : '');
  }
  if (toolName === 'getWeather')  return String(args.location ?? '');
  return JSON.stringify(args).slice(0, 80);
}

function ResultPreview({ toolName, result }: { toolName: string; result: unknown }) {
  const r = result as Record<string, unknown>;

  if (toolName === 'webSearch') {
    const results = (r.results as Array<{ title: string; url: string; snippet: string }>) ?? [];
    if (r.error) {
      return <p className="text-xs text-destructive">{String(r.error)}</p>;
    }
    return (
      <div className="space-y-2">
        {!!r.answer && (
          <p className="text-xs text-muted-foreground italic">{String(r.answer).slice(0, 200)}</p>
        )}
        {results.slice(0, 3).map((res, i) => (
          <div key={i} className="text-xs">
            <a
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              {res.title}
            </a>
            <p className="text-muted-foreground line-clamp-2">{res.snippet}</p>
          </div>
        ))}
        {results.length > 3 && (
          <p className="text-xs text-muted-foreground">+{results.length - 3} more results</p>
        )}
      </div>
    );
  }

  if (toolName === 'executeCode') {
    const output = (r.output as string[]) ?? [];
    return (
      <div className="space-y-1">
        {!!r.error && (
          <p className="text-xs font-mono text-destructive">{String(r.error)}</p>
        )}
        {r.result !== undefined && (
          <p className="text-xs font-mono">
            <span className="text-muted-foreground">→ </span>
            {String(r.result)}
          </p>
        )}
        {output.length > 0 && (
          <pre className="text-xs font-mono bg-background/50 p-1.5 rounded overflow-x-auto">
            {output.join('\n')}
          </pre>
        )}
      </div>
    );
  }

  if (toolName === 'getWeather') {
    if (r.error) return <p className="text-xs text-destructive">{String(r.error)}</p>;
    const c = r.current as Record<string, string> | undefined;
    if (!c) return null;
    return (
      <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-muted-foreground">Condition</span>
        <span>{c.condition}</span>
        <span className="text-muted-foreground">Temperature</span>
        <span>{c.temperature} (feels {c.feelsLike})</span>
        <span className="text-muted-foreground">Humidity</span>
        <span>{c.humidity}</span>
        <span className="text-muted-foreground">Wind</span>
        <span>{c.windSpeed} {c.windDirection}</span>
      </div>
    );
  }

  if (toolName === 'ragSearch') {
    if (r.error) return <p className="text-xs text-destructive">{String(r.error)}</p>;
    const chunks = (r.chunks as Array<{ content: string; documentName: string; similarity: number }>) ?? [];
    if (chunks.length === 0)
      return <p className="text-xs text-muted-foreground">No matching content found.</p>;
    return (
      <div className="space-y-2">
        {chunks.map((chunk, i) => (
          <div key={i} className="text-xs">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-medium text-foreground">{chunk.documentName}</span>
              <span className="text-muted-foreground">{Math.round(chunk.similarity * 100)}% match</span>
            </div>
            <p className="text-muted-foreground line-clamp-3">{chunk.content}</p>
          </div>
        ))}
      </div>
    );
  }

  // Generic fallback
  return (
    <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
      {JSON.stringify(result, null, 2).slice(0, 400)}
    </pre>
  );
}

export function ToolInvocationCard({ invocation }: { invocation: ToolInvocation }) {
  const [expanded, setExpanded] = useState(false);
  const { state, toolName, args, result } = invocation;

  const meta = TOOL_META[toolName] ?? { label: toolName, Icon: Code2 };
  const { label, Icon } = meta;
  const isDone = state === 'result';
  const isError =
    isDone && result !== null && typeof result === 'object' && 'error' in (result as object);

  return (
    <div
      className={cn(
        'rounded-lg border text-sm overflow-hidden',
        isDone
          ? isError
            ? 'border-destructive/40 bg-destructive/5'
            : 'border-border bg-muted/30'
          : 'border-border bg-muted/20',
      )}
    >
      {/* Header row */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2',
          isDone && 'cursor-pointer hover:bg-muted/40',
        )}
        onClick={isDone ? () => setExpanded((v) => !v) : undefined}
        role={isDone ? 'button' : undefined}
        tabIndex={isDone ? 0 : undefined}
        onKeyDown={isDone ? (e) => e.key === 'Enter' && setExpanded((v) => !v) : undefined}
      >
        {/* Status icon */}
        {!isDone ? (
          <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
        ) : isError ? (
          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
        )}

        {/* Tool icon + name */}
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground text-xs">{label}</span>

        {/* Args summary */}
        <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
          {getArgSummary(toolName, args)}
        </span>

        {/* Expand chevron */}
        {isDone && (
          <span className="shrink-0 text-muted-foreground">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        )}
      </div>

      {/* Expandable result */}
      {isDone && expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50">
          <ResultPreview toolName={toolName} result={result} />
        </div>
      )}
    </div>
  );
}
