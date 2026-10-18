"use client";

import {
  PLAYER_ROLES,
  addPlayer,
  createTeam,
  defaultShortCode,
  ensureSession,
  listPlayers,
  listTeams,
  type Player,
  type PlayerRole,
  type Team,
} from "@score-masterz/data";
import { teamColors } from "@score-masterz/tokens";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { getSupabase } from "@/lib/supabase";

const inputClass =
  "min-h-11 rounded-[10px] border border-[#C7D2CA] bg-white px-3 text-[15px] outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/30";
const labelClass = "flex flex-col gap-1.5 text-[13px] font-medium text-ink-soft";

function Badge({ team, size = 44 }: { team: Pick<Team, "shortCode" | "color">; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl font-display font-bold text-white"
      style={{ width: size, height: size, backgroundColor: team.color, fontSize: Math.round(size * 0.42) }}
    >
      {team.shortCode}
    </span>
  );
}

export function TeamsManager() {
  const supabase = getSupabase();
  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [ground, setGround] = useState("");
  const [color, setColor] = useState<string>(teamColors[0].value);

  const [playerName, setPlayerName] = useState("");
  const [role, setRole] = useState<PlayerRole>("batter");

  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
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

  function onCreateTeam(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const team = await createTeam(supabase!, { name: teamName, shortCode, color, homeGround: ground });
      setTeams((prev) => [...(prev ?? []), team].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(team.id);
      setTeamName("");
      setShortCode("");
      setGround("");
    });
  }

  function onAddPlayer(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    void run(async () => {
      const player = await addPlayer(supabase!, selected.id, { name: playerName, role });
      setPlayers((prev) => [...prev, player].sort((a, b) => a.name.localeCompare(b.name)));
      setTeams((prev) => prev?.map((t) => (t.id === selected.id ? { ...t, playerCount: t.playerCount + 1 } : t)) ?? prev);
      setPlayerName("");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-xl border border-wicket/40 bg-[#FDECEA] px-4 py-3 font-medium text-wicket">
          {error}
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
                  onClick={() => setSelectedId(t.id)}
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
              <div className="flex items-center gap-3">
                <Badge team={selected} size={52} />
                <h2 className="font-display text-[26px] font-bold uppercase">{selected.name} squad</h2>
              </div>
              {players.length === 0 ? (
                <p className="text-muted">No players yet.</p>
              ) : (
                <ul className="divide-y divide-line-soft">
                  {players.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-3">
                      <span className="font-bold">{p.name}</span>
                      <span className="rounded-md bg-pitch-tint px-2 py-1 text-[13px] font-medium text-pitch">
                        {PLAYER_ROLES.find((r) => r.value === p.role)?.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {canEdit ? (
                <form onSubmit={onAddPlayer} className="flex flex-wrap items-end gap-2.5 border-t border-line-soft pt-4">
                  <label className={`${labelClass} flex-[2_1_200px]`}>
                    Player name
                    <input className={inputClass} value={playerName} onChange={(e) => setPlayerName(e.target.value)} required />
                  </label>
                  <label className={`${labelClass} flex-[1_1_150px]`}>
                    Role
                    <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as PlayerRole)}>
                      {PLAYER_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
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
                <p className="text-sm text-muted">Only this team&apos;s creator can add players.</p>
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
            <fieldset className="flex flex-col gap-2">
              <legend className="pb-2 text-[13px] font-medium text-ink-soft">Team colour</legend>
              <div className="flex flex-wrap gap-2.5">
                {teamColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-label={c.name}
                    aria-pressed={color === c.value}
                    onClick={() => setColor(c.value)}
                    className={`h-11 w-11 rounded-full border-[3px] ${color === c.value ? "border-white ring-[3px] ring-ink" : "border-transparent"}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </fieldset>
            <button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-pitch text-base font-bold text-white disabled:opacity-50">
              Create team
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
