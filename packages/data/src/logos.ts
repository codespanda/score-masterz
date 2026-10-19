import type { SupabaseClient } from "@supabase/supabase-js";

import { check } from "./auth";

export const LOGO_BUCKET = "team-logos";
/** Largest logo the bucket accepts. Apps resize and compress before uploading. */
export const MAX_LOGO_BYTES = 1024 * 1024;
/** Longest side of a stored logo, in pixels. */
export const LOGO_SIZE = 512;

/**
 * Uploads an already-optimised logo for a team and saves its public URL on the team.
 * Each upload gets a new file name, so browsers and CDNs never show a stale logo.
 */
export async function uploadTeamLogo(
  client: SupabaseClient,
  teamId: string,
  data: Blob | ArrayBuffer,
  contentType: "image/webp" | "image/png" | "image/jpeg",
): Promise<string> {
  const size = data instanceof ArrayBuffer ? data.byteLength : data.size;
  if (size > MAX_LOGO_BYTES) {
    throw new Error(`Logo is ${(size / 1024 / 1024).toFixed(1)} MB after compression; the limit is 1 MB.`);
  }
  const ext = contentType === "image/webp" ? "webp" : contentType === "image/png" ? "png" : "jpg";
  const path = `${teamId}/logo-${Date.now()}.${ext}`;

  const upload = await client.storage.from(LOGO_BUCKET).upload(path, data, { contentType, upsert: false });
  if (upload.error) {
    if (/bucket not found/i.test(upload.error.message)) {
      throw new Error("Logo storage isn't set up yet. Run the team_logos migration in the Supabase SQL editor.");
    }
    if (/row-level security|unauthorized|403/i.test(upload.error.message)) {
      // Keep Supabase's wording too, so a policy problem isn't mistaken for a permissions one.
      throw new Error(`Only the team's creator can change its logo (${upload.error.message}).`);
    }
    throw new Error(`Uploading logo: ${upload.error.message}`);
  }

  const url = client.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
  const row = check(
    await client.from("teams").update({ logo_url: url }).eq("id", teamId).select("id").maybeSingle(),
    "Saving logo",
  );
  if (!row) throw new Error("Only the team's creator can change its logo.");
  return url;
}

/** Removes the logo from the team (the file itself stays, so old links don't break mid-match). */
export async function clearTeamLogo(client: SupabaseClient, teamId: string): Promise<void> {
  check(await client.from("teams").update({ logo_url: null }).eq("id", teamId), "Removing logo");
}
