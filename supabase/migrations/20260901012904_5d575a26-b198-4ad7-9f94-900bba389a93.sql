create policy "Covers readable" on storage.objects for select using (bucket_id = 'covers');
create policy "Covers insertable" on storage.objects for insert with check (bucket_id = 'covers');
create policy "Covers updatable" on storage.objects for update using (bucket_id = 'covers');
create policy "Covers deletable" on storage.objects for delete using (bucket_id = 'covers');