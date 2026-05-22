'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[chat]', error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-10 w-10 text-destructive mb-4" />
      <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
