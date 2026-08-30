begin;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  locale text not null default 'ar-AE' check (locale in ('ar-AE','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_slug text not null check (char_length(service_slug) between 1 and 240),
  service_name text not null check (char_length(service_name) between 1 and 240),
  status text not null default 'saved' check (status in ('saved','preparing','submitted','completed','cancelled')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, service_slug)
);
alter table public.profiles enable row level security;
alter table public.user_transactions enable row level security;
revoke all on public.profiles from anon;
revoke all on public.user_transactions from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_transactions to authenticated;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);
drop policy if exists "transactions_select_own" on public.user_transactions;
create policy "transactions_select_own" on public.user_transactions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "transactions_insert_own" on public.user_transactions;
create policy "transactions_insert_own" on public.user_transactions for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "transactions_update_own" on public.user_transactions;
create policy "transactions_update_own" on public.user_transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "transactions_delete_own" on public.user_transactions;
create policy "transactions_delete_own" on public.user_transactions for delete to authenticated using ((select auth.uid()) = user_id);
create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.user_transactions;
create trigger transactions_set_updated_at before update on public.user_transactions for each row execute function public.set_updated_at();
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name',''),100),'')) on conflict (id) do nothing;
  return new;
end; $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
commit;
