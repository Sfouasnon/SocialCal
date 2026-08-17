import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  EventCommentWithUser,
  EventWithDetails,
  Profile,
} from "@/lib/supabase/database.types";

export type FeedFriendProfile = Pick<
  Profile,
  "id" | "full_name" | "username" | "avatar_url" | "availability_status"
>;

const FEED_EVENT_SELECT = `
  *,
  creator:profiles!events_creator_id_fkey(id, full_name, username, avatar_url),
  group:groups(id, name, color),
  attendees:event_attendees(
    status,
    user:profiles!event_attendees_user_id_fkey(id, full_name, avatar_url)
  ),
  top_comments:event_comments(
    id, event_id, user_id, content, created_at,
    user:profiles!event_comments_user_id_fkey(id, full_name, username, avatar_url),
    reactions:comment_reactions(id, comment_id, user_id, emoji, created_at)
  )
`;

type FeedEventRow = Omit<
  EventWithDetails,
  "attendees" | "my_rsvp" | "top_comments"
> & {
  attendees: EventWithDetails["attendees"] | null;
  top_comments: EventCommentWithUser[] | null;
};

type SentFriendRow = {
  addressee: FeedFriendProfile | null;
};

type ReceivedFriendRow = {
  requester: FeedFriendProfile | null;
};

function isFeedFriendProfile(
  profile: FeedFriendProfile | null
): profile is FeedFriendProfile {
  return profile !== null;
}

export function normalizeFeedEvents(
  rows: FeedEventRow[],
  currentUserId: string
): EventWithDetails[] {
  return rows.map((event) => {
    const attendees = event.attendees ?? [];
    const topComments = [...(event.top_comments ?? [])]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 2)
      .reverse();

    return {
      ...event,
      attendees,
      my_rsvp:
        attendees.find((attendee) => attendee.user?.id === currentUserId)
          ?.status ?? null,
      top_comments: topComments,
    };
  });
}

export async function fetchFeedEvents(
  supabase: SupabaseClient<Database>,
  currentUserId: string
): Promise<EventWithDetails[]> {
  const { data, error } = await supabase
    .from("events")
    .select(FEED_EVENT_SELECT)
    .order("starts_at", { ascending: true })
    .limit(50);

  if (error) {
    throw error;
  }

  return normalizeFeedEvents((data ?? []) as unknown as FeedEventRow[], currentUserId);
}

export async function fetchFeedEventById(
  supabase: SupabaseClient<Database>,
  currentUserId: string,
  eventId: string
): Promise<EventWithDetails | null> {
  const { data, error } = await supabase
    .from("events")
    .select(FEED_EVENT_SELECT)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeFeedEvents([data as unknown as FeedEventRow], currentUserId)[0] ?? null;
}

export async function fetchFeedFriends(
  supabase: SupabaseClient<Database>,
  currentUserId: string
): Promise<FeedFriendProfile[]> {
  const [sentFriends, receivedFriends] = await Promise.all([
    supabase
      .from("friend_requests")
      .select(
        "addressee:profiles!friend_requests_addressee_id_fkey(id, full_name, username, avatar_url, availability_status)"
      )
      .eq("requester_id", currentUserId)
      .eq("status", "accepted"),
    supabase
      .from("friend_requests")
      .select(
        "requester:profiles!friend_requests_requester_id_fkey(id, full_name, username, avatar_url, availability_status)"
      )
      .eq("addressee_id", currentUserId)
      .eq("status", "accepted"),
  ]);

  if (sentFriends.error) {
    throw sentFriends.error;
  }
  if (receivedFriends.error) {
    throw receivedFriends.error;
  }

  return [
    ...((sentFriends.data ?? []) as unknown as SentFriendRow[]).map(
      (friend) => friend.addressee
    ),
    ...((receivedFriends.data ?? []) as unknown as ReceivedFriendRow[]).map(
      (friend) => friend.requester
    ),
  ].filter(isFeedFriendProfile);
}
