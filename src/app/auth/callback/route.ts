import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase redirects here after a successful OAuth sign-in, carrying a one-time
// `code`. We exchange it for a session (stored in cookies) and send the reader
// on to wherever they were headed.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // First-time readers have no public username yet — send them to set one
      // before they land anywhere they might want to post. We pass the original
      // destination along as ?next so they continue there after choosing.
      let dest = next;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        if (!profile?.username) {
          dest = `/account?next=${encodeURIComponent(next)}`;
        }
      }

      // In production behind a proxy, prefer the forwarded host.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${dest}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${dest}`);
      } else {
        return NextResponse.redirect(`${origin}${dest}`);
      }
    }
  }

  // Something went wrong — bounce home with an error flag the UI can read.
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
