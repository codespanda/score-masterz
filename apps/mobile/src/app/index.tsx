import { listLiveMatches, loadBallsForInnings, type MatchSummary } from '@score-masterz/data';
import { summariseInnings, type BallEvent } from '@score-masterz/scoring';
import { colors, radii } from '@score-masterz/tokens';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TeamBadge } from '@/components/team-badge';
import { Notice } from '@/components/notice';
import { BottomTabInset } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

interface LiveCard {
  match: MatchSummary;
  balls: Record<string, BallEvent[]>;
}

export default function HomeScreen() {
  const session = useSession();
  const [cards, setCards] = useState<LiveCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = session.status === 'ready' ? session.client : null;
  const userId = session.status === 'ready' ? session.userId : null;

  // Reload whenever the tab comes into focus, e.g. after scoring on the Score tab.
  useFocusEffect(
    useCallback(() => {
      if (!client) return;
      let cancelled = false;
      (async () => {
        const matches = await listLiveMatches(client);
        const balls = await loadBallsForInnings(
          client,
          matches.flatMap((m) => m.innings.map((i) => i.id)),
        );
        if (!cancelled) {
          setCards(matches.map((match) => ({ match, balls })));
          setError(null);
        }
      })().catch((e: Error) => !cancelled && setError(e.message));
      return () => {
        cancelled = true;
      };
    }, [client]),
  );

  return (
    <View style={styles.screen}>
      {/* Hero and cards share one scroll area, so the overlapping card is never clipped. */}
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['top']} style={styles.hero}>
          <Text style={styles.brand}>SCORE MASTERZ</Text>
          <Text style={styles.heroTitle} accessibilityRole="header">
            MATCH DAY
          </Text>
        </SafeAreaView>

        <View style={styles.content}>
          {session.status === 'unconfigured' && (
            <View style={styles.liveCard}>
              <Text style={styles.cardTitle}>Demo mode</Text>
              <Text style={styles.mutedSmall}>Connect Supabase to see live matches. The Score tab works offline as a demo.</Text>
            </View>
          )}
          {error && <Notice tone="error">{error}</Notice>}

          {client && cards === null && !error && (
            <View style={styles.liveCard}>
              <Text style={styles.mutedSmall}>Loading live matches…</Text>
            </View>
          )}

          {cards?.length === 0 && (
            <View style={styles.liveCard}>
              <Text style={styles.cardTitle}>No matches live right now</Text>
              <Text style={styles.mutedSmall}>Start one and it appears here and on the website straight away.</Text>
              <Link href="/score" asChild>
                <Pressable style={styles.primary} accessibilityRole="link">
                  <Text style={styles.primaryText}>Start a match</Text>
                </Pressable>
              </Link>
            </View>
          )}

          {cards?.map(({ match, balls }) => (
            <MatchCard key={match.id} match={match} balls={balls} mine={match.ownerId === userId} />
          ))}

          <Text style={styles.sectionTitle}>QUICK LINKS</Text>
          <View style={styles.quickRow}>
            <Link href="/score" asChild>
              <Pressable style={styles.quick} accessibilityRole="link">
                <Text style={styles.quickText}>Score a match</Text>
              </Pressable>
            </Link>
            <Link href="/teams" asChild>
              <Pressable style={styles.quick} accessibilityRole="link">
                <Text style={styles.quickText}>Teams & players</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MatchCard({ match, balls, mine }: { match: MatchSummary; balls: Record<string, BallEvent[]>; mine: boolean }) {
  const latest = match.innings[match.innings.length - 1];
  const summary = latest ? summariseInnings(balls[latest.id] ?? [], match.rules) : null;
  const battingId = latest?.battingTeamId;

  const body = (
    <View style={styles.liveCard}>
      <View style={styles.rowBetween}>
        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>LIVE</Text>
        </View>
        <Text style={styles.mutedSmall}>
          {match.rules.oversPerInnings} overs{match.venue ? ` · ${match.venue}` : ''}
        </Text>
      </View>
      {[match.teamA, match.teamB].map((t) => {
        const batting = t.id === battingId;
        return (
          <View key={t.id} style={styles.rowBetween}>
            <View style={styles.teamCell}>
              <TeamBadge code={t.shortCode} color={t.color} logoUrl={t.logoUrl} size={32} />
              <Text style={batting ? styles.team : styles.mutedTeam}>{t.name}</Text>
            </View>
            {batting && summary && (
              <Text style={styles.score}>
                {summary.runs}/{summary.wickets} <Text style={styles.overs}>({summary.overs})</Text>
              </Text>
            )}
          </View>
        );
      })}
      <Text style={mine ? styles.tapHint : styles.mutedSmall}>
        {mine ? 'Your match · tap to score →' : 'Being scored on another device'}
      </Text>
    </View>
  );

  if (!mine) return body;
  return (
    <Link href="/score" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`Score ${match.teamA.name} vs ${match.teamB.name}`}>
        {body}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  scroll: { paddingBottom: BottomTabInset + 24 },
  hero: { backgroundColor: colors.scoreboard, paddingHorizontal: 20, paddingBottom: 60, gap: 4 },
  brand: { color: colors.gold, fontWeight: '700', letterSpacing: 1, paddingTop: 12 },
  heroTitle: { color: colors.surface, fontWeight: '700', fontSize: 32 },
  content: { paddingHorizontal: 16, marginTop: -44, gap: 12 },
  liveCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 18,
    gap: 12,
    shadowColor: colors.scoreboard,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamCell: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  badge: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.surface, fontWeight: '700' },
  liveTag: { backgroundColor: colors.live, borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 3 },
  liveTagText: { color: colors.surface, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  mutedSmall: { color: colors.muted, fontSize: 13 },
  mutedTeam: { color: colors.muted, fontWeight: '500' },
  team: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  score: { color: colors.ink, fontWeight: '700', fontSize: 26 },
  overs: { color: colors.muted, fontWeight: '600', fontSize: 15 },
  tapHint: { color: colors.pitch, fontWeight: '700' },
  cardTitle: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  primary: { minHeight: 48, borderRadius: radii.md, backgroundColor: colors.pitch, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.surface, fontWeight: '700' },
  sectionTitle: { color: colors.ink, fontWeight: '700', fontSize: 18, marginTop: 8 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quick: {
    flex: 1,
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  quickText: { color: colors.ink, fontWeight: '700' },
});
