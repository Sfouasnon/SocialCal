import { createClient } from "@/lib/supabase/server";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user ? await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single() : { data: null };

  return <ProfileClient profile={profile} userId={user?.id ?? ""} />;
}