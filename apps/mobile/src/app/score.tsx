import {
  deleteBall,
  endMatch,
  findLiveMatch,
  listPlayers,
  listTeams,
  loadBalls,
  saveBall,
  startMatch,
  type LiveMatch,
  type Team,
} from '@score-masterz/data';
import type { BallEvent } from '@score-masterz/scoring';
import { colors, radii } from '@score-masterz/tokens';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'expo-crypto';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TeamBadge } from '@/components/team-badge';
import { Notice, SessionNotice } from '@/components/notice';
import { Scoreboard, type Person } from '@/components/scoreboard';
import { BottomTabInset } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { battingOrder as demoBatting, bowlingSquad as demoBowling, demoMatch, demoRules } from '@/lib/demo-match';

export default function ScoreScreen() {
  const session = useSession();
  if (session.status === 'unconfigured') return <DemoScoring />;
  if (session.status !== 'ready') {
    return (
      <SafeAreaView style={styles.page}>
        <SessionNotice session={session} />
      </SafeAreaView>
    );
  }
  return <SavedScoring client={session.client} userId={session.userId} />;
}

/** Local-only scoring with sample teams, used until Supabase is configured. */
function DemoScoring() {
  const [balls, setBalls] = useState<BallEvent[]>([]);
  return (
    <Scoreboard
      title={demoMatch.title}
      subtitle="Demo mode · not saved"
      rules={demoRules}
      balls={balls}
      battingSquad={demoBatting}
      bowlingSquad={demoBowling}
      chase={{ firstInningsRuns: demoMatch.firstInningsRuns, battingTeam: demoMatch.battingTeam, bowlingTeam: demoMatch.bowlingTeam }}
      onRecord={(ball) => setBalls((prev) => [...prev, { ...ball, id: randomUUID() }])}
      onUndo={() => setBalls((prev) => prev.slice(0, -1))}
    />
  );
}

interface Lineup {
  match: LiveMatch;
  batting: Team;
  bowling: Team;
  battingSquad: Person[];
  bowlingSquad: Person[];
}

async function loadLineup(client: SupabaseClient, match: LiveMatch, teams: Team[]): Promise<Lineup> {
  const batting = teams.find((t) => t.id === match.battingTeamId);
  const bowling = teams.find((t) => t.id === match.bowlingTeamId);
  if (!batting || !bowling) throw new Error('This match’s teams could not be found.');
  const [battingPlayers, bowlingPlayers] = await Promise.all([
    listPlayers(client, batting.id),
    listPlayers(client, bowling.id),
  ]);
  if (battingPlayers.length < 2 || bowlingPlayers.length < 1) throw new Error('Each side needs players: 2 to bat, 1 to bowl.');
  return { match, batting, bowling, battingSquad: battingPlayers, bowlingSquad: bowlingPlayers };
}

/** Scoring against Supabase: every ball is saved to the `balls` table as it is recorded. */
function SavedScoring({ client, userId }: { client: SupabaseClient; userId: string }) {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [lineup, setLineup] = useState<Lineup | null>(null);
  const [balls, setBalls] = useState<BallEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Latest balls for handlers, so the next ball's sequence number is never stale.
  const ballsRef = useRef<BallEvent[]>([]);

  function updateBalls(next: (prev: BallEvent[]) => BallEvent[]) {
    ballsRef.current = next(ballsRef.current);
    setBalls(ballsRef.current);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await listTeams(client);
      const live = await findLiveMatch(client, userId);
      if (cancelled) return;
      setTeams(list);
      if (live) {
        const [l, saved] = await Promise.all([loadLineup(client, live, list), loadBalls(client, live.inningsId)]);
        if (cancelled) return;
        setLineup(l);
        ballsRef.current = saved;
        setBalls(saved);
      }
    })()
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [client, userId]);

  async function run(task: () => Promise<void>) {
    setSaving(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.page}>
        <Notice>Loading match…</Notice>
      </SafeAreaView>
    );
  }

  if (!lineup) {
    return (
      <MatchSetup
        teams={teams ?? []}
        error={error}
        busy={saving}
        onStart={(battingTeamId, bowlingTeamId) =>
          run(async () => {
            const match = await startMatch(client, { battingTeamId, bowlingTeamId });
            setLineup(await loadLineup(client, match, teams ?? []));
            updateBalls(() => []);
          })
        }
      />
    );
  }

  const { match, batting, bowling } = lineup;

  return (
    <Scoreboard
      key={match.matchId}
      title={`${batting.name} vs ${bowling.name}`}
      subtitle={saving ? 'Saving…' : 'Saved to Supabase'}
      rules={match.rules}
      balls={balls}
      battingSquad={lineup.battingSquad}
      bowlingSquad={lineup.bowlingSquad}
      busy={saving}
      banner={
        error ? (
          <View style={styles.bannerWrap}>
            <Notice tone="error">{error}</Notice>
          </View>
        ) : null
      }
      onRecord={(input) =>
        run(async () => {
          const ball: BallEvent = { ...input, id: randomUUID() };
          const seq = ballsRef.current.length;
          updateBalls((prev) => [...prev, ball]);
          try {
            await saveBall(client, match.inningsId, seq, ball);
          } catch (e) {
            updateBalls((prev) => prev.filter((b) => b.id !== ball.id));
            throw e;
          }
        })
      }
      onUndo={() =>
        run(async () => {
          const last = ballsRef.current[ballsRef.current.length - 1];
          if (!last) return;
          updateBalls((prev) => prev.slice(0, -1));
          try {
            await deleteBall(client, last.id);
          } catch (e) {
            updateBalls((prev) => [...prev, last]);
            throw e;
          }
        })
      }
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="End match"
          disabled={saving}
          onPress={() =>
            run(async () => {
              await endMatch(client, match.matchId);
              setLineup(null);
              updateBalls(() => []);
            })
          }
          style={({ pressed }) => [styles.endButton, pressed && { opacity: 0.7 }]}>
          <Text style={styles.endText}>End match</Text>
        </Pressable>
      }
    />
  );
}

