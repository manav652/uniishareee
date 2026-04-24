
-- =====================================================
-- PROFILES
-- =====================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  university text,
  branch text,
  year text,
  bio text,
  avatar_url text,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, university)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'university', split_part(new.email, '@', 2))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- LISTINGS
-- =====================================================
create type public.listing_category as enum (
  'computer_science', 'electronics', 'mechanical', 'civil',
  'electrical', 'business', 'design', 'other'
);

create type public.listing_type as enum ('sale', 'free');
create type public.listing_status as enum ('active', 'sold', 'archived');

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  price numeric(10,2) not null default 0,
  category public.listing_category not null,
  listing_type public.listing_type not null default 'sale',
  status public.listing_status not null default 'active',
  images text[] not null default '{}',
  file_url text,
  tags text[] not null default '{}',
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings enable row level security;

create policy "Listings are viewable by everyone"
  on public.listings for select using (true);

create policy "Authenticated users can create listings"
  on public.listings for insert with check (auth.uid() = seller_id);

create policy "Owners can update their listings"
  on public.listings for update using (auth.uid() = seller_id);

create policy "Owners can delete their listings"
  on public.listings for delete using (auth.uid() = seller_id);

create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create index listings_category_idx on public.listings(category);
create index listings_seller_idx on public.listings(seller_id);
create index listings_created_idx on public.listings(created_at desc);

-- =====================================================
-- FAVORITES
-- =====================================================
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, listing_id)
);

alter table public.favorites enable row level security;

create policy "Users can view own favorites"
  on public.favorites for select using (auth.uid() = user_id);

create policy "Users can add favorites"
  on public.favorites for insert with check (auth.uid() = user_id);

create policy "Users can remove own favorites"
  on public.favorites for delete using (auth.uid() = user_id);

-- =====================================================
-- CONVERSATIONS + MESSAGES
-- =====================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(listing_id, buyer_id, seller_id)
);

alter table public.conversations enable row level security;

create policy "Participants can view their conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Authenticated users can start conversations"
  on public.conversations for insert
  with check (auth.uid() = buyer_id);

create policy "Participants can update their conversations"
  on public.conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create index conversations_buyer_idx on public.conversations(buyer_id);
create index conversations_seller_idx on public.conversations(seller_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Conversation participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
    )
  );

create policy "Conversation participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
    )
  );

create policy "Senders can update read flag on received messages"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
    )
  );

create index messages_conversation_idx on public.messages(conversation_id, created_at);

-- Bump conversation last_message_at
create or replace function public.bump_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation();

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter table public.messages replica identity full;
alter table public.conversations replica identity full;

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('listing-files', 'listing-files', false)
on conflict (id) do nothing;

create policy "Listing images publicly readable"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "Authenticated users can upload listing images"
  on storage.objects for insert
  with check (bucket_id = 'listing-images' and auth.role() = 'authenticated');

create policy "Users can update own listing images"
  on storage.objects for update
  using (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own listing images"
  on storage.objects for delete
  using (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Owners can read own listing files"
  on storage.objects for select
  using (bucket_id = 'listing-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Authenticated users can upload listing files"
  on storage.objects for insert
  with check (bucket_id = 'listing-files' and auth.role() = 'authenticated' and auth.uid()::text = (storage.foldername(name))[1]);
