import { post } from './http';
import type { ContactInput } from './types';

export const CONTACT_LIMITS = { name: [2, 60], subject: [0, 100], body: [10, 2000] } as const;

export const sendMessage = (input: ContactInput) => post<{ ok: true }>('/contact', input);

/** Mirrors the server's zod schema so errors can be shown before submitting. */
export function validateContact(input: ContactInput): Partial<Record<keyof ContactInput, string>> {
  const errors: Partial<Record<keyof ContactInput, string>> = {};
  const name = input.name.trim();
  const body = input.body.trim();
  if (name.length < 2) errors.name = 'Please enter your name (at least 2 characters).';
  else if (name.length > 60) errors.name = 'Name must be at most 60 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email.trim())) errors.email = 'Please enter a valid email address.';
  if (input.subject.trim().length > 100) errors.subject = 'Subject must be at most 100 characters.';
  if (body.length < 10) errors.body = 'Message must be at least 10 characters.';
  else if (body.length > 2000) errors.body = 'Message must be at most 2000 characters.';
  return errors;
}
