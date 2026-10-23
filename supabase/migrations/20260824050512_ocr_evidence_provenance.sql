alter table public.asset_registration_evidence
  add column if not exists capture_source text not null default 'upload',
  add column if not exists content_sha256 text,
  add column if not exists ocr_engine text,
  add column if not exists ocr_confidence numeric(5,4),
  add column if not exists ocr_page_count smallint not null default 1;

alter table public.asset_registration_evidence
  drop constraint if exists asset_registration_evidence_capture_source_check,
  add constraint asset_registration_evidence_capture_source_check
    check (capture_source in ('native_scan', 'native_camera', 'upload', 'manual')),
  drop constraint if exists asset_registration_evidence_content_sha256_check,
  add constraint asset_registration_evidence_content_sha256_check
    check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  drop constraint if exists asset_registration_evidence_ocr_engine_check,
  add constraint asset_registration_evidence_ocr_engine_check
    check (ocr_engine is null or ocr_engine in ('android_mlkit_v2', 'ios_vision', 'browser_detector', 'manual')),
  drop constraint if exists asset_registration_evidence_ocr_confidence_check,
  add constraint asset_registration_evidence_ocr_confidence_check
    check (ocr_confidence is null or (ocr_confidence >= 0 and ocr_confidence <= 1)),
  drop constraint if exists asset_registration_evidence_ocr_page_count_check,
  add constraint asset_registration_evidence_ocr_page_count_check
    check (ocr_page_count between 1 and 5);

create index if not exists asset_registration_evidence_hash_lookup_idx
  on public.asset_registration_evidence (organization_id, draft_id, content_sha256)
  where content_sha256 is not null;

comment on column public.asset_registration_evidence.capture_source is
  'Auditable capture channel. Native cache locations and device identifiers are intentionally excluded.';
comment on column public.asset_registration_evidence.content_sha256 is
  'Lowercase SHA-256 of the uploaded evidence bytes for integrity and duplicate review.';
comment on column public.asset_registration_evidence.ocr_engine is
  'On-device OCR engine identifier. Raw OCR text is restricted to raw_extraction and excluded from activity logs.';
comment on column public.asset_registration_evidence.ocr_confidence is
  'Normalized aggregate OCR confidence when the native engine reports confidence.';
comment on column public.asset_registration_evidence.ocr_page_count is
  'Number of captured pages represented by this evidence record, constrained to the mobile scan limit.';

update storage.buckets
set file_size_limit = 15728640,
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ]::text[]
where id = 'asset-evidence';
alter table public.asset_registration_evidence
  add column if not exists storage_state text not null default 'ready';

alter table public.asset_registration_evidence
  drop constraint if exists asset_registration_evidence_storage_state_check,
  add constraint asset_registration_evidence_storage_state_check
    check (storage_state in ('pending_upload', 'ready')),
  drop constraint if exists asset_registration_evidence_raw_extraction_length_check,
  add constraint asset_registration_evidence_raw_extraction_length_check
    check (raw_extraction is null or char_length(raw_extraction) <= 8000);

create index if not exists asset_registration_evidence_pending_upload_idx
  on public.asset_registration_evidence (uploaded_by, created_at)
  where storage_state = 'pending_upload';

