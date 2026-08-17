import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/database.types";

function profileFromUser(user: User): Profile {
  const metadata = user.user_metadata;
  const rawUsername =
    typeof metadata.username === "string"
      ? metadata.username
      : user.email?.split("@")[0] ?? "user";
  const username =
    rawUsername
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || `user_${user.id.slice(0, 8)}`;

  return {
    id: user.id,
    username,
    full_name:
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
          ? metadata.name
          : user.email ?? null,
    avatar_url:
      typeof metadata.avatar_url === "string"
        ? metadata.avatar_url
        : typeof metadata.picture === "string"
          ? metadata.picture
          : null,
    availability_status: "free",
    google_calendar_synced: false,
    created_at: user.created_at,
    updated_at: user.updated_at ?? user.created_at,
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <AppShell profile={profile ?? profileFromUser(user)} groups={groups ?? []}>
      {children}
    </AppShell>
  );
}
