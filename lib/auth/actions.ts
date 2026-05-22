'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth, signIn } from '@/auth';
import { db } from '@/lib/db/client';
import { users, conversations } from '@/lib/db/schema';

type ActionState = { error: string } | null;

// ─── Auth actions ─────────────────────────────────────────────────────────────

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === 'CredentialsSignin') return { error: 'Invalid email or password.' };
      return { error: 'Authentication failed. Please try again.' };
    }
    throw error; // Re-throw NEXT_REDIRECT — Next.js handles the navigation
  }
  return null;
}

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, password } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(users).values({ name, email, passwordHash });
  } catch (error: unknown) {
    const pg = error as { code?: string };
    if (pg.code === '23505') return { error: 'An account with this email already exists.' };
    return { error: 'Failed to create account. Please try again.' };
  }

  // Sign in immediately after account creation
  try {
    await signIn('credentials', { email, password, redirectTo: '/' });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Account created but sign-in failed. Please sign in manually.' };
    }
    throw error; // Re-throw NEXT_REDIRECT
  }
  return null;
}

// ─── Conversation actions ─────────────────────────────────────────────────────

export async function createConversationAction(): Promise<never> {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const [convo] = await db
    .insert(conversations)
    .values({ userId: session.user.id })
    .returning({ id: conversations.id });

  redirect(`/chat/${convo.id}`);
}

export async function renameConversationAction(
  id: string,
  title: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const trimmed = title.trim().slice(0, 100);
  if (!trimmed) return { error: 'Title cannot be empty' };

  await db
    .update(conversations)
    .set({ title: trimmed, updatedAt: new Date() })
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, session.user.id)),
    );

  return null;
}

export async function deleteConversationAction(id: string): Promise<never> {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  await db
    .delete(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, session.user.id)),
    );

  redirect('/');
}
