-- Story 025: one cloud save per player. Run in the Supabase SQL editor (or `supabase db push`).
-- Players sign in with email + password (Supabase Auth; 6-digit codes confirm the email and reset the password). Row-level security: each player reads and writes only their row.

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data text not null check (length(data) <= 400000),   -- the SB1 backup code (story 020)
  version int not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "read own save" on public.saves;
create policy "read own save" on public.saves for select to authenticated using (auth.uid() = user_id);

drop policy if exists "insert own save" on public.saves;
create policy "insert own save" on public.saves for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "update own save" on public.saves;
create policy "update own save" on public.saves for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own save" on public.saves;
create policy "delete own save" on public.saves for delete to authenticated using (auth.uid() = user_id);

-- "Delete my account and cloud save": the browser only has the public anon key, which can't delete users, so this
-- function (running with the owner's rights) deletes exactly the caller's own user. The save row goes with it (cascade).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
