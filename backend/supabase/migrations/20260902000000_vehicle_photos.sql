-- Vehicle photo thumbnails (Garage screen). Photos live in a public
-- Storage bucket -- not sensitive data, just a picture of the car -- but
-- writes are still scoped to the owning user via storage policies.
-- Upload path convention enforced by the app: {user_id}/{vehicle_id}.jpg

alter table vehicles add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', true)
on conflict (id) do nothing;

create policy "vehicle-photos: public read"
  on storage.objects for select
  using (bucket_id = 'vehicle-photos');

create policy "vehicle-photos: owner can upload"
  on storage.objects for insert
  with check (bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "vehicle-photos: owner can update"
  on storage.objects for update
  using (bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "vehicle-photos: owner can delete"
  on storage.objects for delete
  using (bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = auth.uid()::text);
