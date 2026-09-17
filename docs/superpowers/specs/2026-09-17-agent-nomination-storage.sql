insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agent-nominations',
  'agent-nominations',
  false,
  10485760,
  array['image/jpeg','image/png','application/pdf']
);
