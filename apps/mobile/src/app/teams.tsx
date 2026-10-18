import {
  PLAYER_ROLES,
  addPlayer,
  createTeam,
  listPlayers,
  listTeams,
  type Player,
  type PlayerRole,
  type Team,
} from '@score-masterz/data';
import { colors, radii, teamColors, touchTarget } from '@score-masterz/tokens';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Notice, SessionNotice } from '@/components/notice';
import { BottomTabInset } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

export default function TeamsScreen() {
  const session = useSession();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [color, setColor] = useState<string>(teamColors[0].value);
  const [playerName, setPlayerName] = useState('');
  const [role, setRole] = useState<PlayerRole>('batter');

  const client = session.status === 'ready' ? session.client : null;
  const userId = session.status === 'ready' ? session.userId : null;

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    listTeams(client)
      .then((list) => {
        if (cancelled) return;
        setTeams(list);
        setSelectedId((id) => id ?? list[0]?.id ?? null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    if (!client || !selectedId) return;
    let cancelled = false;
    listPlayers(client, selectedId)
      .then((list) => !cancelled && setPlayers(list))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [client, selectedId]);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const selected = teams?.find((t) => t.id === selectedId) ?? null;
  const canEdit = selected !== null && selected.ownerId === userId;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          TEAMS
        </Text>

        <SessionNotice session={session} />
        {error && <Notice tone="error">{error}</Notice>}

        {client && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>New team</Text>
              <TextInput
                value={teamName}
                onChangeText={setTeamName}
                placeholder="Team name"
                placeholderTextColor={colors.muted}
                accessibilityLabel="Team name"
                style={styles.input}
              />
              <View style={styles.swatches} accessibilityLabel="Team colour">
                {teamColors.map((c) => (
                  <Pressable
                    key={c.value}
                    onPress={() => setColor(c.value)}
                    accessibilityRole="button"
                    accessibilityLabel={c.name}
                    accessibilityState={{ selected: color === c.value }}
                    style={[styles.swatch, { backgroundColor: c.value }, color === c.value && styles.swatchOn]}
                  />
                ))}
              </View>
              <Pressable
                disabled={busy}
                accessibilityRole="button"
                onPress={() =>
                  run(async () => {
                    const team = await createTeam(client, { name: teamName, color });
                    setTeams((prev) => [...(prev ?? []), team].sort((a, b) => a.name.localeCompare(b.name)));
                    setSelectedId(team.id);
                    setTeamName('');
                  })
                }
                style={({ pressed }) => [styles.primary, (busy || pressed) && styles.dim]}>
                <Text style={styles.primaryText}>Create team</Text>
              </Pressable>
            </View>

            {teams === null ? (
              <Text style={styles.muted}>Loading teams…</Text>
            ) : teams.length === 0 ? (
              <Text style={styles.muted}>No teams yet — create the first one above.</Text>
            ) : (
              <View style={styles.teamList}>
                {teams.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => setSelectedId(t.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: t.id === selectedId }}
                    style={[styles.teamRow, t.id === selectedId && styles.teamRowOn]}>
                    <View style={[styles.badge, { backgroundColor: t.color }]}>
                      <Text style={styles.badgeText}>{t.shortCode}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.teamName}>{t.name}</Text>
                      <Text style={styles.muted}>
                        {t.playerCount} player{t.playerCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {selected && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{selected.name} squad</Text>
                {players.length === 0 ? (
                  <Text style={styles.muted}>No players yet.</Text>
                ) : (
                  players.map((p) => (
                    <View key={p.id} style={styles.playerRow}>
                      <Text style={styles.playerName}>{p.name}</Text>
                      <Text style={styles.role}>{PLAYER_ROLES.find((r) => r.value === p.role)?.label}</Text>
                    </View>
                  ))
                )}
                {canEdit && (
                  <>
                    <TextInput
                      value={playerName}
                      onChangeText={setPlayerName}
                      placeholder="Player name"
                      placeholderTextColor={colors.muted}
                      accessibilityLabel="Player name"
                      style={styles.input}
                    />
                    <View style={styles.roles}>
                      {PLAYER_ROLES.map((r) => (
                        <Pressable
                          key={r.value}
                          onPress={() => setRole(r.value)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: role === r.value }}
                          style={[styles.pill, role === r.value && styles.pillOn]}>
                          <Text style={[styles.pillText, role === r.value && styles.pillTextOn]}>{r.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable
                      disabled={busy}
                      accessibilityRole="button"
                      onPress={() =>
                        run(async () => {
                          const player = await addPlayer(client, selected.id, { name: playerName, role });
                          setPlayers((prev) => [...prev, player].sort((a, b) => a.name.localeCompare(b.name)));
                          setTeams(
                            (prev) =>
                              prev?.map((t) => (t.id === selected.id ? { ...t, playerCount: t.playerCount + 1 } : t)) ?? prev,
                          );
                          setPlayerName('');
                        })
                      }
                      style={({ pressed }) => [styles.secondary, (busy || pressed) && styles.dim]}>
                      <Text style={styles.secondaryText}>+ Add player</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 16, gap: 14, paddingBottom: BottomTabInset + 24 },
  title: { fontSize: 30, fontWeight: '700', color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  swatches: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  swatch: { width: touchTarget, height: touchTarget, borderRadius: radii.pill, borderWidth: 3, borderColor: 'transparent' },
  swatchOn: { borderColor: colors.ink },
  primary: { minHeight: 50, borderRadius: radii.md, backgroundColor: colors.pitch, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.surface, fontWeight: '700', fontSize: 16 },
  secondary: {
    minHeight: touchTarget,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.pitch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.pitch, fontWeight: '700' },
  dim: { opacity: 0.6 },
  muted: { color: colors.muted, fontSize: 13 },
  teamList: { gap: 8 },
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
  teamRowOn: { borderWidth: 2, borderColor: colors.pitch },
  badge: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.surface, fontWeight: '700' },
  teamName: { fontWeight: '700', color: colors.ink },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  playerName: { fontWeight: '700', color: colors.ink },
  role: { color: colors.pitch, backgroundColor: colors.pitchTint, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 12, overflow: 'hidden' },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 36, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.inputBorder, justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontSize: 13, fontWeight: '500', color: colors.ink },
  pillTextOn: { color: colors.surface },
});
