begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select has_column('public', 'asset_registration_evidence', 'capture_source', 'capture source is recorded');
select has_column('public', 'asset_registration_evidence', 'content_sha256', 'content hash is recorded');
select has_column('public', 'asset_registration_evidence', 'ocr_engine', 'OCR engine is recorded');
select has_column('public', 'asset_registration_evidence', 'ocr_confidence', 'OCR confidence is recorded');
select has_column('public', 'asset_registration_evidence', 'ocr_page_count', 'OCR page count is recorded');
select has_column('public', 'asset_registration_evidence', 'storage_state', 'two-phase storage state is recorded');

select col_default_is('public', 'asset_registration_evidence', 'capture_source', 'upload', 'uploads remain the safe default capture source');
select col_default_is('public', 'asset_registration_evidence', 'ocr_page_count', '1', 'single-page evidence remains the safe default');
select col_default_is('public', 'asset_registration_evidence', 'storage_state', 'ready', 'legacy evidence remains ready by default');
select is((select file_size_limit from storage.buckets where id = 'asset-evidence'), 15728640::bigint, 'evidence bucket enforces the 15 MiB ceiling');
select is(
  (select allowed_mime_types::text from storage.buckets where id = 'asset-evidence'),
  '{application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif}',
  'evidence bucket permits only reviewed document and image MIME types'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'asset_registration_evidence'
      and policyname = 'asset_registration_evidence_update'
      and cmd = 'UPDATE'
  ),
  'evidence rows have a controlled update policy'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'asset_evidence_delete_pending'
      and cmd = 'DELETE'
  ),
  'pending evidence objects have least-privilege rollback deletion'
);
select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'asset_evidence_update'
  ),
  'ready evidence objects cannot be overwritten'
);
select has_trigger(
  'public',
  'asset_registration_evidence',
  'asset_registration_evidence_guard_immutable',
  'evidence provenance has an immutability trigger'
);
select throws_ok(
  $$ insert into public.asset_registration_evidence
      (organization_id, draft_id, uploaded_by, evidence_type, file_name, mime_type, storage_path, capture_source)
     values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'asset_photo', 'x.jpg', 'image/jpeg', 'x', 'unknown') $$,
  '23514', null, 'unknown capture sources are rejected'
);
select throws_ok(
  $$ insert into public.asset_registration_evidence
      (organization_id, draft_id, uploaded_by, evidence_type, file_name, mime_type, storage_path, content_sha256)
     values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'asset_photo', 'x.jpg', 'image/jpeg', 'x', 'not-a-sha') $$,
  '23514', null, 'malformed content hashes are rejected'
);
select throws_ok(
  $$ insert into public.asset_registration_evidence
      (organization_id, draft_id, uploaded_by, evidence_type, file_name, mime_type, storage_path, ocr_confidence)
     values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'asset_photo', 'x.jpg', 'image/jpeg', 'x', 1.1) $$,
  '23514', null, 'out-of-range OCR confidence is rejected'
);

select throws_ok(
  $$ insert into public.asset_registration_evidence
      (organization_id, draft_id, uploaded_by, evidence_type, file_name, mime_type, storage_path, storage_state)
     values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'asset_photo', 'x.jpg', 'image/jpeg', 'x', 'orphaned') $$,
  '23514', null, 'unknown storage states are rejected'
);
select * from finish();
rollback;
