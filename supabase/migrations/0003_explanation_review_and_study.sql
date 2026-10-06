-- Reviewer decisions on cached (generated) explanations, and anonymous A/B study results.
alter table explanations_cache drop constraint if exists explanations_cache_status_check;
alter table explanations_cache add constraint explanations_cache_status_check check (status in ('pending', 'approved', 'rejected'));
alter table explanations_cache add column if not exists reviewed_by text;

-- One row per completed study run. No identifier of any kind: pre and post live in the same row so no pairing id is needed.
create table study_results (
  id           bigint generated always as identity primary key,
  group_code   text not null check (group_code in ('A', 'B')),   -- A = static page, B = Ma'ālim unit
  concept_id   text not null references concepts(id) on delete cascade,
  pre_correct  int not null check (pre_correct >= 0),
  pre_total    int not null check (pre_total > 0),
  post_correct int not null check (post_correct >= 0),
  post_total   int not null check (post_total > 0),
  day          date not null default current_date,
  check (pre_correct <= pre_total and post_correct <= post_total)
);
alter table study_results enable row level security; -- service role only
