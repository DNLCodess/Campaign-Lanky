insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('gallery', 'gallery', true, 52428800,
    array['image/webp','video/mp4','video/quicktime','video/webm']),
  ('gallery-originals', 'gallery-originals', false, 52428800,
    array['image/jpeg','image/png','image/webp','image/heic','image/heif']);
