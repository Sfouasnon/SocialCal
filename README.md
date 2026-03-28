# SocialCal

> Plan things with friends. Actually.

A social calendar app where you post events, friends join, and everyone can see who's free — without the group chat chaos.

## Stack

- **Next.js 14** (App Router) — web + future mobile
- **Supabase** — auth, database (PostgreSQL), real-time sync
- **Tailwind CSS** — styling
- **Vercel** — deployment (recommended)

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/Sfouasnon/SocialCal.git
cd SocialCal
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Fill in your Supabase URL and anon key
```

### 3. Run the database schema

1. Go to your [Supabase dashboard](https://supabase.com/dashboard)
2. Open your project → **SQL Editor** → **New query**
3. Paste the contents of `supabase/schema.sql` and click **Run**

### 4. Enable Google Auth (optional but recommended)

In Supabase → **Authentication → Providers → Google**:
- Add your Google OAuth credentials
- Add `http://localhost:3000/auth/callback` to redirect URLs

### 5. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

## Deploying to Vercel

```bash
npx vercel
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel env vars
```

Then add your Vercel URL to Supabase → **Authentication → URL Configuration → Redirect URLs**.

## Feature roadmap

- [x] Event feed with real-time sync
- [x] RSVP (going / maybe)
- [x] Event types: sport, hike, trip, hangout
- [x] Visibility: public / group / invite
- [x] Friend availability panel (free / busy / OOT / maybe)
- [x] PWA — installable on iPhone/Android
- [ ] Calendar view (month/week grid)
- [ ] Groups management
- [ ] Push notifications
- [ ] Google Calendar sync for availability
- [ ] Friend requests
- [ ] Event comments/chat

## Project structure

```
socialcal/
├── app/
│   ├── (app)/          # Authenticated app routes
│   │   ├── feed/       # Main event feed
│   │   ├── events/new/ # Post new event
│   │   ├── calendar/   # Calendar view (coming soon)
│   │   ├── groups/     # Groups (coming soon)
│   │   └── profile/    # User profile + availability
│   ├── auth/           # Login, callback
│   └── layout.tsx      # Root layout
├── components/
│   ├── events/         # EventCard, FriendPanel
│   └── layout/         # AppShell (sidebar + bottom nav)
├── lib/
│   └── supabase/       # Client, server, types
└── supabase/
    └── schema.sql      # Full database schema
```
