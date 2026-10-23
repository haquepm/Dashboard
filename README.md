# Crescent Contractors – Management Dashboard

Separate application for the Crescent Contractors Management Backend and MD Room Executive Dashboard.

## Environment variables

Configure these in Vercel Project Settings (never commit secrets):

```env
NEXT_PUBLIC_SUPABASE_URL=https://eoenpqmztgwxnvtajsje.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_GUTG5b4KTt-i8P9d5hnsGg_Z8tJ59K4
```

Supabase project: `crescent-project-dashboard` (Mumbai / ap-south-1).

The schema has been provisioned with RLS and audit logging. No users, project master records, or live operational figures have been seeded. Create the first authorised admin user in Supabase Auth, then create a matching `public.profiles` row with `role = 'admin'` using a trusted SQL/editor operation.

## Run

```bash
npm install
npm run dev
```

Deploy through Vercel with this repository as the source and `/` as the project root.
