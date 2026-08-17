import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  const requestedNext = searchParams.get("next") ?? "/feed";
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/feed";

  if (providerError) {
    const message = encodeURIComponent(providerError);
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth_failed&message=${message}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    const message = encodeURIComponent(error.message);
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth_failed&message=${message}`
    );
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
