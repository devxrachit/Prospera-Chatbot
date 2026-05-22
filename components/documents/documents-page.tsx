'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, Trash2, Loader2, CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Document } from '@/lib/db/schema';

interface DocumentsPageProps {
  initialDocuments: Document[];
}

export function DocumentsPage({ initialDocuments }: DocumentsPageProps) {
  const [docs, setDocs] = useState<Document[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    const res = await fetch('/api/documents');
    if (res.ok) setDocs(await res.json());
  }, []);

  // Poll while any document is still being processed
  useEffect(() => {
    const hasPending = docs.some((d) => d.status === 'pending' || d.status === 'processing');
    if (!hasPending) return;
    const id = setInterval(fetchDocs, 3000);
    return () => clearInterval(id);
  }, [docs, fetchDocs]);

  const uploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      setUploadError(null);
      try {
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/documents', { method: 'POST', body: fd });
          if (!res.ok) {
            setUploadError(await res.text());
            break;
          }
        }
        await fetchDocs();
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [fetchDocs],
  );

  const deleteDoc = useCallback(async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-1">Documents</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Upload PDFs or text files — Prospera will search them when answering your questions.
        </p>

        {/* Upload error */}
        {uploadError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="flex-1">{uploadError}</span>
            <button aria-label="Dismiss" onClick={() => setUploadError(null)} className="shrink-0 hover:opacity-70">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors mb-6 cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            Drag & drop files here, or click to browse
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          >
            {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
            {uploading ? 'Uploading…' : 'Choose files'}
          </Button>
          <p className="text-xs text-muted-foreground mt-3">PDF · TXT · Markdown · Max 10 MB</p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            onChange={(e) => uploadFiles(e.target.files)}
          />
        </div>

        {/* Document list */}
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No documents yet. Upload one above to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <DocRow key={doc.id} doc={doc} onDelete={deleteDoc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Document['status'] }) {
  if (status === 'ready')
    return (
      <span className="flex items-center gap-1 text-xs text-green-500">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Ready
      </span>
    );
  if (status === 'processing')
    return (
      <span className="flex items-center gap-1 text-xs text-amber-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Processing
      </span>
    );
  if (status === 'failed')
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        Failed
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      Pending
    </span>
  );
}

function DocRow({
  doc,
  onDelete,
}: {
  doc: Document;
  onDelete: (id: string) => void;
}) {
  const kb = (doc.size / 1024).toFixed(0);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.name}</p>
        <p className="text-xs text-muted-foreground">{kb} KB</p>
      </div>
      <StatusBadge status={doc.status} />
      {doc.status === 'failed' && doc.errorMessage && (
        <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={doc.errorMessage}>
          {doc.errorMessage}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        disabled={doc.status === 'processing'}
        onClick={() => onDelete(doc.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
