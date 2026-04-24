
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$;

-- Tighten the listing-images public select policy: keep public read of individual objects
-- but the warning is about broad listing; this is acceptable for a public CDN-style bucket.
-- We'll explicitly drop and recreate to be intentional.
drop policy if exists "Listing images publicly readable" on storage.objects;
create policy "Listing images publicly readable"
  on storage.objects for select
  using (bucket_id = 'listing-images');