create or replace function private.guard_asset_registration_evidence_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.draft_id is distinct from old.draft_id
    or new.uploaded_by is distinct from old.uploaded_by
    or new.evidence_type is distinct from old.evidence_type
    or new.file_name is distinct from old.file_name
    or new.mime_type is distinct from old.mime_type
    or new.storage_path is distinct from old.storage_path
    or new.capture_source is distinct from old.capture_source
    or new.content_sha256 is distinct from old.content_sha256
    or new.ocr_engine is distinct from old.ocr_engine
    or new.ocr_confidence is distinct from old.ocr_confidence
    or new.ocr_page_count is distinct from old.ocr_page_count
    or new.extracted_fields is distinct from old.extracted_fields
    or new.raw_extraction is distinct from old.raw_extraction
    or new.created_at is distinct from old.created_at then
    raise exception 'Evidence bytes and provenance are immutable; create a new evidence record.'
      using errcode = '23514';
  end if;

  if new.storage_state is distinct from old.storage_state
    and (select auth.uid()) is distinct from old.uploaded_by then
    raise exception 'Only the evidence uploader may finalize its pending upload.'
      using errcode = '42501';
  end if;

  if new.extraction_state is distinct from old.extraction_state
    and not (
      old.storage_state = 'ready'
      and old.extraction_state = 'review_required'
      and new.extraction_state = 'applied'
    ) then
    raise exception 'Evidence extraction state may only advance from reviewed to applied.'
      using errcode = '23514';
  end if;
  if old.storage_state = 'ready' and new.storage_state <> 'ready' then
    raise exception 'Ready evidence cannot return to a pending state.'
      using errcode = '23514';
  end if;

  if old.storage_state = 'pending_upload' and new.storage_state not in ('pending_upload', 'ready') then
    raise exception 'Invalid evidence storage transition.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists asset_registration_evidence_guard_immutable
  on public.asset_registration_evidence;
create trigger asset_registration_evidence_guard_immutable
before update on public.asset_registration_evidence
for each row execute function private.guard_asset_registration_evidence_update();

drop policy if exists asset_registration_evidence_insert on public.asset_registration_evidence;
create policy asset_registration_evidence_insert
on public.asset_registration_evidence for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and organization_id = private.current_organization_id()
  and content_sha256 is not null
  and storage_state = 'pending_upload'
  and exists (
    select 1
    from public.asset_registration_drafts draft
    where draft.id = draft_id
      and draft.organization_id = organization_id
      and draft.owner_id = (select auth.uid())
  )
);

drop policy if exists asset_registration_evidence_update on public.asset_registration_evidence;
create policy asset_registration_evidence_update
on public.asset_registration_evidence for update to authenticated
using (
  organization_id = private.current_organization_id()
  and storage_state in ('pending_upload', 'ready')
  and (
    uploaded_by = (select auth.uid())
    or public.is_office_admin()
  )
)
with check (
  organization_id = private.current_organization_id()
  and storage_state in ('pending_upload', 'ready')
  and (
    uploaded_by = (select auth.uid())
    or public.is_office_admin()
  )
);

drop policy if exists asset_registration_evidence_delete_pending on public.asset_registration_evidence;
create policy asset_registration_evidence_delete_pending
on public.asset_registration_evidence for delete to authenticated
using (
  uploaded_by = (select auth.uid())
  and organization_id = private.current_organization_id()
  and storage_state = 'pending_upload'
);

drop policy if exists asset_evidence_insert on storage.objects;
create policy asset_evidence_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'asset-evidence'
  and exists (
    select 1
    from public.asset_registration_evidence evidence
    where evidence.storage_path = name
      and evidence.uploaded_by = (select auth.uid())
      and evidence.organization_id = private.current_organization_id()
      and evidence.storage_state = 'pending_upload'
  )
);

drop policy if exists asset_evidence_update on storage.objects;

drop policy if exists asset_evidence_delete_pending on storage.objects;
create policy asset_evidence_delete_pending
on storage.objects for delete to authenticated
using (
  bucket_id = 'asset-evidence'
  and exists (
    select 1
    from public.asset_registration_evidence evidence
    where evidence.storage_path = name
      and evidence.uploaded_by = (select auth.uid())
      and evidence.organization_id = private.current_organization_id()
      and evidence.storage_state = 'pending_upload'
  )
);

comment on column public.asset_registration_evidence.storage_state is
  'Two-phase upload state. Pending rows authorize one immutable Storage insert; ready rows are visible business evidence.';
comment on column public.asset_registration_evidence.content_sha256 is
  'Official-client SHA-256 recomputed from the uploaded File immediately before the immutable upload. It supports transport integrity and duplicate review but is not device attestation.';
comment on column public.asset_registration_evidence.capture_source is
  'Client-reported capture channel for workflow audit. It is immutable after insert but is not cryptographic device attestation.';
