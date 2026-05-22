'use client';

import { useTransition, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquarePlus, Trash2, Pencil, Check, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { UserMenu } from './user-menu';
import {
  createConversationAction,
  deleteConversationAction,
  renameConversationAction,
} from '@/lib/auth/actions';
import type { Conversation } from '@/lib/db/schema';

interface SidebarProps {
  conversations: Conversation[];
  user: { id: string; name?: string | null; email?: string | null; image?: string | null };
}

function groupByDate(convos: Conversation[]): Array<{ label: string; items: Conversation[] }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const lastWeek = new Date(today.getTime() - 7 * 86_400_000);
  const lastMonth = new Date(today.getTime() - 30 * 86_400_000);

  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    'Last 7 days': [],
    'Last 30 days': [],
    Older: [],
  };

  for (const c of convos) {
    const d = new Date(c.updatedAt);
    if (d >= today) groups['Today'].push(c);
    else if (d >= yesterday) groups['Yesterday'].push(c);
    else if (d >= lastWeek) groups['Last 7 days'].push(c);
    else if (d >= lastMonth) groups['Last 30 days'].push(c);
    else groups['Older'].push(c);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

function ConversationItem({
  convo,
  isActive,
}: {
  convo: Conversation;
  isActive: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(convo.title);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRename() {
    startTransition(async () => {
      await renameConversationAction(convo.id, editTitle);
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteConversationAction(convo.id);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="h-7 text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          autoFocus
        />
        <button onClick={handleRename} disabled={isPending} className="shrink-0">
          <Check className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
        </button>
        <button onClick={() => setIsEditing(false)} className="shrink-0">
          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
      )}
    >
      <Link href={`/chat/${convo.id}`} className="flex-1 truncate min-w-0">
        {convo.title}
      </Link>

      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => setIsEditing(true)}
          className="p-0.5 rounded hover:bg-background/50"
          aria-label="Rename"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-0.5 rounded hover:bg-background/50"
          aria-label="Delete"
        >
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ conversations, user }: SidebarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const groups = groupByDate(conversations);

  const activeId = pathname.startsWith('/chat/') ? pathname.split('/chat/')[1] : null;

  return (
    <aside className="flex flex-col w-64 shrink-0 border-r border-border bg-card/50 h-screen">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={isPending}
          onClick={() => startTransition(() => createConversationAction())}
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1 px-2 py-2">
        {groups.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label} className="mb-4">
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{label}</p>
              {items.map((c) => (
                <ConversationItem key={c.id} convo={c} isActive={c.id === activeId} />
              ))}
            </div>
          ))
        )}
      </ScrollArea>

      {/* Nav links */}
      <div className="px-2 pb-1 border-t border-border">
        <Link
          href="/documents"
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 mt-1 text-sm text-muted-foreground hover:bg-accent/50',
            pathname === '/documents' && 'bg-accent text-accent-foreground',
          )}
        >
          <FileText className="h-4 w-4 shrink-0" />
          Documents
        </Link>
      </div>

      {/* User menu */}
      <div className="p-2 border-t border-border">
        <UserMenu user={user} />
      </div>
    </aside>
  );
}
