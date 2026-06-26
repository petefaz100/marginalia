"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Mark every unread notification in the signed-in reader's inbox as read.
// Called when they open /inbox so the header badge clears. RLS already scopes
// the update to the caller's own rows; the recipient filter is belt-and-braces.
export async function markAllRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  revalidatePath("/inbox");
}
