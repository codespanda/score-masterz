import {
  bowlerOptions,
  bowlingState,
  chaseState,
  describeResult,
  formatOvers,
  matchResult,
  summariseInnings,
  type BallEvent,
  type ExtraType,
  type InningsSummary,
  type MatchRules,
  type WicketKind,
} from '@score-masterz/scoring';
import { colors, radii, touchTarget } from '@score-masterz/tokens';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Choices, PrimaryButton, Sheet, SheetLabel } from '@/components/sheet';
import { BottomTabInset } from '@/constants/theme';

export interface Person {
  id: string;
  name: string;
}

interface Props {
  title: string;
  subtitle: string;
  rules: MatchRules;
  balls: BallEvent[];
  battingSquad: Person[];
  bowlingSquad: Person[];
  /** Second-innings chase: first-innings total and team names for the result line. */
  chase?: { firstInningsRuns: number; battingTeam: string; bowlingTeam: string };
  /** Shown under the score, e.g. sync status or errors. */
  banner?: ReactNode;
  busy?: boolean;
  onRecord: (ball: Omit<BallEvent, 'id'>) => void;
  onUndo: () => void;
  footer?: ReactNode;
}

const WICKET_KINDS: { value: WicketKind; label: string; fielder?: 'required' | 'optional' }[] = [
  { value: 'bowled', label: 'Bowled' },
  { value: 'caught', label: 'Caught', fielder: 'required' },
  { value: 'lbw', label: 'LBW' },
  { value: 'runout', label: 'Run out', fielder: 'optional' },
  { value: 'stumped', label: 'Stumped', fielder: 'required' },
  { value: 'hitwicket', label: 'Hit wicket' },
];

const EXTRA_SHEETS: Record<
  Exclude<ExtraType, 'penalty'>,
  { title: string; label: string; options: number[]; format: (n: number) => string }
> = {
  wide: { title: 'Wide', label: 'Extra runs taken (besides the wide)', options: [0, 1, 2, 3, 4], format: (n) => (n ? `+${n}` : 'Wd') },
  noball: { title: 'No ball', label: 'Runs off the bat', options: [0, 1, 2, 3, 4, 6], format: (n) => (n ? String(n) : 'Nb') },
  bye: { title: 'Byes', label: 'Byes run', options: [1, 2, 3, 4], format: String },
  legbye: { title: 'Leg byes', label: 'Leg byes run', options: [1, 2, 3, 4], format: String },
};

function ballLabel(ball: BallEvent): string {
  if (ball.wicket) return 'W';
  if (ball.extra?.type === 'wide') return ball.extra.runs > 1 ? `${ball.extra.runs}wd` : 'Wd';
  if (ball.extra?.type === 'noball') return ball.runs ? `${ball.runs}nb` : 'Nb';
  if (ball.extra?.type === 'bye') return `${ball.extra.runs}b`;
  if (ball.extra?.type === 'legbye') return `${ball.extra.runs}lb`;
  return ball.runs === 0 ? '•' : String(ball.runs);
}

/** Batters at the crease, who is still to bat, and whether the side is all out. */
export function crease(
  summary: InningsSummary,
  balls: BallEvent[],
  battingSquad: Person[],
  openers: { striker?: string; nonStriker?: string },
) {
  // Before the first ball the scorer's chosen openers are in; after that the engine says who is.
  // A gap once play has started means a wicket fell with nobody left to bat.
  const started = balls.length > 0;
  const striker = started ? summary.strikerId : openers.striker;
  const nonStriker = started ? summary.nonStrikerId : openers.nonStriker;
  const used = new Set(summary.batters.map((b) => b.playerId));
  if (striker) used.add(striker);
  if (nonStriker) used.add(nonStriker);
  const yetToBat = battingSquad.filter((p) => !used.has(p.id));
  const allOut = started && (!striker || !nonStriker);
  return { started, striker, nonStriker, yetToBat, allOut };
}

