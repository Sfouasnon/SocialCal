import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  fetchFeedEvents,
  fetchFeedFriends,
} from "@/lib/events/feed";
import FeedClient from "./FeedClient";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [events, friends] = await Promise.all([
    fetchFeedEvents(supabase, user.id),
    fetchFeedFriends(supabase, user.id),
  ]);

  return (
    <FeedClient
      initialEvents={events}
      friends={friends}
      currentUserId={user.id}
    />
  );
}
