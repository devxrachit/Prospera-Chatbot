'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUpAction } from '@/lib/auth/actions';

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">Start chatting with Prospera for free</p>
      </div>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Your name"
            required
            minLength={2}
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">At least 8 characters</p>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/sign-in" className="underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
}
