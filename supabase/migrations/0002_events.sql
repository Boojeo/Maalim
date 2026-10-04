-- Anonymous, opt-in aggregate progress counters (no user identifiers, day granularity only).
create table progress_events (
  id         bigint generated always as identity primary key,
  concept_id text not null references concepts(id) on delete cascade,
  kind       text not null check (kind in ('unit_done', 'check_correct', 'check_wrong')),
  day        date not null default current_date
);
alter table progress_events enable row level security; -- service role only