export function Scoreboard({
  title,
  subtitle,
  rules,
  balls,
  battingSquad,
  bowlingSquad,
  chase,
  banner,
  busy,
  onRecord,
  onUndo,
  footer,
}: Props) {
  const summary = useMemo(() => summariseInnings(balls, rules), [balls, rules]);
  const bowlState = useMemo(() => bowlingState(balls, rules), [balls, rules]);
  const first = useMemo(
    () => (chase ? { ...summariseInnings([], rules), runs: chase.firstInningsRuns, complete: true } : null),
    [chase, rules],
  );

  const [openers, setOpeners] = useState<{ striker?: string; nonStriker?: string }>({});
  // The bowler picked for a given over; ignored once that over's balls carry the bowler.
  const [chosenBowler, setChosenBowler] = useState<{ over: number; id: string } | null>(null);
  const [sheet, setSheet] = useState<null | 'wicket' | Exclude<ExtraType, 'penalty'>>(null);

  const chaseInfo = first ? chaseState(first.runs, summary, rules) : null;
  const result = first ? matchResult(first, summary, rules) : null;
  const { started, striker, nonStriker, yetToBat, allOut } = crease(summary, balls, battingSquad, openers);
  const finished = (result ? result.status !== 'in_progress' : summary.complete) || allOut;

  const overIndex = Math.floor(summary.legalBalls / rules.ballsPerOver);
  const bowlerId =
    bowlState.currentBowlerId ?? (chosenBowler?.over === overIndex ? chosenBowler.id : undefined);

  const everyone = useMemo(() => [...battingSquad, ...bowlingSquad], [battingSquad, bowlingSquad]);
  const nameOf = (id: string | undefined) => everyone.find((p) => p.id === id)?.name ?? '—';
  const figures = (id: string | undefined) => summary.batters.find((b) => b.playerId === id);
  const bowling = summary.bowlers.find((b) => b.playerId === bowlerId);

  const needsOpeners = !started && !finished && (!striker || !nonStriker || !bowlerId);
  const needsBowler = started && !finished && !bowlerId;
  const disabled = finished || busy || !striker || !nonStriker || !bowlerId;

  function record(input: Pick<BallEvent, 'runs' | 'extra' | 'wicket' | 'newBatterId'>) {
    if (disabled || !striker || !nonStriker || !bowlerId) return;
    onRecord({ strikerId: striker, nonStrikerId: nonStriker, bowlerId, ...input });
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
            <View key={id ?? `empty-${i}`} style={styles.creaseRow}>
              <Text style={styles.creaseName}>
                {nameOf(id)}
                {i === 0 && id ? ' *' : ''}
              </Text>
              <Text style={styles.creaseFig}>
                {f?.runs ?? 0} ({f?.balls ?? 0})
              </Text>
            </View>
          );
        })}
        <View style={styles.creaseRow}>
          <Text style={styles.muted}>{bowlerId ? `${nameOf(bowlerId)} · bowling` : 'New over · pick a bowler'}</Text>
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
              accessibilityLabel={n === 0 ? 'Dot ball' : `${n} run${n === 1 ? '' : 's'}`}
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
          <Key label="Wide" disabled={disabled} onPress={() => setSheet('wide')} />
          <Key label="No ball" disabled={disabled} onPress={() => setSheet('noball')} />
          <Key label="Bye" disabled={disabled} onPress={() => setSheet('bye')} />
          <Key label="Leg bye" disabled={disabled} onPress={() => setSheet('legbye')} />
        </View>
        <View style={styles.padRow}>
          <Key label="Wicket" tone="danger" disabled={disabled} onPress={() => setSheet('wicket')} />
          <Key label="Undo" onPress={onUndo} disabled={busy || balls.length === 0} />
        </View>
        {footer}
      </View>

      <OpenersSheet
        visible={needsOpeners}
        battingSquad={battingSquad}
        bowlingSquad={bowlingSquad}
        onConfirm={(s, ns, b) => {
          setOpeners({ striker: s, nonStriker: ns });
          setChosenBowler({ over: 0, id: b });
        }}
      />

      <BowlerSheet
        visible={needsBowler}
        overNumber={overIndex + 1}
        options={bowlerOptions(
          bowlingSquad.map((p) => p.id),
          bowlState,
          rules,
        )}
        nameOf={nameOf}
        busy={busy}
        onPick={(id) => setChosenBowler({ over: overIndex, id })}
        onUndo={onUndo}
      />

      {sheet && sheet !== 'wicket' && (
        <ExtraSheet
          type={sheet}
          penalty={rules.wideNoBallPenalty}
          onClose={() => setSheet(null)}
          onRecord={(input) => {
            setSheet(null);
            record(input);
          }}
        />
      )}

      {sheet === 'wicket' && striker && nonStriker && (
        <WicketSheet
          striker={{ id: striker, name: nameOf(striker) }}
          nonStriker={{ id: nonStriker, name: nameOf(nonStriker) }}
          fielders={bowlingSquad}
          yetToBat={yetToBat}
          freeHit={summary.nextIsFreeHit}
          onClose={() => setSheet(null)}
          onRecord={(input) => {
            setSheet(null);
            record(input);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function OpenersSheet({
  visible,
  battingSquad,
  bowlingSquad,
  onConfirm,
}: {
  visible: boolean;
  battingSquad: Person[];
  bowlingSquad: Person[];
  onConfirm: (striker: string, nonStriker: string, bowler: string) => void;
}) {
  const [striker, setStriker] = useState<string>();
  const [nonStriker, setNonStriker] = useState<string>();
  const [bowler, setBowler] = useState<string>();
  const people = (list: Person[], exclude?: string) =>
    list.map((p) => ({ value: p.id, label: p.name, disabled: p.id === exclude }));
  const ready = striker && nonStriker && bowler && striker !== nonStriker;

  return (
    <Sheet
      visible={visible}
      title="Start of innings"
      footer={
        <PrimaryButton
          label="Start scoring"
          disabled={!ready}
          onPress={() => ready && onConfirm(striker, nonStriker, bowler)}
        />
      }>
      <SheetLabel>STRIKER</SheetLabel>
      <Choices options={people(battingSquad, nonStriker)} value={striker} onChange={setStriker} />
      <SheetLabel>NON-STRIKER</SheetLabel>
      <Choices options={people(battingSquad, striker)} value={nonStriker} onChange={setNonStriker} />
      <SheetLabel>OPENING BOWLER</SheetLabel>
      <Choices options={people(bowlingSquad)} value={bowler} onChange={setBowler} />
    </Sheet>
  );
}

function BowlerSheet({
  visible,
  overNumber,
  options,
  nameOf,
  busy,
  onPick,
  onUndo,
}: {
  visible: boolean;
  overNumber: number;
  options: ReturnType<typeof bowlerOptions>;
  nameOf: (id: string) => string;
  busy?: boolean;
  onPick: (id: string) => void;
  onUndo: () => void;
}) {
  // If nobody is eligible (a small squad), let the scorer choose anyway rather than get stuck.
  const anyEligible = options.some((o) => !o.blockedReason);
  return (
    <Sheet
      visible={visible}
      title={`Over ${overNumber} · who's bowling?`}
      footer={
        <Pressable onPress={onUndo} disabled={busy} accessibilityRole="button" style={styles.sheetLink}>
          <Text style={styles.sheetLinkText}>Undo last ball</Text>
        </Pressable>
      }>
      <Choices
        options={options.map((o) => ({
          value: o.playerId,
          label: nameOf(o.playerId),
          hint:
            o.blockedReason === 'bowled_last_over'
              ? 'bowled last over'
              : o.blockedReason === 'quota_used'
                ? `${o.oversBowled} ov · quota used`
                : `${o.oversBowled} ov`,
          disabled: anyEligible && !!o.blockedReason,
        }))}
        value={undefined}
        onChange={onPick}
      />
    </Sheet>
  );
}

function ExtraSheet({
  type,
  penalty,
  onClose,
  onRecord,
}: {
  type: Exclude<ExtraType, 'penalty'>;
  penalty: number;
  onClose: () => void;
  onRecord: (input: Pick<BallEvent, 'runs' | 'extra'>) => void;
}) {
  const cfg = EXTRA_SHEETS[type];
  const toBall = (n: number): Pick<BallEvent, 'runs' | 'extra'> => {
    if (type === 'wide') return { runs: 0, extra: { type, runs: penalty + n } };
    if (type === 'noball') return { runs: n, extra: { type, runs: penalty } };
    return { runs: 0, extra: { type, runs: n } };
  };
  return (
    <Sheet visible title={cfg.title} onClose={onClose}>
      <SheetLabel>{cfg.label.toUpperCase()}</SheetLabel>
      <Choices
        options={cfg.options.map((n) => ({ value: n, label: cfg.format(n) }))}
        value={undefined}
        onChange={(n) => onRecord(toBall(n))}
      />
    </Sheet>
  );
}

function WicketSheet({
  striker,
  nonStriker,
  fielders,
  yetToBat,
  freeHit,
  onClose,
  onRecord,
}: {
  striker: Person;
  nonStriker: Person;
  fielders: Person[];
  yetToBat: Person[];
  freeHit: boolean;
  onClose: () => void;
  onRecord: (input: Pick<BallEvent, 'runs' | 'wicket' | 'newBatterId'>) => void;
}) {
  const [kind, setKind] = useState<WicketKind | undefined>(freeHit ? 'runout' : undefined);
  const [outId, setOutId] = useState(striker.id);
  const [fielderId, setFielderId] = useState<string>();
  const [runs, setRuns] = useState(0);
  const [newBatterId, setNewBatterId] = useState<string | undefined>(yetToBat[0]?.id);

  const kindInfo = WICKET_KINDS.find((k) => k.value === kind);
  const isRunOut = kind === 'runout';
  const needsFielder = kindInfo?.fielder === 'required';
  const ready = kind && (!needsFielder || fielderId) && (yetToBat.length === 0 || newBatterId);

  return (
    <Sheet
      visible
      title="Wicket"
      onClose={onClose}
      footer={
        <PrimaryButton
          label={yetToBat.length === 0 ? 'Record wicket · all out' : 'Record wicket'}
          disabled={!ready}
          onPress={() =>
            ready &&
            onRecord({
              runs: isRunOut ? runs : 0,
              wicket: {
                kind,
                playerOutId: isRunOut ? outId : striker.id,
                fielderId: kindInfo?.fielder ? fielderId : undefined,
              },
              newBatterId: yetToBat.length ? newBatterId : undefined,
            })
          }
        />
      }>
      <SheetLabel>{freeHit ? 'HOW OUT · FREE HIT, RUN OUT ONLY' : 'HOW OUT'}</SheetLabel>
      <Choices
        options={WICKET_KINDS.map((k) => ({ value: k.value, label: k.label, disabled: freeHit && k.value !== 'runout' }))}
        value={kind}
        onChange={setKind}
      />

      {isRunOut && (
        <>
          <SheetLabel>WHO IS OUT</SheetLabel>
          <Choices
            options={[
              { value: striker.id, label: `${striker.name} (striker)` },
              { value: nonStriker.id, label: nonStriker.name },
            ]}
            value={outId}
            onChange={setOutId}
          />
          <SheetLabel>RUNS COMPLETED BEFORE THE RUN OUT</SheetLabel>
          <Choices options={[0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }))} value={runs} onChange={setRuns} />
        </>
      )}

      {kindInfo?.fielder && (
        <>
          <SheetLabel>{kind === 'stumped' ? 'WICKET-KEEPER' : kind === 'caught' ? 'CAUGHT BY' : 'FIELDER (OPTIONAL)'}</SheetLabel>
          <Choices options={fielders.map((p) => ({ value: p.id, label: p.name }))} value={fielderId} onChange={setFielderId} />
        </>
      )}

      <SheetLabel>NEXT BATTER</SheetLabel>
      {yetToBat.length === 0 ? (
        <Text style={styles.sheetNote}>Nobody left to bat. This wicket ends the innings.</Text>
      ) : (
        <Choices options={yetToBat.map((p) => ({ value: p.id, label: p.name }))} value={newBatterId} onChange={setNewBatterId} />
      )}
    </Sheet>
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
  sheetLink: { minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  sheetLinkText: { color: colors.wicket, fontWeight: '700' },
  sheetNote: { color: colors.inkSoft, fontSize: 14 },
});
