
CREATE POLICY "player uploads own photo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'player-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "player reads photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'player-photos');
CREATE POLICY "player uploads own video" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'player-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "player reads videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'player-videos');
