-- Montez Milhas: schema inicial
-- Execute este arquivo no SQL Editor do projeto Supabase.

create extension if not exists pgcrypto;

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  source_name text not null,
  source_url text not null,
  title text not null,
  category text not null check (category in ('transferencia', 'passagem', 'compra_milhas')),
  details text,
  collected_at timestamptz not null,
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offers_status_category_idx on public.offers (status, category);
create index if not exists offers_collected_at_idx on public.offers (collected_at desc);
create index if not exists offers_expires_at_idx on public.offers (expires_at);

create table if not exists public.collection_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  source_count integer not null default 0,
  offers_found integer not null default 0,
  offers_saved integer not null default 0,
  status text not null check (status in ('success', 'partial', 'failed')),
  message text
);

alter table public.offers enable row level security;
alter table public.collection_runs enable row level security;

-- Leitura pública apenas das ofertas ativas. Escrita fica restrita à chave secreta do worker.
drop policy if exists "Public can read active offers" on public.offers;
create policy "Public can read active offers"
  on public.offers for select
  to anon, authenticated
  using (status = 'active');

-- Histórico de execuções não é público.
