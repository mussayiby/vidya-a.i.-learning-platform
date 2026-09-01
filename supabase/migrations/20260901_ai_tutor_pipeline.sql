-- ============================================================
-- VIDYA A.I. — REAL AI TUTOR PIPELINE
-- ============================================================
-- Builds on the existing:
--   public.ai_lessons
--   public.ai_lesson_media
--
-- Does NOT delete or recreate existing tables.
-- ============================================================


-- ============================================================
-- 1. AI LESSON PROCESSING JOBS
-- ============================================================

create table if not exists public.ai_lesson_processing_jobs (
  id uuid not null default gen_random_uuid(),

  lesson_id uuid not null,
  source_media_id uuid null,

  job_type text not null default 'full_lesson',

  status text not null default 'queued',

  progress_percent integer not null default 0,

  current_stage text null,

  error_message text null,

  provider text null,

  provider_job_id text null,

  started_at timestamp with time zone null,
  completed_at timestamp with time zone null,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint ai_lesson_processing_jobs_pkey
    primary key (id),

  constraint ai_lesson_processing_jobs_lesson_id_fkey
    foreign key (lesson_id)
    references public.ai_lessons(id)
    on delete cascade,

  constraint ai_lesson_processing_jobs_source_media_id_fkey
    foreign key (source_media_id)
    references public.ai_lesson_media(id)
    on delete set null,

  constraint ai_lesson_processing_jobs_type_check
    check (
      job_type = any (
        array[
          'full_lesson'::text,
          'transcription'::text,
          'translation'::text,
          'voice_generation'::text,
          'video_generation'::text,
          'remedial_lesson'::text
        ]
      )
    ),

  constraint ai_lesson_processing_jobs_status_check
    check (
      status = any (
        array[
          'queued'::text,
          'processing'::text,
          'completed'::text,
          'failed'::text,
          'cancelled'::text
        ]
      )
    ),

  constraint ai_lesson_processing_jobs_progress_check
    check (
      progress_percent >= 0
      and progress_percent <= 100
    )
);


create index if not exists
  ai_lesson_processing_jobs_lesson_id_idx
on public.ai_lesson_processing_jobs(lesson_id);


create index if not exists
  ai_lesson_processing_jobs_status_idx
on public.ai_lesson_processing_jobs(status);


-- ============================================================
-- 2. AI-DETECTED LESSON TOPICS
-- ============================================================
-- The AI will create these from the teacher's uploaded lesson.
--
-- Example:
--
-- Topic 1 → 00:00 - 03:42
-- Topic 2 → 03:42 - 07:15
-- Topic 3 → 07:15 - 11:08
--
-- No topics are hardcoded.
-- ============================================================

create table if not exists public.ai_lesson_topics (
  id uuid not null default gen_random_uuid(),

  lesson_id uuid not null,

  topic_number integer not null,

  title text not null,

  summary text null,

  transcript text null,

  start_time_seconds numeric not null default 0,

  end_time_seconds numeric null,

  source_language text not null,

  status text not null default 'detected',

  mastery_threshold numeric not null default 0.70,

  created_at timestamp with time zone not null default now(),

  updated_at timestamp with time zone not null default now(),

  constraint ai_lesson_topics_pkey
    primary key (id),

  constraint ai_lesson_topics_lesson_id_fkey
    foreign key (lesson_id)
    references public.ai_lessons(id)
    on delete cascade,

  constraint ai_lesson_topics_topic_number_check
    check (topic_number >= 1),

  constraint ai_lesson_topics_time_check
    check (
      start_time_seconds >= 0
      and (
        end_time_seconds is null
        or end_time_seconds >= start_time_seconds
      )
    ),

  constraint ai_lesson_topics_status_check
    check (
      status = any (
        array[
          'detected'::text,
          'processing'::text,
          'ready'::text,
          'failed'::text
        ]
      )
    ),

  constraint ai_lesson_topics_mastery_threshold_check
    check (
      mastery_threshold > 0
      and mastery_threshold <= 1
    ),

  constraint ai_lesson_topics_unique_number
    unique (lesson_id, topic_number)
);


create index if not exists
  ai_lesson_topics_lesson_id_idx
on public.ai_lesson_topics(lesson_id);


-- ============================================================
-- 3. TOPIC TRANSLATIONS
-- ============================================================
-- One topic can have many translations.
--
-- English teacher:
--   Topic 1
--      ↓
--   Hindi
--   Kannada
--   Telugu
--   Tamil
--   etc.
--
-- Translation is generated dynamically by the AI/API.
-- ============================================================

