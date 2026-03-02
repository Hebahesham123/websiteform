# Sample Inquiries Dashboard (Next.js + React)

Professional dashboard for **sample_inquiries** with real-time updates. Built with Next.js 14, React, and Supabase.

## Features

- **Simple, user-friendly UI** – Clean layout with one header and a single table
- **Status per submission** – Choose status for each row: New, Contacted, In progress, Completed, Cancelled. Changes save to Supabase.
- **Click any row** – Opens a detail panel with all fields and a status dropdown
- **Live updates** – New submissions appear automatically; status changes sync in real time
- **Stats** – Total, today, and this week
- **Search, sort, limit** – Filter and paginate the table
- **Serial No.** – First column shows row number (1, 2, 3…) by current order
- **Filter by status** – Dropdown “Filter by status” to show only New, Reached, Done, Cancelled, or Not reached
- **Export** – Green “Export” button downloads the current list (search + status filter) as CSV

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**  
   `.env.local` is already set with your Supabase URL and anon key. To change them, edit `.env.local` (see `.env.example` for the variable names).

3. **Run the app**
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3000](http://localhost:3000)** in your browser.

4. **Sign in**  
   You must sign in with an **admin** or **call center** account (see `supabase-auth-and-roles.sql` and `supabase-add-mahmoud-heba.sql` to create users). Until you sign in, you will only see the login screen.

## Activity log (who changed what)

To see **Activity** (status and comment changes) in each submission’s detail panel, create the activity table and policies. In Supabase **SQL Editor**, run the contents of **`supabase-activity-log.sql`**. If you skip this, the Activity section will show an error or “No edits yet” and changes won’t be logged.

## Enable Realtime

In Supabase: **Database → Replication** → enable **sample_inquiries** for the `supabase_realtime` publication.

Or run in the SQL Editor:
```sql
alter publication supabase_realtime add table sample_inquiries;
```

## Status column and RLS

1. **Add the status column** (run in Supabase SQL Editor):  
   See `supabase-add-status.sql`. It adds a `status` column and a policy so the dashboard can update it.

2. **If the dashboard cannot read rows**, add a select policy:
```sql
create policy "Allow public read for dashboard"
  on sample_inquiries for select
  using (true);
```
