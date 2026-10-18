import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Make sure there is a signed-in user, falling back to an anonymous one.
 * Row-level security uses the user id as the owner of teams and matches.
 * Requires "Allow anonymous sign-ins" in the Supabase project's auth settings.
 */
export function ensureSession(client: SupabaseClient): Promise<string> {
  // Share one sign-in per client: concurrent callers (or React running an effect twice)
  // would otherwise each create a separate anonymous user.
  let pending = inFlight.get(client);
  if (!pending) {
    pending = signIn(client).finally(() => inFlight.delete(client));
    inFlight.set(client, pending);
  }
  return pending;
}

const inFlight = new WeakMap<SupabaseClient, Promise<string>>();

async function signIn(client: SupabaseClient): Promise<string> {
  const { data } = await client.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signedIn, error } = await client.auth.signInAnonymously();
  if (error || !signedIn.user) {
    throw new Error(
      `Could not sign in: ${error?.message ?? "no user returned"}. Is "Allow anonymous sign-ins" turned on in Supabase?`,
    );
  }
  return signedIn.user.id;
}

/** Throws a readable error for a failed Supabase call. */
export function check<T>(result: { data: T; error: { message: string } | null }, action: string): T {
  if (result.error) throw new Error(`${action}: ${result.error.message}`);
  return result.data;
}