create table if not exists public.ai_lesson_topic_translations (
  id uuid not null default gen_random_uuid(),

  topic_id uuid not null,

  language_code text not null,

  translated_title text null,

  translated_summary text null,

  translated_transcript text null,

  translation_provider text null,

  provider_request_id text null,

  status text not null default 'pending',

  created_at timestamp with time zone not null default now(),

  updated_at timestamp with time zone not null default now(),

  constraint ai_lesson_topic_translations_pkey
    primary key (id),

  constraint ai_lesson_topic_translations_topic_id_fkey
    foreign key (topic_id)
    references public.ai_lesson_topics(id)
    on delete cascade,

  constraint ai_lesson_topic_translations_status_check
    check (
      status = any (
        array[
          'pending'::text,
          'processing'::text,
          'completed'::text,
          'failed'::text
        ]
      )
    ),

  constraint ai_lesson_topic_translations_unique_language
    unique (topic_id, language_code)
);


create index if not exists
  ai_lesson_topic_translations_topic_id_idx
on public.ai_lesson_topic_translations(topic_id);


create index if not exists
  ai_lesson_topic_translations_language_idx
on public.ai_lesson_topic_translations(language_code);


-- ============================================================
-- 4. EXTEND EXISTING MEDIA TABLE
-- ============================================================
-- We keep your existing ai_lesson_media table.
-- These columns tell us what the media represents.
-- ============================================================

alter table public.ai_lesson_media
  add column if not exists topic_id uuid null;

alter table public.ai_lesson_media
  add column if not exists language_code text null;

alter table public.ai_lesson_media
  add column if not exists media_purpose text not null default 'source';

alter table public.ai_lesson_media
  add column if not exists generation_provider text null;

alter table public.ai_lesson_media
  add column if not exists provider_asset_id text null;

alter table public.ai_lesson_media
  add column if not exists is_remedial boolean not null default false;


do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_lesson_media_topic_id_fkey'
  ) then

    alter table public.ai_lesson_media
      add constraint ai_lesson_media_topic_id_fkey
      foreign key (topic_id)
      references public.ai_lesson_topics(id)
      on delete cascade;

  end if;

end $$;


do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_lesson_media_purpose_check'
  ) then

    alter table public.ai_lesson_media
      add constraint ai_lesson_media_purpose_check
      check (
        media_purpose = any (
          array[
            'source'::text,
            'translated_audio'::text,
            'translated_video'::text,
            'avatar_video'::text,
            'remedial_video'::text,
            'remedial_audio'::text
          ]
        )
      );

  end if;

end $$;


create index if not exists
  ai_lesson_media_topic_id_idx
on public.ai_lesson_media(topic_id);


create index if not exists
  ai_lesson_media_language_idx
on public.ai_lesson_media(language_code);


-- ============================================================
-- 5. AI GENERATED QUESTIONS
-- ============================================================
-- Questions are generated from the actual detected topic.
-- ============================================================

create table if not exists public.ai_lesson_questions (
  id uuid not null default gen_random_uuid(),

  lesson_id uuid not null,

  topic_id uuid not null,

  question_number integer not null,

  question_type text not null default 'mcq',

  question_text text not null,

  options jsonb null,

  correct_answer text not null,

  explanation text null,

  difficulty text not null default 'intermediate',

  language_code text not null,

  status text not null default 'ready',

  created_at timestamp with time zone not null default now(),

  updated_at timestamp with time zone not null default now(),

  constraint ai_lesson_questions_pkey
    primary key (id),

  constraint ai_lesson_questions_lesson_id_fkey
    foreign key (lesson_id)
    references public.ai_lessons(id)
    on delete cascade,

  constraint ai_lesson_questions_topic_id_fkey
    foreign key (topic_id)
    references public.ai_lesson_topics(id)
    on delete cascade,

  constraint ai_lesson_questions_number_check
    check (question_number >= 1),

  constraint ai_lesson_questions_type_check
    check (
      question_type = any (
        array[
          'mcq'::text,
          'true_false'::text,
          'fill_blank'::text,
          'short_answer'::text
        ]
      )
    ),

  constraint ai_lesson_questions_difficulty_check
    check (
      difficulty = any (
        array[
          'beginner'::text,
          'intermediate'::text,
          'advanced'::text
        ]
      )
    ),

  constraint ai_lesson_questions_status_check
    check (
      status = any (
        array[
          'generating'::text,
          'ready'::text,
          'failed'::text
        ]
      )
    )
);


create index if not exists
  ai_lesson_questions_topic_id_idx
on public.ai_lesson_questions(topic_id);


create index if not exists
  ai_lesson_questions_lesson_id_idx
on public.ai_lesson_questions(lesson_id);


-- ============================================================
-- 6. STUDENT QUESTION ATTEMPTS
-- ============================================================
-- Stores what the student actually answered.
-- ============================================================

