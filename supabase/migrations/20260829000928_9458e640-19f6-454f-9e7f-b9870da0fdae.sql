CREATE POLICY "Anyone can read roms" ON storage.objects FOR SELECT USING (bucket_id = 'roms');
CREATE POLICY "Anyone can upload roms" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'roms');
CREATE POLICY "Anyone can update roms" ON storage.objects FOR UPDATE USING (bucket_id = 'roms');
CREATE POLICY "Anyone can delete roms" ON storage.objects FOR DELETE USING (bucket_id = 'roms');