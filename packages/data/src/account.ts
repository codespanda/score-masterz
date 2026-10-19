import type { SupabaseClient, User } from "@supabase/supabase-js";

import { normaliseEmail } from "./teams";

export const MIN_PASSWORD_LENGTH = 8;

export interface Account {
  userId: string;
  /** A device-only guest (anonymous) account: its teams are lost if the browser data is cleared. */
  isGuest: boolean;
  name: string | null;
  email: string | null;
  /** Email waiting to be verified during sign-up. */
  pendingEmail: string | null;
  /** Email verified but no password chosen yet (sign-up step 3). */
  needsPassword: boolean;
}

export function toAccount(user: User): Account {
  const meta = (user.user_metadata ?? {}) as { name?: string; password_set?: boolean };
  const email = user.email ?? null;
  return {
    userId: user.id,
    isGuest: Boolean(user.is_anonymous) && !email,
    name: meta.name ?? null,
    email,
    pendingEmail: user.new_email ?? null,
    needsPassword: Boolean(email) && !meta.password_set,
  };
}

export async function getAccount(client: SupabaseClient): Promise<Account | null> {
  const { data } = await client.auth.getUser();
  return data.user ? toAccount(data.user) : null;
}

/** Readable messages for the auth errors people actually hit. */
function authError(message: string): Error {
  if (/already been registered|already registered|email_exists|already exists/i.test(message)) {
    return new Error("That email already has an account. Log in instead.");
  }
  if (/manual linking/i.test(message)) {
    return new Error('Sign-up needs "Allow manual linking" turned on in Supabase (Authentication → Sign In / Providers).');
  }
  if (/invalid login credentials/i.test(message)) return new Error("Email or password is wrong.");
  if (/email not confirmed/i.test(message)) return new Error("Confirm your email first — check your inbox for the link.");
  if (/token has expired|otp.*(expired|invalid)|invalid.*otp/i.test(message)) {
    return new Error("That code is wrong or has expired. Request a new one.");
  }
  if (/rate limit|too many/i.test(message)) return new Error("Too many attempts. Wait a minute and try again.");
  return new Error(message);
}

/**
 * Sign-up step 1: attach an email to the current guest account. Supabase emails a
 * verification link (and a 6-digit code if the email template includes {{ .Token }}).
 * The account keeps its id, so teams and matches created as a guest stay with it.
 */
export async function startSignup(
  client: SupabaseClient,
  input: { name: string; email: string },
  emailRedirectTo: string,
): Promise<string> {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Enter your name.");
  const email = normaliseEmail(input.email);
  if (!email) throw new Error("Enter your email.");
  const { error } = await client.auth.updateUser({ email, data: { name } }, { emailRedirectTo });
  if (error) throw authError(error.message);
  return email;
}

/** Sign-up step 2 (code path): confirm the email with the 6-digit code. */
export async function verifySignupCode(client: SupabaseClient, email: string, code: string): Promise<void> {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) throw new Error("Enter the 6-digit code from the email.");
  const { error } = await client.auth.verifyOtp({ email, token, type: "email_change" });
  if (error) throw authError(error.message);
}

export function checkPassword(password: string, confirm: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (password !== confirm) throw new Error("Passwords don't match.");
}

/** Sign-up step 3: choose a password once the email is verified. */
export async function setPassword(client: SupabaseClient, password: string, confirm: string): Promise<void> {
  checkPassword(password, confirm);
  const { error } = await client.auth.updateUser({ password, data: { password_set: true } });
  if (error) throw authError(error.message);
}

export async function logIn(client: SupabaseClient, email: string, password: string): Promise<Account> {
  const normalised = normaliseEmail(email);
  if (!normalised) throw new Error("Enter your email.");
  if (!password) throw new Error("Enter your password.");
  const { data, error } = await client.auth.signInWithPassword({ email: normalised, password });
  if (error) throw authError(error.message);
  return toAccount(data.user);
}

/** Signs out; the next screen that needs a session starts a fresh guest account. */
export async function logOut(client: SupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw authError(error.message);
}

export async function sendPasswordReset(client: SupabaseClient, email: string, redirectTo: string): Promise<void> {
  const normalised = normaliseEmail(email);
  if (!normalised) throw new Error("Enter your email.");
  const { error } = await client.auth.resetPasswordForEmail(normalised, { redirectTo });
  if (error) throw authError(error.message);
}

/** Calls back with the account whenever the session changes (log in, log out, verification). */
export function onAccountChange(client: SupabaseClient, callback: (account: Account | null) => void): () => void {
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? toAccount(session.user) : null);
  });
  return () => data.subscription.unsubscribe();
}
