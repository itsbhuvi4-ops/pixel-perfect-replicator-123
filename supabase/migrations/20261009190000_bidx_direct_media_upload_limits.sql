-- Permit direct player media uploads without client-side compression.
-- Run against the Supabase project connected to this deployment.
update storage.buckets
set file_size_limit = 524288000,
    allowed_mime_types = array['video/mp4','video/webm','video/quicktime']
where id = 'player-videos';

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'player-photos';
