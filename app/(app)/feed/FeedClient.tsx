import { createClient } from "@/lib/supabase/server";
import FeedClient from "./FeedClient";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: events } = await supabase
    .from("events")
    .select(`
      *,
      creator:profiles!events_creator_id_fkey(id, full_name, username, avatar_url),
      group:groups(id, name, color),
      attendees:event_attendees(
        status,
        user:profiles!event_attendees_user_id_fkey(id, full_name, avatar_url)
      )
    `)
    .eq("visibility", "public")
    .order("starts_at", { ascending: true })
    .limit(50);

  const enriched = (events ?? []).map((e) => ({
    ...e,
    my_rsvp: e.attendees?.find(
      (a: { user: { id: string }; status: string }) => a.user?.id === user?.id
    )?.status ?? null,
  }));

  // Load friends for availability panel
  const friends: never[] = [];

  return (
    <FeedClient
      initialEvents={enriched}
      friends={friends}
      currentUserId={user?.id ?? ""}
    />
  );
}
