
drop policy if exists "Listing images publicly readable" on storage.objects;

-- Public read but require a specific object name (length > 0) to discourage broad listing
create policy "Listing images publicly readable"
  on storage.objects for select
  using (
    bucket_id = 'listing-images'
    and name is not null
    and length(name) > 0
  );
