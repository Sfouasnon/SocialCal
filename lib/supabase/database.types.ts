export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          availability_status: "free" | "busy" | "oot" | "maybe";
          google_calendar_synced: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          availability_status?: "free" | "busy" | "oot" | "maybe";
          google_calendar_synced?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          color: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          owner_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["groups"]["Insert"]>;
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: never;
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          location: string | null;
          starts_at: string;
          ends_at: string | null;
          creator_id: string;
          group_id: string | null;
          visibility: "public" | "group" | "invite";
          max_attendees: number | null;
          event_type: "hangout" | "sport" | "hike" | "trip" | "other";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          location?: string | null;
          starts_at: string;
          ends_at?: string | null;
          creator_id: string;
          group_id?: string | null;
          visibility?: "public" | "group" | "invite";
          max_attendees?: number | null;
          event_type?: "hangout" | "sport" | "hike" | "trip" | "other";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      event_attendees: {
        Row: {
          event_id: string;
          user_id: string;
          status: "going" | "maybe" | "declined";
          joined_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          status?: "going" | "maybe" | "declined";
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_attendees"]["Insert"]>;
      };
      friendships: {
        Row: {
          requester_id: string;
          addressee_id: string;
          status: "pending" | "accepted";
          created_at: string;
        };
        Insert: {
          requester_id: string;
          addressee_id: string;
          status?: "pending" | "accepted";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["friendships"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// Convenience types used throughout the app
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventAttendee = Database["public"]["Tables"]["event_attendees"]["Row"];

export type EventWithDetails = Event & {
  creator: Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;
  group: Pick<Group, "id" | "name" | "color"> | null;
  attendees: Array<{
    user: Pick<Profile, "id" | "full_name" | "avatar_url">;
    status: EventAttendee["status"];
  }>;
  my_rsvp: EventAttendee["status"] | null;
};