create table if not exists public.ai_lesson_question_attempts (
  id uuid not null default gen_random_uuid(),

  lesson_id uuid not null,

  topic_id uuid not null,

  question_id uuid not null,

  student_id uuid not null,

  selected_answer text null,

  is_correct boolean not null default false,

  score numeric not null default 0,

  attempt_number integer not null default 1,

  answered_at timestamp with time zone not null default now(),

  constraint ai_lesson_question_attempts_pkey
    primary key (id),

  constraint ai_lesson_question_attempts_lesson_id_fkey
    foreign key (lesson_id)
    references public.ai_lessons(id)
    on delete cascade,

  constraint ai_lesson_question_attempts_topic_id_fkey
    foreign key (topic_id)
    references public.ai_lesson_topics(id)
    on delete cascade,

  constraint ai_lesson_question_attempts_question_id_fkey
    foreign key (question_id)
    references public.ai_lesson_questions(id)
    on delete cascade,

  constraint ai_lesson_question_attempts_score_check
    check (
      score >= 0
      and score <= 1
    ),

  constraint ai_lesson_question_attempts_number_check
    check (attempt_number >= 1)
);


create index if not exists
  ai_lesson_question_attempts_student_id_idx
on public.ai_lesson_question_attempts(student_id);


create index if not exists
  ai_lesson_question_attempts_topic_id_idx
on public.ai_lesson_question_attempts(topic_id);


-- ============================================================
-- 7. STUDENT TOPIC PROGRESS
-- ============================================================
-- This controls:
--
-- PASS → continue
-- FAIL → remedial explanation
-- ============================================================

create table if not exists public.ai_lesson_student_progress (
  id uuid not null default gen_random_uuid(),

  lesson_id uuid not null,

  topic_id uuid not null,

  student_id uuid not null,

  status text not null default 'locked',

  attempts_count integer not null default 0,

  correct_answers integer not null default 0,

  total_questions integer not null default 0,

  score numeric not null default 0,

  passed boolean not null default false,

  remedial_required boolean not null default false,

  remedial_completed boolean not null default false,

  completed_at timestamp with time zone null,

  created_at timestamp with time zone not null default now(),

  updated_at timestamp with time zone not null default now(),

  constraint ai_lesson_student_progress_pkey
    primary key (id),

  constraint ai_lesson_student_progress_lesson_id_fkey
    foreign key (lesson_id)
    references public.ai_lessons(id)
    on delete cascade,

  constraint ai_lesson_student_progress_topic_id_fkey
    foreign key (topic_id)
    references public.ai_lesson_topics(id)
    on delete cascade,

  constraint ai_lesson_student_progress_status_check
    check (
      status = any (
        array[
          'locked'::text,
          'available'::text,
          'learning'::text,
          'assessment'::text,
          'passed'::text,
          'remedial'::text,
          'completed'::text
        ]
      )
    ),

  constraint ai_lesson_student_progress_score_check
    check (
      score >= 0
      and score <= 1
    ),

  constraint ai_lesson_student_progress_attempts_check
    check (attempts_count >= 0),

  constraint ai_lesson_student_progress_correct_check
    check (correct_answers >= 0),

  constraint ai_lesson_student_progress_total_check
    check (total_questions >= 0),

  constraint ai_lesson_student_progress_unique
    unique (lesson_id, topic_id, student_id)
);


create index if not exists
  ai_lesson_student_progress_student_id_idx
on public.ai_lesson_student_progress(student_id);


create index if not exists
  ai_lesson_student_progress_lesson_id_idx
on public.ai_lesson_student_progress(lesson_id);


-- ============================================================
-- 8. UPDATE TIMESTAMP FUNCTION
-- ============================================================

create or replace function public.update_ai_tutor_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- 9. UPDATED_AT TRIGGERS
-- ============================================================

drop trigger if exists
  ai_lesson_processing_jobs_updated_at
on public.ai_lesson_processing_jobs;

create trigger
  ai_lesson_processing_jobs_updated_at
before update on public.ai_lesson_processing_jobs
for each row
execute function public.update_ai_tutor_updated_at();


drop trigger if exists
  ai_lesson_topics_updated_at
on public.ai_lesson_topics;

create trigger
  ai_lesson_topics_updated_at
before update on public.ai_lesson_topics
for each row
execute function public.update_ai_tutor_updated_at();


drop trigger if exists
  ai_lesson_topic_translations_updated_at
on public.ai_lesson_topic_translations;

create trigger
  ai_lesson_topic_translations_updated_at
before update on public.ai_lesson_topic_translations
for each row
execute function public.update_ai_tutor_updated_at();


drop trigger if exists
  ai_lesson_media_updated_at
on public.ai_lesson_media;

create trigger
  ai_lesson_media_updated_at
before update on public.ai_lesson_media
for each row
execute function public.update_ai_tutor_updated_at();


drop trigger if exists
  ai_lesson_questions_updated_at
on public.ai_lesson_questions;

create trigger
  ai_lesson_questions_updated_at
before update on public.ai_lesson_questions
for each row
execute function public.update_ai_tutor_updated_at();


drop trigger if exists
  ai_lesson_student_progress_updated_at
on public.ai_lesson_student_progress;

create trigger
  ai_lesson_student_progress_updated_at
before update on public.ai_lesson_student_progress
for each row
execute function public.update_ai_tutor_updated_at();


-- ============================================================
-- END OF AI TUTOR DATABASE FOUNDATION
-- ============================================================