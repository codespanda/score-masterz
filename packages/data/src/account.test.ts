import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { checkPassword, toAccount } from "./account";

const user = (over: Partial<User>): User =>
  ({ id: "u1", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "", ...over }) as User;

describe("toAccount", () => {
  it("treats an anonymous user without email as a guest", () => {
    expect(toAccount(user({ is_anonymous: true }))).toMatchObject({ isGuest: true, email: null, needsPassword: false });
  });

  it("shows a pending email during sign-up", () => {
    expect(toAccount(user({ is_anonymous: true, new_email: "a@b.co" }))).toMatchObject({ isGuest: true, pendingEmail: "a@b.co" });
  });

  it("asks for a password once the email is verified", () => {
    expect(toAccount(user({ email: "a@b.co", user_metadata: { name: "Deepak" } }))).toMatchObject({
      isGuest: false,
      name: "Deepak",
      needsPassword: true,
    });
  });

  it("is a full account once a password is set", () => {
    expect(toAccount(user({ email: "a@b.co", user_metadata: { password_set: true } })).needsPassword).toBe(false);
  });
});

describe("checkPassword", () => {
  it("needs 8+ characters and a matching confirmation", () => {
    expect(() => checkPassword("short", "short")).toThrow(/8 characters/);
    expect(() => checkPassword("longenough", "different1")).toThrow(/match/);
    expect(() => checkPassword("longenough", "longenough")).not.toThrow();
  });
});
