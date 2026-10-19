"use client";

import {
  PLAYER_ROLES,
  addPlayer,
  createTeam,
  defaultShortCode,
  clearTeamLogo,
  ensureSession,
  listPlayers,
  listTeams,
  updatePlayer,
  updateTeam,
  uploadTeamLogo,
  type Player,
  type PlayerRole,
  type Team,
} from "@score-masterz/data";
import { teamColors } from "@score-masterz/tokens";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { TeamBadge } from "@/components/team-badge";
import { optimiseLogo } from "@/lib/optimise-logo";
import { getSupabase } from "@/lib/supabase";

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-[#C7D2CA] bg-white px-3 text-[15px] outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/30";
const labelClass = "flex flex-col gap-1.5 text-[13px] font-medium text-ink-soft";
const primaryBtn = "min-h-11 rounded-[10px] bg-pitch px-[18px] font-bold text-white disabled:opacity-50";
const secondaryBtn = "min-h-11 rounded-[10px] border border-[#C7D2CA] bg-white px-4 font-bold text-ink disabled:opacity-50";

function Badge({ team, size = 44 }: { team: Pick<Team, "shortCode" | "color" | "logoUrl">; size?: number }) {
  return <TeamBadge code={team.shortCode} color={team.color} logoUrl={team.logoUrl} size={size} />;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2 text-[13px] font-medium text-ink-soft">Team colour</legend>
      <div className="flex flex-wrap gap-2.5">
        {teamColors.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-label={c.name}
            aria-pressed={value === c.value}
            onClick={() => onChange(c.value)}
            className={`h-11 w-11 rounded-full border-[3px] ${value === c.value ? "border-white ring-[3px] ring-ink" : "border-transparent"}`}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>
    </fieldset>
  );
}

function RoleSelect({ value, onChange }: { value: PlayerRole; onChange: (r: PlayerRole) => void }) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as PlayerRole)}>
      {PLAYER_ROLES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

const parseShirt = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.min(999, parseInt(s, 10) || 0)));

