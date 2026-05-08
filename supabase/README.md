# EDHtrack Supabase Schema

This directory contains the database schema and seed files for the Supabase backend of EDHtrack.

## Files

- `schema.sql`: Contains the definitions for all tables, functions, triggers, and Row Level Security (RLS) policies.
- `seed.sql`: Contains optional default values for game types and winning conditions.

## How to use

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase Dashboard.
3. Open `schema.sql`, copy its entire content, and run it in the SQL Editor.
4. (Optional) Open `seed.sql`, copy its content, and run it to pre-fill some game types.

## Security (RLS)

All tables in the database are protected by **Row Level Security (RLS)**. 
- The frontend client uses the Supabase Anon Key, which only grants access to what RLS policies allow.
- Only authenticated users who are explicitly listed in the `allowed_users` table can read or write match data.
- Only administrators (where `is_admin = true` in `allowed_users`) can invite other users or view the app configuration.
- The repository owner is automatically granted admin rights upon their first login, provided the correct GitHub username was entered during the initial app setup.
