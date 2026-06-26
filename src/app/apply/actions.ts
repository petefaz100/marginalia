"use server";

import { createClient } from "@/lib/supabase/server";
import type { ModApplicantRole } from "@/lib/supabase/types";

type Result = { ok: boolean; message?: string };

const ROLES: ModApplicantRole[] = ["artist", "author", "reader"];

// Submit a "become a mod" application. The /apply form is public, so this works
// whether or not the visitor is signed in — we attach their profile id when we
// have one, but never require it. The application lands in mod_applications,
// which only mods can read (RLS). This is the "message to the mods."
export async function submitApplication(
  formData: FormData,
): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!name) return { ok: false, message: "Please tell us your name." };
  if (name.length > 120)
    return { ok: false, message: "That name is too long." };
  // A light email shape check — not authentication, just a sanity guard.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, message: "Please enter a valid email address." };
  if (email.length > 200)
    return { ok: false, message: "That email is too long." };
  if (!reason)
    return { ok: false, message: "Please tell us why you'd like to be a mod." };
  if (reason.length > 4000)
    return { ok: false, message: "That message is too long." };
  if (!ROLES.includes(role as ModApplicantRole))
    return { ok: false, message: "Please pick which best describes you." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("mod_applications").insert({
    name,
    email,
    reason,
    role: role as ModApplicantRole,
    created_by: user?.id ?? null,
  });
  if (error) {
    return {
      ok: false,
      message: "Couldn't send that just now — please try again.",
    };
  }

  return { ok: true };
}
