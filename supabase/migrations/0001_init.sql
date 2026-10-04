-- Ma'ālim schema (PLAN.md section 4). Embedding dimension 1024 (bge-m3 class models).
create extension if not exists vector;

create type content_level as enum ('L1', 'L2', 'L3', 'L4');
create type item_status as enum ('draft', 'approved', 'rejected');

create table concepts (
  id           text primary key,
  slug         text unique not null,
  title_ar     text not null,
  title_en     text not null,
  level        content_level not null,
  stage        int not null default 1 check (stage between 0 and 3),
  ord          int not null,
  objectives_en jsonb not null default '[]',
  reviewed_by  text
);

create table prerequisites (
  concept_id  text not null references concepts(id) on delete cascade,
  requires_id text not null references concepts(id) on delete cascade,
  primary key (concept_id, requires_id),
  check (concept_id <> requires_id)
);

-- Verified source text only. Rows with verified = false are visible to the service role only.
create table passages (
  id          text primary key,
  concept_id  text not null references concepts(id) on delete cascade,
  lang        text not null check (lang in ('ar', 'en')),
  source      text not null check (source in ('quranenc', 'hadeethenc', 'islamhouse')),
  source_id   text not null,
  source_url  text not null,
  text        text not null,
  level       content_level not null,
  verified    boolean not null default false,
  verified_by text,
  verified_on date,
  embedding   vector(1024)
);
create index passages_concept_lang_idx on passages (concept_id, lang);
create index passages_embedding_idx on passages using hnsw (embedding vector_cosine_ops);

create table videos (
  id                  text primary key,
  concept_id          text not null references concepts(id) on delete cascade,
  kind                text not null check (kind in ('lesson', 'scenario', 'reference')),
  title_ar            text,
  url                 text,               -- encoded clip URL (Storage or /videos/...)
  duration            int,                -- seconds
  captions_ar         text,               -- VTT URL
  captions_en         text,
  license             text,
  permission          text not null default 'pending',
  creator_credit      text,
  timestamps_verified boolean not null default false,
  steps               jsonb not null default '[]',
  reviewed_by         text
);

create table units (
  id            text primary key,
  concept_id    text not null references concepts(id) on delete cascade,
  hook_ar       text,
  hook_en       text,
  steps         jsonb not null default '[]',
  check_item_id text,
  misconception_ar text,
  misconception_en text,
  ord           int not null,
  verified      boolean not null default false,
  reviewed_by   text
);

create table items (
  id                text primary key,
  concept_id        text not null references concepts(id) on delete cascade,
  type              text not null check (type in ('mcq', 'order', 'scenario')),
  lang              text not null check (lang in ('ar', 'en')),
  prompt            text not null,
  options           jsonb not null default '[]',
  answer            jsonb not null,
  source_passage_id text references passages(id),
  source_span       text,
  video_id          text references videos(id),
  status            item_status not null default 'draft',
  generated_by      text,
  reviewed_by       text,
  reviewed_on       date
);
create index items_concept_status_idx on items (concept_id, status);

create table explanations_cache (
  concept_id text not null references concepts(id) on delete cascade,
  level      content_level not null,
  lang       text not null check (lang in ('ar', 'en')),
  query_hash text not null default '',
  text       text not null,
  citations  jsonb not null default '[]',
  status     text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now(),
  primary key (concept_id, level, lang, query_hash)
);

-- No user identifiers anywhere (CLAUDE.md rule 6).
create table referrals (
  id                uuid primary key default gen_random_uuid(),
  concept_id        text references concepts(id),
  question_hash     text not null,
  level             content_level not null,
  consented_summary text not null,
  created_at        timestamptz not null default now(),
  status            text not null default 'new' check (status in ('new', 'seen', 'closed'))
);

create table review_queue (
  id          uuid primary key default gen_random_uuid(),
  item_id     text not null references items(id) on delete cascade,
  decision    text check (decision in ('approved', 'rejected')),
  reviewer    text,
  note        text,
  decided_at  timestamptz
);

-- Cosine similarity search used by lib/retrieval.ts (verified passages only).
create or replace function match_passages(
  query_embedding vector(1024),
  p_concept text,
  p_lang text,
  p_limit int default 5
) returns table (id text, similarity float)
language sql stable as $$
  select p.id, 1 - (p.embedding <=> query_embedding) as similarity
  from passages p
  where p.verified = true
    and p.concept_id = p_concept
    and p.lang = p_lang
    and p.embedding is not null
  order by p.embedding <=> query_embedding
  limit p_limit;
$$;

-- Row level security: learners (anon) read only learner-safe rows; all writes go through the service role.
alter table concepts enable row level security;
alter table prerequisites enable row level security;
alter table passages enable row level security;
alter table videos enable row level security;
alter table units enable row level security;
alter table items enable row level security;
alter table explanations_cache enable row level security;
alter table referrals enable row level security;
alter table review_queue enable row level security;

create policy "anon read concepts" on concepts for select using (true);
create policy "anon read prerequisites" on prerequisites for select using (true);
create policy "anon read verified passages" on passages for select using (verified = true);
create policy "anon read granted videos" on videos for select using (permission = 'granted');
create policy "anon read verified units" on units for select using (verified = true);
create policy "anon read approved items" on items for select using (status = 'approved');
create policy "anon read approved explanations" on explanations_cache for select using (status = 'approved');
-- referrals, review_queue: no anon policy => service role only.
