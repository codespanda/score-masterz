import {
  PLAYER_ROLES,
  addPlayer,
  createTeam,
  listPlayers,
  listTeams,
  updatePlayer,
  updateTeam,
  uploadTeamLogo,
  clearTeamLogo,
  type Player,
  type PlayerRole,
  type Team,
} from '@score-masterz/data';
import { colors, radii, teamColors, touchTarget } from '@score-masterz/tokens';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Notice, SessionNotice } from '@/components/notice';
import { TeamBadge } from '@/components/team-badge';
import { BottomTabInset } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { pickOptimisedLogo } from '@/lib/pick-logo';

type TeamDraft = { name: string; shortCode: string; ground: string; color: string };
type PlayerDraft = { id: string; name: string; role: PlayerRole; shirt: string; email: string };

export default function TeamsScreen() {
  const session = useSession();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [color, setColor] = useState<string>(teamColors[0].value);
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [role, setRole] = useState<PlayerRole>('batter');

  const [teamDraft, setTeamDraft] = useState<TeamDraft | null>(null);
  const [playerDraft, setPlayerDraft] = useState<PlayerDraft | null>(null);

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

  async function run(task: () => Promise<void>, done?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await task();
      if (done) setNotice(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function selectTeam(id: string) {
    setSelectedId(id);
    setTeamDraft(null);
    setPlayerDraft(null);
  }

  const selected = teams?.find((t) => t.id === selectedId) ?? null;
  const canEdit = selected !== null && selected.ownerId === userId;
  const sortByName = <T extends { name: string }>(list: T[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          TEAMS
        </Text>

        <SessionNotice session={session} />
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}

        {client && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>New team</Text>
              <Field value={teamName} onChangeText={setTeamName} placeholder="Team name" accessibilityLabel="Team name" />
              <Swatches value={color} onChange={setColor} />
              <Button
                label="Create team"
                disabled={busy}
                onPress={() =>
                  run(async () => {
                    const team = await createTeam(client, { name: teamName, color });
                    setTeams((prev) => sortByName([...(prev ?? []), team]));
                    selectTeam(team.id);
                    setTeamName('');
                  }, 'Team created.')
                }
              />
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
                    onPress={() => selectTeam(t.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: t.id === selectedId }}
                    style={[styles.teamRow, t.id === selectedId && styles.teamRowOn]}>
                    <TeamBadge code={t.shortCode} color={t.color} logoUrl={t.logoUrl} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.teamName}>{t.name}</Text>
                      <Text style={styles.muted}>
                        {t.playerCount} player{t.playerCount === 1 ? '' : 's'}
                        {t.homeGround ? ` · ${t.homeGround}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {selected && teamDraft && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Edit team</Text>
                <Field value={teamDraft.name} onChangeText={(v) => setTeamDraft({ ...teamDraft, name: v })} placeholder="Team name" accessibilityLabel="Team name" />
                <View style={styles.row2}>
                  <Field
                    style={{ flex: 1 }}
                    value={teamDraft.shortCode}
                    onChangeText={(v) => setTeamDraft({ ...teamDraft, shortCode: v.toUpperCase().slice(0, 3) })}
                    placeholder="Code"
                    accessibilityLabel="Short code"
                    autoCapitalize="characters"
                  />
                  <Field
                    style={{ flex: 2 }}
                    value={teamDraft.ground}
                    onChangeText={(v) => setTeamDraft({ ...teamDraft, ground: v })}
                    placeholder="Home ground"
                    accessibilityLabel="Home ground"
                  />
                </View>
                <View style={styles.logoRow}>
                  <TeamBadge code={selected.shortCode} color={selected.color} logoUrl={selected.logoUrl} size={64} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={styles.row2}>
                      <Button
                        label={selected.logoUrl ? 'Replace logo' : 'Upload logo'}
                        tone="outline"
                        disabled={busy}
                        style={{ flex: 1 }}
                        onPress={() =>
                          run(async () => {
                            const data = await pickOptimisedLogo();
                            if (!data) return;
                            const url = await uploadTeamLogo(client, selected.id, data, 'image/webp');
                            setTeams((prev) => prev?.map((t) => (t.id === selected.id ? { ...t, logoUrl: url } : t)) ?? prev);
                            setNotice(`Logo uploaded (${Math.max(1, Math.round(data.byteLength / 1024))} KB after optimising).`);
                          })
                        }
                      />
                      {selected.logoUrl && (
                        <Button
                          label="Remove"
                          tone="secondary"
                          disabled={busy}
                          onPress={() =>
                            run(async () => {
                              await clearTeamLogo(client, selected.id);
                              setTeams((prev) => prev?.map((t) => (t.id === selected.id ? { ...t, logoUrl: null } : t)) ?? prev);
                            }, 'Logo removed.')
                          }
                        />
                      )}
                    </View>
                    <Text style={styles.muted}>Cropped square, resized to 512 px and kept under 1 MB.</Text>
                  </View>
                </View>
                <Swatches value={teamDraft.color} onChange={(c) => setTeamDraft({ ...teamDraft, color: c })} />
                <View style={styles.row2}>
                  <Button
                    label="Save team"
                    disabled={busy}
                    style={{ flex: 1 }}
                    onPress={() =>
                      run(async () => {
                        const team = await updateTeam(client, selected.id, {
                          name: teamDraft.name,
                          shortCode: teamDraft.shortCode,
                          homeGround: teamDraft.ground,
                          color: teamDraft.color,
                        });
                        setTeams((prev) => (prev ? sortByName(prev.map((t) => (t.id === team.id ? team : t))) : prev));
                        setTeamDraft(null);
                      }, 'Team saved.')
                    }
                  />
                  <Button label="Cancel" tone="secondary" style={{ flex: 1 }} onPress={() => setTeamDraft(null)} />
                </View>
              </View>
            )}

            {selected && !teamDraft && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { flex: 1 }]}>{selected.name} squad</Text>
                  {canEdit && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${selected.name}`}
                      onPress={() =>
                        setTeamDraft({ name: selected.name, shortCode: selected.shortCode, ground: selected.homeGround ?? '', color: selected.color })
                      }
                      style={styles.linkBtn}>
                      <Text style={styles.linkText}>Edit team</Text>
                    </Pressable>
                  )}
                </View>

                {players.length === 0 ? (
                  <Text style={styles.muted}>No players yet.</Text>
                ) : (
                  players.map((p) =>
                    playerDraft?.id === p.id ? (
                      <View key={p.id} style={styles.editBox}>
                        <Field value={playerDraft.name} onChangeText={(v) => setPlayerDraft({ ...playerDraft, name: v })} placeholder="Name" accessibilityLabel="Player name" />
                        <RolePills value={playerDraft.role} onChange={(r) => setPlayerDraft({ ...playerDraft, role: r })} />
                        <View style={styles.row2}>
                          <Field
                            style={{ flex: 1 }}
                            value={playerDraft.shirt}
                            onChangeText={(v) => setPlayerDraft({ ...playerDraft, shirt: v.replace(/\D/g, '').slice(0, 3) })}
                            placeholder="Shirt no."
                            accessibilityLabel="Shirt number"
                            keyboardType="number-pad"
                          />
                          <Field
                            style={{ flex: 3 }}
                            value={playerDraft.email}
                            onChangeText={(v) => setPlayerDraft({ ...playerDraft, email: v })}
                            placeholder="Email (private)"
                            accessibilityLabel="Email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                          />
                        </View>
                        <View style={styles.row2}>
                          <Button
                            label="Save"
                            disabled={busy}
                            style={{ flex: 1 }}
                            onPress={() =>
                              run(async () => {
                                const saved = await updatePlayer(client, selected.id, p.id, {
                                  name: playerDraft.name,
                                  role: playerDraft.role,
                                  shirtNumber: playerDraft.shirt === '' ? null : parseInt(playerDraft.shirt, 10),
                                  email: playerDraft.email,
                                });
                                setPlayers((prev) => sortByName(prev.map((x) => (x.id === saved.id ? saved : x))));
                                setPlayerDraft(null);
                              }, 'Player saved.')
                            }
                          />
                          <Button label="Cancel" tone="secondary" style={{ flex: 1 }} onPress={() => setPlayerDraft(null)} />
                        </View>
                      </View>
                    ) : (
                      <View key={p.id} style={styles.playerRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.playerName}>
                            {p.shirtNumber !== null ? `#${p.shirtNumber}  ` : ''}
                            {p.name}
                          </Text>
                          {canEdit && <Text style={styles.muted}>{p.email ?? 'No email'}</Text>}
                        </View>
                        <Text style={styles.role}>{PLAYER_ROLES.find((r) => r.value === p.role)?.label}</Text>
                        {canEdit && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${p.name}`}
                            onPress={() =>
                              setPlayerDraft({ id: p.id, name: p.name, role: p.role, shirt: p.shirtNumber?.toString() ?? '', email: p.email ?? '' })
                            }
                            style={styles.linkBtn}>
                            <Text style={styles.linkText}>Edit</Text>
                          </Pressable>
                        )}
                      </View>
                    ),
                  )
                )}

                {canEdit ? (
                  <View style={styles.addBox}>
                    <Text style={styles.subTitle}>Add player</Text>
                    <Field value={playerName} onChangeText={setPlayerName} placeholder="Player name" accessibilityLabel="Player name" />
                    <Field
                      value={playerEmail}
                      onChangeText={setPlayerEmail}
                      placeholder="Email (optional, private)"
                      accessibilityLabel="Player email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                    <RolePills value={role} onChange={setRole} />
                    <Button
                      label="+ Add player"
                      tone="outline"
                      disabled={busy}
                      onPress={() =>
                        run(async () => {
                          const player = await addPlayer(client, selected.id, { name: playerName, role, email: playerEmail });
                          setPlayers((prev) => sortByName([...prev, player]));
                          setTeams((prev) => prev?.map((t) => (t.id === selected.id ? { ...t, playerCount: t.playerCount + 1 } : t)) ?? prev);
                          setPlayerName('');
                          setPlayerEmail('');
                        }, 'Player added.')
                      }
                    />
                  </View>
                ) : (
                  <Text style={styles.muted}>Only this team&apos;s creator can add or edit players.</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ style, ...props }: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, style]} />;
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <View style={styles.swatches} accessibilityLabel="Team colour">
      {teamColors.map((c) => (
        <Pressable
          key={c.value}
          onPress={() => onChange(c.value)}
          accessibilityRole="button"
          accessibilityLabel={c.name}
          accessibilityState={{ selected: value === c.value }}
          style={[styles.swatch, { backgroundColor: c.value }, value === c.value && styles.swatchOn]}
        />
      ))}
    </View>
  );
}

function RolePills({ value, onChange }: { value: PlayerRole; onChange: (r: PlayerRole) => void }) {
  return (
    <View style={styles.roles}>
      {PLAYER_ROLES.map((r) => (
        <Pressable
          key={r.value}
          onPress={() => onChange(r.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === r.value }}
          style={[styles.pill, value === r.value && styles.pillOn]}>
          <Text style={[styles.pillText, value === r.value && styles.pillTextOn]}>{r.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Button({
  label,
  onPress,
  disabled,
  tone = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'outline';
  style?: object;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        tone === 'primary' && styles.btnPrimary,
        tone === 'secondary' && styles.btnSecondary,
        tone === 'outline' && styles.btnOutline,
        (disabled || pressed) && styles.dim,
        style,
      ]}>
      <Text style={[styles.btnText, tone === 'primary' ? styles.btnTextLight : tone === 'outline' ? styles.btnTextPitch : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 16, gap: 14, paddingBottom: BottomTabInset + 24 },
  title: { fontSize: 30, fontWeight: '700', color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  subTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
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
  row2: { flexDirection: 'row', gap: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  swatches: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  swatch: { width: touchTarget, height: touchTarget, borderRadius: radii.pill, borderWidth: 3, borderColor: 'transparent' },
  swatchOn: { borderColor: colors.ink },
  btn: { minHeight: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  btnPrimary: { backgroundColor: colors.pitch },
  btnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.inputBorder },
  btnOutline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.pitch },
  btnText: { fontWeight: '700', fontSize: 15, color: colors.ink },
  btnTextLight: { color: colors.surface },
  btnTextPitch: { color: colors.pitch },
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
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  playerName: { fontWeight: '700', color: colors.ink },
  role: { color: colors.pitch, backgroundColor: colors.pitchTint, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 12, overflow: 'hidden' },
  linkBtn: { minHeight: touchTarget, minWidth: touchTarget, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: colors.pitch, fontWeight: '700' },
  editBox: { gap: 10, padding: 12, borderRadius: radii.lg, backgroundColor: colors.ground },
  addBox: { gap: 10, borderTopWidth: 1, borderTopColor: colors.lineSoft, paddingTop: 12 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 36, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.inputBorder, justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontSize: 13, fontWeight: '500', color: colors.ink },
  pillTextOn: { color: colors.surface },
});
