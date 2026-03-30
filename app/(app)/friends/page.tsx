import { createClient } from "@/lib/supabase/server";
import FriendsClient from "./FriendsClient";

export default async function FriendsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // My accepted friends
  const { data: sentFriends } = await supabase
    .from("friend_requests")
    .select("*, addressee:profiles!friend_requests_addressee_id_fkey(id, full_name, username, avatar_url, availability_status)")
    .eq("requester_id", user?.id ?? "")
    .eq("status", "accepted");

  const { data: receivedFriends } = await supabase
    .from("friend_requests")
    .select("*, requester:profiles!friend_requests_requester_id_fkey(id, full_name, username, avatar_url, availability_status)")
    .eq("addressee_id", user?.id ?? "")
    .eq("status", "accepted");

  // Pending requests I received
  const { data: pendingReceived } = await supabase
    .from("friend_requests")
    .select("*, requester:profiles!friend_requests_requester_id_fkey(id, full_name, username, avatar_url)")
    .eq("addressee_id", user?.id ?? "")
    .eq("status", "pending");

  // Pending requests I sent
  const { data: pendingSent } = await supabase
    .from("friend_requests")
    .select("*, addressee:profiles!friend_requests_addressee_id_fkey(id, full_name, username, avatar_url)")
    .eq("requester_id", user?.id ?? "")
    .eq("status", "pending");

  const friends = [
    ...(sentFriends ?? []).map((f) => f.addressee),
    ...(receivedFriends ?? []).map((f) => f.requester),
  ].filter(Boolean);

  return (
    <FriendsClient
      currentUserId={user?.id ?? ""}
      friends={friends as never[]}
      pendingReceived={pendingReceived ?? []}
      pendingSent={pendingSent ?? []}
    />
  );
}
