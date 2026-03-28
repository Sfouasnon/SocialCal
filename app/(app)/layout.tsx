import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user ? await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single() : { data: null };

  const { data: groups } = user ? await supabase
    .from("groups")
    .select("*, group_members!inner(user_id)")
    .eq("group_members.user_id", user.id) : { data: [] };

  return (
    <AppShell profile={profile} groups={groups ?? []}>
      {children}
    </AppShell>
  );
}