"use client";

import { loadBallsForInnings, subscribeToBalls } from "@score-masterz/data";
import type { BallEvent } from "@score-masterz/scoring";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export type Connection = "connecting" | "live" | "offline";

/**
 * Balls for the given innings, kept up to date over Supabase Realtime.
 * Every change triggers a refetch: the list is small and this keeps undo and
 * out-of-order inserts correct without merging events by hand.
 */
export function useLiveBalls(client: SupabaseClient | null, inningsIds: string[]) {
  const [balls, setBalls] = useState<Record<string, BallEvent[]> | null>(null);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [error, setError] = useState<string | null>(null);
  const key = inningsIds.join(",");

  useEffect(() => {
    if (!client || !key) return;
    const ids = key.split(",");
    let cancelled = false;
    let running = false;
    let again = false;

    const refresh = async () => {
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        do {
          again = false;
          const next = await loadBallsForInnings(client, ids);
          if (!cancelled) setBalls(next);
        } while (again && !cancelled);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        running = false;
      }
    };

    void refresh();
    const channel = subscribeToBalls(client, ids, () => void refresh(), (status) => {
      if (cancelled) return;
      if (status === "SUBSCRIBED") {
        setConnection("live");
        void refresh(); // catch anything missed while connecting
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setConnection("offline");
      }
    });

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [client, key]);

  return { balls, connection, error };
}
