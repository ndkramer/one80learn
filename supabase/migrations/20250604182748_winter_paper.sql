/*
  # Storage policies for PDF slides

  1. Changes
    - Create storage objects table for tracking file metadata
    - Set up RLS policies for file access control
    - Configure public read access and instructor-only write access
  
  2. Security
    - Enable RLS on objects table
    - Public read access for PDF files
    - Write access restricted to authenticated instructors
*/

-- Create a table to track file metadata
create table if not exists public.storage_objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null check (bucket_id = 'slides-pdf'),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  size bigint,
  mime_type text,
  metadata jsonb default '{}'::jsonb,
  path text not null unique
);

-- Enable RLS
alter table public.storage_objects enable row level security;

-- Create a function to update updated_at timestamp
create or replace function update_updated_at_storage_objects()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger update_storage_objects_updated_at
  before update on public.storage_objects
  for each row
  execute function update_updated_at_storage_objects();

-- Policy for public read access
create policy "Public can view all files"
  on public.storage_objects
  for select
  using (true);

-- Policy for instructor uploads
create policy "Instructors can upload files"
  on public.storage_objects
  for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.classes
      where instructor_id = auth.uid()
    )
  );

-- Policy for instructor updates
create policy "Instructors can update their files"
  on public.storage_objects
  for update
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.classes
      where instructor_id = auth.uid()
    )
    and owner_id = auth.uid()
  );

-- Policy for instructor deletions
create policy "Instructors can delete their files"
  on public.storage_objects
  for delete
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.classes
      where instructor_id = auth.uid()
    )
    and owner_id = auth.uid()
  );

-- Create index for faster lookups
create index idx_storage_objects_owner on public.storage_objects(owner_id);
create index idx_storage_objects_path on public.storage_objects(path);