-- =============================================
-- RecruitFlow AI — Supabase Schema
-- Run this in the Supabase SQL editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- TABLE: chat_sessions
-- =============================================
create table if not exists public.chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  transcript jsonb not null default '[]'::jsonb,
  turn_count int not null default 0,
  completion_state text not null default 'in_progress'
    check (completion_state in ('in_progress','completed','abandoned','needs_recruiter')),
  ip_hash text,
  user_agent text
);

-- =============================================
-- TABLE: candidates
-- =============================================
create table if not exists public.candidates (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  full_name text,
  email text,
  phone text,
  role_interest text,
  experience_level text check (experience_level in ('junior','mid','senior','lead', null)),
  years_experience numeric,
  location text,
  work_mode text check (work_mode in ('onsite','hybrid','remote', null)),
  availability text check (availability in ('immediate','2_weeks','1_month','3_months_plus','not_looking','declined', null)),
  salary_expectation text,
  skills jsonb default '[]'::jsonb,
  resume_source text check (resume_source in ('upload','structured_qa', null)),
  resume_path text,
  resume_parsed jsonb,
  status text not null default 'pending'
    check (status in ('pending','qualified','needs_review','rejected')),
  score numeric,
  score_breakdown jsonb,
  reason text,
  needs_recruiter boolean not null default false,
  recruiter_notes text,
  consent_at timestamptz,
  session_id uuid references public.chat_sessions(id) on delete set null
);

-- =============================================
-- TABLE: screening_criteria
-- =============================================
create table if not exists public.screening_criteria (
  id uuid primary key default uuid_generate_v4(),
  role text not null,
  criteria jsonb not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- =============================================
-- TABLE: audit_log
-- =============================================
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid references public.candidates(id) on delete cascade,
  actor text not null default 'system',
  action text not null,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table public.chat_sessions enable row level security;
alter table public.candidates enable row level security;
alter table public.screening_criteria enable row level security;
alter table public.audit_log enable row level security;

-- Anon can insert into chat_sessions (widget)
create policy "anon_insert_sessions" on public.chat_sessions
  for insert to anon with check (true);

-- Authenticated recruiters can read everything
create policy "recruiter_all_sessions" on public.chat_sessions
  for all to authenticated using (true) with check (true);

create policy "recruiter_all_candidates" on public.candidates
  for all to authenticated using (true) with check (true);

create policy "recruiter_read_criteria" on public.screening_criteria
  for select to authenticated using (true);

create policy "recruiter_all_audit" on public.audit_log
  for all to authenticated using (true) with check (true);

-- Service role bypasses RLS entirely (used server-side)

-- =============================================
-- SEED: Default screening criteria
-- =============================================
insert into public.screening_criteria (role, criteria, active) values
(
  'Senior Backend Engineer',
  '{
    "description": "Develop and manage scalable microservices and APIs.",
    "role": "Senior Backend Engineer",
    "min_years": 5,
    "required_skills": ["Python", "PostgreSQL"],
    "work_mode": "remote",
    "office_location": null
  }'::jsonb,
  true
),
(
  'Frontend Engineer',
  '{
    "description": "Build high performance user interfaces.",
    "role": "Frontend Engineer",
    "min_years": 2,
    "required_skills": ["React", "TypeScript", "Next.js"],
    "work_mode": "hybrid",
    "office_location": "London"
  }'::jsonb,
  true
);

-- =============================================
-- STORAGE: Resume bucket (private)
-- =============================================
-- Run this separately or use the Supabase console:
-- insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false);
