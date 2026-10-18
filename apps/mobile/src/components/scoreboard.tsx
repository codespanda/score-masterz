import {
  chaseState,
  describeResult,
  formatOvers,
  matchResult,
  summariseInnings,
  type BallEvent,
  type InningsSummary,
  type MatchRules,
} from '@score-masterz/scoring';
import { colors, radii, touchTarget } from '@score-masterz/tokens';
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset } from '@/constants/theme';

export interface Person {
  id: string;
  name: string;
}

export type BallInput = Pick<BallEvent, 'runs' | 'extra' | 'wicket'>;

interface Props {
  title: string;
  subtitle: string;
  rules: MatchRules;
  balls: BallEvent[];
  battingOrder: Person[];
  bowler: Person;
  /** Second-innings chase: first-innings total and team names for the result line. */
  chase?: { firstInningsRuns: number; battingTeam: string; bowlingTeam: string };
  /** Shown under the score, e.g. sync status or errors. */
  banner?: ReactNode;
  busy?: boolean;
  onRecord: (ball: Omit<BallEvent, 'id'>) => void;
  onUndo: () => void;
  footer?: ReactNode;
}

function ballLabel(ball: BallEvent): string {
  if (ball.wicket) return 'W';
  if (ball.extra?.type === 'wide') return 'Wd';
  if (ball.extra?.type === 'noball') return 'Nb';
  if (ball.extra?.type === 'bye' || ball.extra?.type === 'legbye') return `${ball.extra.runs}b`;
  return ball.runs === 0 ? '•' : String(ball.runs);
}

/** Batters at the crease and who comes in next, worked out from the balls so far. */
export function crease(summary: InningsSummary, battingOrder: Person[]) {
  // Openers come from the batting order; after that the engine says who is in.
  // A gap once play has started means a wicket fell with nobody left to bat.
  const started = summary.batters.length > 0;
  const striker = started ? summary.strikerId : battingOrder[0]?.id;
  const nonStriker = started ? summary.nonStrikerId : battingOrder[1]?.id;
  const used = new Set(summary.batters.map((b) => b.playerId));
  if (striker) used.add(striker);
  if (nonStriker) used.add(nonStriker);
  const next = battingOrder.find((p) => !used.has(p.id));
  const allOut = started && (!striker || !nonStriker);
  return { striker, nonStriker, next, allOut };
}

