import { getAccount, onAccountChange, type Account } from '@score-masterz/data';
import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/hooks/use-session';

/** The current account (a guest until someone signs up or logs in), kept current. */
export function useAccount() {
  const session = useSession();
  const client = session.status === 'ready' ? session.client : null;
  const [account, setAccount] = useState<Account | null | undefined>(undefined);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    getAccount(client).then((a) => !cancelled && setAccount(a));
    const stop = onAccountChange(client, (a) => !cancelled && setAccount(a));
    return () => {
      cancelled = true;
      stop();
    };
  }, [client]);

  const refresh = useCallback(async () => {
    if (client) setAccount(await getAccount(client));
  }, [client]);

  return { session, client, account, refresh };
}
