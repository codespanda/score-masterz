import { ensureSession } from '@score-masterz/data';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { getSupabase } from '@/lib/supabase';

export type SessionState =
  | { status: 'unconfigured' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; client: SupabaseClient; userId: string };

/** Signs in (anonymously if needed) and hands back a ready Supabase client. */
export function useSession(): SessionState {
  const client = getSupabase();
  const [state, setState] = useState<SessionState>(client ? { status: 'loading' } : { status: 'unconfigured' });

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    ensureSession(client)
      .then((userId) => !cancelled && setState({ status: 'ready', client, userId }))
      .catch((e: Error) => !cancelled && setState({ status: 'error', message: e.message }));
    return () => {
      cancelled = true;
    };
  }, [client]);

  return state;
}