function MatchSetup({
  teams,
  error,
  busy,
  onStart,
}: {
  teams: Team[];
  error: string | null;
  busy: boolean;
  onStart: (battingTeamId: string, bowlingTeamId: string) => void;
}) {
  const [battingId, setBattingId] = useState<string | null>(null);
  const [bowlingId, setBowlingId] = useState<string | null>(null);
  const ready = battingId !== null && bowlingId !== null && battingId !== bowlingId;

  const picker = (label: string, value: string | null, set: (id: string) => void, minPlayers: number) => (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {teams.map((t) => {
        const enough = t.playerCount >= minPlayers;
        const on = value === t.id;
        return (
          <Pressable
            key={t.id}
            disabled={!enough}
            onPress={() => set(t.id)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${t.name}`}
            accessibilityState={{ selected: on, disabled: !enough }}
            style={[styles.teamRow, on && styles.teamRowOn, !enough && styles.faded]}>
            <TeamBadge code={t.shortCode} color={t.color} logoUrl={t.logoUrl} size={36} />
            <Text style={styles.teamName}>{t.name}</Text>
            <Text style={styles.muted}>{enough ? `${t.playerCount} player${t.playerCount === 1 ? '' : 's'}` : `needs ${minPlayers}+ players`}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <ScrollView contentContainerStyle={styles.setup}>
        <Text style={styles.title} accessibilityRole="header">
          START A MATCH
        </Text>
        {error && <Notice tone="error">{error}</Notice>}
        {teams.length < 2 ? (
          <>
            <Notice>You need at least two teams with players before you can score a match.</Notice>
            <Link href="/teams" style={styles.link}>
              Go to Teams →
            </Link>
          </>
        ) : (
          <>
            {picker('Batting first', battingId, setBattingId, 2)}
            {picker('Bowling first', bowlingId, setBowlingId, 1)}
            {battingId !== null && battingId === bowlingId && <Notice tone="error">Pick two different teams.</Notice>}
            <Pressable
              disabled={!ready || busy}
              accessibilityRole="button"
              onPress={() => ready && onStart(battingId, bowlingId)}
              style={[styles.start, (!ready || busy) && styles.faded]}>
              <Text style={styles.startText}>{busy ? 'Starting…' : 'Start scoring'}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ground, padding: 16 },
  setup: { gap: 16, paddingBottom: BottomTabInset + 24 },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  group: { gap: 8 },
  groupLabel: { fontWeight: '700', color: colors.ink },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  teamRowOn: { borderWidth: 2, borderColor: colors.pitch, backgroundColor: colors.pitchTint },
  faded: { opacity: 0.45 },
  badge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.surface, fontWeight: '700' },
  teamName: { flex: 1, fontWeight: '700', color: colors.ink },
  muted: { color: colors.muted, fontSize: 13 },
  start: { minHeight: 52, borderRadius: radii.md, backgroundColor: colors.pitch, alignItems: 'center', justifyContent: 'center' },
  startText: { color: colors.surface, fontWeight: '700', fontSize: 16 },
  link: { color: colors.pitch, fontWeight: '700', paddingVertical: 8 },
  bannerWrap: { marginHorizontal: 20, marginTop: 8 },
  endButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  endText: { color: colors.wicket, fontWeight: '700' },
});