export function Scoreboard({ title, subtitle, rules, balls, battingOrder, bowler, chase, banner, busy, onRecord, onUndo, footer }: Props) {
  const summary = useMemo(() => summariseInnings(balls, rules), [balls, rules]);
  const first = useMemo(
    () => (chase ? { ...summariseInnings([], rules), runs: chase.firstInningsRuns, complete: true } : null),
    [chase, rules],
  );
  const chaseInfo = first ? chaseState(first.runs, summary, rules) : null;
  const result = first ? matchResult(first, summary, rules) : null;
  const { striker, nonStriker, next, allOut } = crease(summary, battingOrder);
  const finished = (result ? result.status !== 'in_progress' : summary.complete) || allOut;
  const nameOf = (id: string | undefined) => battingOrder.find((p) => p.id === id)?.name ?? '—';
  const figures = (id: string | undefined) => summary.batters.find((b) => b.playerId === id);
  const bowling = summary.bowlers.find((b) => b.playerId === bowler.id);
  const disabled = finished || busy || !striker || !nonStriker;

  function record(input: BallInput) {
    if (disabled || !striker || !nonStriker) return;
    onRecord({
      strikerId: striker,
      nonStrikerId: nonStriker,
      bowlerId: bowler.id,
      ...input,
      newBatterId: input.wicket ? next?.id : undefined,
    });
  }

  let status: string;
  if (chaseInfo && result && chase) {
    status = finished
      ? describeResult(result, chase.bowlingTeam, chase.battingTeam)
      : `Need ${chaseInfo.runsNeeded} from ${chaseInfo.ballsLeft} balls · RRR ${chaseInfo.requiredRate.toFixed(2)}`;
  } else {
    status = allOut ? 'All out · innings complete' : finished ? 'Innings complete' : `1st innings · ${rules.oversPerInnings} overs`;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSub}>{subtitle}</Text>
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.score} accessibilityLiveRegion="polite">
          {summary.runs}/{summary.wickets}
        </Text>
        <View style={styles.scoreSide}>
          <Text style={styles.overs}>{summary.overs} ov</Text>
          <Text style={styles.muted}>CRR {summary.runRate.toFixed(2)}</Text>
        </View>
      </View>

      <View style={[styles.status, finished && styles.statusDone]}>
        <Text style={[styles.statusText, finished && styles.statusTextDone]}>
          {status}
          {summary.nextIsFreeHit && !finished ? ' · FREE HIT' : ''}
        </Text>
      </View>
      {banner}

      <View style={styles.crease}>
        {[striker, nonStriker].map((id, i) => {
          const f = figures(id);
          return (
            <View key={id ?? i} style={styles.creaseRow}>
              <Text style={styles.creaseName}>
                {nameOf(id)}
                {i === 0 ? ' *' : ''}
              </Text>
              <Text style={styles.creaseFig}>
                {f?.runs ?? 0} ({f?.balls ?? 0})
              </Text>
            </View>
          );
        })}
        <View style={styles.creaseRow}>
          <Text style={styles.muted}>{bowler.name} · bowling</Text>
          <Text style={styles.muted}>
            {formatOvers(bowling?.legalBalls ?? 0, rules.ballsPerOver)}–{bowling?.maidens ?? 0}–{bowling?.runs ?? 0}–
            {bowling?.wickets ?? 0}
          </Text>
        </View>
      </View>

      <View style={styles.overBox}>
        <Text style={styles.label}>THIS OVER</Text>
        <View style={styles.overBalls}>
          {summary.currentOver.map((b) => (
            <View key={b.id} style={[styles.chip, chipStyle(b)]}>
              <Text style={[styles.chipText, chipTextStyle(b)]}>{ballLabel(b)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.pad}>
        <View style={styles.padRow}>
          {[0, 1, 2, 3, 4, 6].map((n) => (
            <Pressable
              key={n}
              onPress={() => record({ runs: n })}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={n === 0 ? 'Dot ball' : `${n} runs`}
              style={({ pressed }) => [
                styles.runKey,
                n === 4 && styles.fourKey,
                n === 6 && styles.sixKey,
                disabled && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.runKeyText, n === 6 && styles.sixKeyText]}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.padRow}>
          <Key label="Wide" disabled={disabled} onPress={() => record({ runs: 0, extra: { type: 'wide', runs: rules.wideNoBallPenalty } })} />
          <Key label="No ball" disabled={disabled} onPress={() => record({ runs: 0, extra: { type: 'noball', runs: rules.wideNoBallPenalty } })} />
          <Key label="Leg bye" disabled={disabled} onPress={() => record({ runs: 0, extra: { type: 'legbye', runs: 1 } })} />
        </View>
        <View style={styles.padRow}>
          <Key
            label="Wicket"
            tone="danger"
            disabled={disabled}
            onPress={() => striker && record({ runs: 0, wicket: { kind: 'bowled', playerOutId: striker } })}
          />
          <Key label="Undo" onPress={onUndo} disabled={busy || balls.length === 0} />
        </View>
        {footer}
      </View>
    </SafeAreaView>
  );
}

function Key({ label, onPress, tone, disabled }: { label: string; onPress: () => void; tone?: 'danger'; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.key, tone === 'danger' && styles.keyDanger, disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={[styles.keyText, tone === 'danger' && styles.keyDangerText]}>{label}</Text>
    </Pressable>
  );
}

function chipStyle(b: BallEvent) {
  if (b.wicket) return { backgroundColor: colors.wicket };
  if (b.runs === 4) return { backgroundColor: colors.gold };
  if (b.runs === 6) return { backgroundColor: colors.surface };
  if (b.extra?.type === 'wide' || b.extra?.type === 'noball') return { borderWidth: 2, borderColor: colors.gold };
  return { backgroundColor: 'rgba(255,255,255,0.12)' };
}

function chipTextStyle(b: BallEvent) {
  if (b.wicket) return { color: colors.surface };
  if (b.runs === 4 || b.runs === 6) return { color: colors.scoreboard };
  if (b.extra?.type === 'wide' || b.extra?.type === 'noball') return { color: colors.gold };
  return { color: colors.surface };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.scoreboard },
  header: { paddingHorizontal: 20, paddingTop: 8, gap: 2 },
  headerTitle: { color: colors.surface, fontWeight: '700', fontSize: 15 },
  headerSub: { color: colors.onScoreboardMuted, fontSize: 13 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  score: { color: colors.surface, fontWeight: '700', fontSize: 80, lineHeight: 84 },
  scoreSide: { alignItems: 'flex-end', paddingBottom: 10 },
  overs: { color: colors.surface, fontWeight: '600', fontSize: 26 },
  muted: { color: colors.onScoreboardMuted, fontSize: 13 },
  status: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(242,183,5,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(242,183,5,0.4)',
  },
  statusDone: { backgroundColor: colors.gold, borderColor: colors.gold },
  statusText: { color: '#FCE7A1', fontSize: 14, fontWeight: '500' },
  statusTextDone: { color: colors.scoreboard, fontWeight: '700' },
  crease: { margin: 16, marginBottom: 0, paddingHorizontal: 14, paddingVertical: 4, borderRadius: radii.lg, backgroundColor: 'rgba(255,255,255,0.06)' },
  creaseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  creaseName: { color: colors.surface, fontWeight: '500' },
  creaseFig: { color: colors.surface, fontWeight: '600', fontSize: 17 },
  overBox: { paddingHorizontal: 20, paddingTop: 14, gap: 8 },
  label: { color: colors.onScoreboardMuted, fontSize: 12, letterSpacing: 1 },
  overBalls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 40 },
  chip: { minWidth: 40, height: 40, paddingHorizontal: 6, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontWeight: '700', fontSize: 14 },
  pad: {
    marginTop: 'auto',
    backgroundColor: colors.ground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: BottomTabInset + 16,
    gap: 10,
  },
  padRow: { flexDirection: 'row', gap: 10 },
  runKey: {
    flex: 1,
    minHeight: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fourKey: { backgroundColor: colors.gold, borderColor: colors.gold },
  sixKey: { backgroundColor: colors.pitch, borderColor: colors.pitch },
  runKeyText: { fontWeight: '700', fontSize: 26, color: colors.ink },
  sixKeyText: { color: colors.surface },
  key: {
    flex: 1,
    minHeight: Math.max(touchTarget, 50),
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontWeight: '700', color: colors.ink },
  keyDanger: { backgroundColor: colors.wicket, borderColor: colors.wicket },
  keyDangerText: { color: colors.surface },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