export function TeamsManager() {
  const supabase = getSupabase();
  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // New team
  const [teamName, setTeamName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [ground, setGround] = useState("");
  const [color, setColor] = useState<string>(teamColors[0].value);

  // New player
  const [playerName, setPlayerName] = useState("");
  const [role, setRole] = useState<PlayerRole>("batter");
  const [playerEmail, setPlayerEmail] = useState("");

  // Editing
  const [editingTeam, setEditingTeam] = useState<{ name: string; shortCode: string; ground: string; color: string } | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string; role: PlayerRole; shirt: string; email: string } | null>(null);

  const run = useCallback(async (task: () => Promise<void>, done?: string) => {
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
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    ensureSession(supabase)
      .then(async (uid) => {
        const list = await listTeams(supabase);
        if (cancelled) return;
        setUserId(uid);
        setTeams(list);
        setSelectedId((id) => id ?? list[0]?.id ?? null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !selectedId) return;
    let cancelled = false;
    listPlayers(supabase, selectedId)
      .then((list) => !cancelled && setPlayers(list))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [supabase, selectedId]);

  if (!supabase) {
    return (
      <p role="alert" className="rounded-2xl border border-gold/50 bg-gold-tint p-5 text-gold-ink">
        Supabase isn&apos;t configured. Copy <code>apps/web/.env.example</code> to <code>apps/web/.env.local</code>, fill in
        your project URL and anon key, then restart the dev server.
      </p>
    );
  }

  const selected = teams?.find((t) => t.id === selectedId) ?? null;
  const canEdit = selected !== null && selected.ownerId === userId;

  function selectTeam(id: string) {
    setSelectedId(id);
    setEditingTeam(null);
    setEditingPlayer(null);
  }

  function onCreateTeam(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const team = await createTeam(supabase!, { name: teamName, shortCode, color, homeGround: ground });
      setTeams((prev) => [...(prev ?? []), team].sort((a, b) => a.name.localeCompare(b.name)));
      selectTeam(team.id);
      setTeamName("");
      setShortCode("");
      setGround("");
    }, "Team created.");
  }

  function onSaveTeam(e: FormEvent) {
    e.preventDefault();
    if (!selected || !editingTeam) return;
    void run(async () => {
      const team = await updateTeam(supabase!, selected.id, {
        name: editingTeam.name,
        shortCode: editingTeam.shortCode,
        homeGround: editingTeam.ground,
        color: editingTeam.color,
      });
      setTeams((prev) => prev?.map((t) => (t.id === team.id ? team : t)).sort((a, b) => a.name.localeCompare(b.name)) ?? prev);
      setEditingTeam(null);
    }, "Team saved.");
  }

  function onAddPlayer(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    void run(async () => {
      const player = await addPlayer(supabase!, selected.id, { name: playerName, role, email: playerEmail });
      setPlayers((prev) => [...prev, player].sort((a, b) => a.name.localeCompare(b.name)));
      setTeams((prev) => prev?.map((t) => (t.id === selected.id ? { ...t, playerCount: t.playerCount + 1 } : t)) ?? prev);
      setPlayerName("");
      setPlayerEmail("");
    }, "Player added.");
  }

  function onSavePlayer(e: FormEvent) {
    e.preventDefault();
    if (!selected || !editingPlayer) return;
    const p = editingPlayer;
    void run(async () => {
      const saved = await updatePlayer(supabase!, selected.id, p.id, {
        name: p.name,
        role: p.role,
        shirtNumber: parseShirt(p.shirt),
        email: p.email,
      });
      setPlayers((prev) => prev.map((x) => (x.id === saved.id ? saved : x)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingPlayer(null);
    }, "Player saved.");
  }

  function onLogoChosen(file: File | undefined) {
    if (!file || !selected) return;
    const teamId = selected.id;
    void run(async () => {
      const blob = await optimiseLogo(file);
      const url = await uploadTeamLogo(supabase!, teamId, blob, "image/webp");
      setTeams((prev) => prev?.map((t) => (t.id === teamId ? { ...t, logoUrl: url } : t)) ?? prev);
      setNotice(`Logo uploaded (${Math.max(1, Math.round(blob.size / 1024))} KB after optimising).`);
    });
  }

  function onRemoveLogo() {
    if (!selected) return;
    const teamId = selected.id;
    void run(async () => {
      await clearTeamLogo(supabase!, teamId);
      setTeams((prev) => prev?.map((t) => (t.id === teamId ? { ...t, logoUrl: null } : t)) ?? prev);
    }, "Logo removed.");
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-xl border border-wicket/40 bg-[#FDECEA] px-4 py-3 font-medium text-wicket">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-pitch/30 bg-pitch-tint px-4 py-3 font-medium text-pitch">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="All teams" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          {teams === null ? (
            <p className="text-muted">Loading teams…</p>
          ) : teams.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-muted">
              No teams yet. Create the first one with the form.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTeam(t.id)}
                  aria-pressed={t.id === selectedId}
                  className={`flex items-center gap-3 rounded-2xl bg-white p-4 text-left ${t.id === selectedId ? "border-2 border-pitch ring-4 ring-pitch/10" : "border border-line"}`}
                >
                  <Badge team={t} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-bold">{t.name}</span>
                    <span className="text-[13px] text-muted">
                      {t.playerCount} player{t.playerCount === 1 ? "" : "s"}
                      {t.homeGround ? ` · ${t.homeGround}` : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-[22px]">
              {editingTeam ? (
                <form onSubmit={onSaveTeam} className="flex flex-col gap-4" aria-label={`Edit ${selected.name}`}>
                  <h2 className="font-display text-[26px] font-bold uppercase">Edit team</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_2fr]">
                    <label className={labelClass}>
                      Team name
                      <input className={inputClass} value={editingTeam.name} required minLength={2} onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })} />
                    </label>
                    <label className={labelClass}>
                      Short code
                      <input className={`${inputClass} uppercase`} value={editingTeam.shortCode} required maxLength={3} onChange={(e) => setEditingTeam({ ...editingTeam, shortCode: e.target.value })} />
                    </label>
                    <label className={labelClass}>
                      Home ground
                      <input className={inputClass} value={editingTeam.ground} onChange={(e) => setEditingTeam({ ...editingTeam, ground: e.target.value })} />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <Badge team={selected} size={64} />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-medium text-ink-soft">Team logo</span>
                      <div className="flex flex-wrap gap-2">
                        <label className={`${secondaryBtn} inline-flex cursor-pointer items-center`}>
                          {selected.logoUrl ? "Replace logo" : "Upload logo"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="sr-only"
                            disabled={busy}
                            onChange={(e) => {
                              onLogoChosen(e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {selected.logoUrl && (
                          <button type="button" onClick={onRemoveLogo} disabled={busy} className={secondaryBtn}>
                            Remove logo
                          </button>
                        )}
                      </div>
                      <span className="text-[13px] text-muted">Resized to 512 px and compressed to under 1 MB before upload.</span>
                    </div>
                  </div>
                  <ColorPicker value={editingTeam.color} onChange={(c) => setEditingTeam({ ...editingTeam, color: c })} />
                  <div className="flex gap-2.5">
                    <button type="submit" disabled={busy} className={primaryBtn}>Save team</button>
                    <button type="button" onClick={() => setEditingTeam(null)} className={secondaryBtn}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge team={selected} size={52} />
                    <div>
                      <h2 className="font-display text-[26px] font-bold uppercase">{selected.name} squad</h2>
                      {selected.homeGround && <p className="text-sm text-muted">{selected.homeGround}</p>}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      className={secondaryBtn}
                      onClick={() =>
                        setEditingTeam({ name: selected.name, shortCode: selected.shortCode, ground: selected.homeGround ?? "", color: selected.color })
                      }
                    >
                      Edit team
                    </button>
                  )}
                </div>
              )}

              {players.length === 0 ? (
                <p className="text-muted">No players yet.</p>
              ) : (
                <ul className="divide-y divide-line-soft">
                  {players.map((p) =>
                    editingPlayer?.id === p.id ? (
                      <li key={p.id} className="py-3">
                        <form onSubmit={onSavePlayer} aria-label={`Edit ${p.name}`} className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-[2fr_1.4fr_0.7fr_2fr_auto]">
                          <label className={labelClass}>
                            Name
                            <input className={inputClass} value={editingPlayer.name} required onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })} />
                          </label>
                          <label className={labelClass}>
                            Role
                            <RoleSelect value={editingPlayer.role} onChange={(r) => setEditingPlayer({ ...editingPlayer, role: r })} />
                          </label>
                          <label className={labelClass}>
                            Shirt no.
                            <input className={inputClass} inputMode="numeric" value={editingPlayer.shirt} onChange={(e) => setEditingPlayer({ ...editingPlayer, shirt: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
                          </label>
                          <label className={labelClass}>
                            Email (private)
                            <input className={inputClass} type="email" value={editingPlayer.email} placeholder="player@example.com" onChange={(e) => setEditingPlayer({ ...editingPlayer, email: e.target.value })} />
                          </label>
                          <div className="flex gap-2">
                            <button type="submit" disabled={busy} className={primaryBtn}>Save</button>
                            <button type="button" onClick={() => setEditingPlayer(null)} className={secondaryBtn}>Cancel</button>
                          </div>
                        </form>
                      </li>
                    ) : (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <span className="flex min-w-0 flex-col">
                          <span className="font-bold">
                            {p.shirtNumber !== null && <span className="mr-2 font-display text-lg text-muted">#{p.shirtNumber}</span>}
                            {p.name}
                          </span>
                          {canEdit && <span className="truncate text-[13px] text-muted">{p.email ?? "No email"}</span>}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="rounded-md bg-pitch-tint px-2 py-1 text-[13px] font-medium text-pitch">
                            {PLAYER_ROLES.find((r) => r.value === p.role)?.label}
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              aria-label={`Edit ${p.name}`}
                              onClick={() =>
                                setEditingPlayer({ id: p.id, name: p.name, role: p.role, shirt: p.shirtNumber?.toString() ?? "", email: p.email ?? "" })
                              }
                              className="min-h-11 rounded-[10px] px-3 font-bold text-pitch hover:bg-pitch-tint"
                            >
                              Edit
                            </button>
                          )}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              )}
              {canEdit ? (
                <form onSubmit={onAddPlayer} className="flex flex-wrap items-end gap-2.5 border-t border-line-soft pt-4">
                  <label className={`${labelClass} flex-[2_1_180px]`}>
                    Player name
                    <input className={inputClass} value={playerName} onChange={(e) => setPlayerName(e.target.value)} required />
                  </label>
                  <label className={`${labelClass} flex-[1_1_140px]`}>
                    Role
                    <RoleSelect value={role} onChange={setRole} />
                  </label>
                  <label className={`${labelClass} flex-[2_1_200px]`}>
                    Email (optional, private)
                    <input className={inputClass} type="email" value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} placeholder="player@example.com" />
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="min-h-11 rounded-[10px] border border-pitch bg-white px-[18px] font-bold text-pitch disabled:opacity-50"
                  >
                    + Add player
                  </button>
                </form>
              ) : (
                <p className="text-sm text-muted">Only this team&apos;s creator can add or edit players.</p>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby="add-h" className="flex min-w-0 flex-[1_1_340px] flex-col gap-4 rounded-[20px] border border-line bg-white p-6">
          <h2 id="add-h" className="font-display text-[26px] font-bold uppercase">Add a team</h2>
          <form onSubmit={onCreateTeam} className="flex flex-col gap-4">
            <label className={labelClass}>
              Team name
              <input className={inputClass} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Westside Royals" required minLength={2} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Short code
                <input
                  className={`${inputClass} uppercase`}
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value)}
                  maxLength={3}
                  placeholder={defaultShortCode(teamName) || "WR"}
                />
              </label>
              <label className={labelClass}>
                Home ground
                <input className={inputClass} value={ground} onChange={(e) => setGround(e.target.value)} />
              </label>
            </div>
            <ColorPicker value={color} onChange={setColor} />
            <button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-pitch text-base font-bold text-white disabled:opacity-50">
              Create team
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
