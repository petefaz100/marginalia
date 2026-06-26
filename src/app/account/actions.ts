"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateUsername } from "@/lib/username";

export type UsernameCheck =
  | { ok: true; message: string }
  | { ok: false; message: string };

// Live availability check for the username field. Runs the shared shape rules
// first, then a case-insensitive lookup against existing usernames. Profiles are
// publicly readable, so a normal query is enough; we ignore the caller's own
// current username so re-saving an unchanged name doesn't report "taken".
export async function checkUsername(raw: string): Promise<UsernameCheck> {
  const name = raw.trim();
  const shapeError = validateUsername(name);
  if (shapeError) return { ok: false, message: shapeError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", name)
    .maybeSingle();

  if (taken && taken.id !== user?.id) {
    return { ok: false, message: "That username is already taken." };
  }
  return { ok: true, message: "This username is available." };
}

// Saves the chosen username to the signed-in reader's profile. Re-validates the
// shape, then relies on the case-insensitive unique index to settle races: if
// two people grab the same name at once, one insert wins and the other gets a
// 23505 we translate into a friendly "already taken".
export async function setUsername(
  raw: string,
): Promise<{ ok: boolean; message: string }> {
  const name = raw.trim();
  const shapeError = validateUsername(name);
  if (shapeError) return { ok: false, message: shapeError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ username: name })
    .eq("id", user.id);

  if (error) {
    // 23505 = unique_violation on profiles_username_lower_idx.
    if (error.code === "23505") {
      return { ok: false, message: "That username is already taken." };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Username saved." };
}
