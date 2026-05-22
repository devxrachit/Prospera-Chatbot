import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background">
      <p className="text-6xl font-bold tracking-tight mb-2">404</p>
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-sm text-muted-foreground mb-8">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
