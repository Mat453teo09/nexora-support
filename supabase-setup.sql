-- ============================================================
-- NEXORA Support — setup sincronizzazione multi-dispositivo
--
-- Come usarlo (2 minuti):
--   1. Crea un progetto gratuito su https://supabase.com
--   2. Apri "SQL Editor" → incolla tutto questo script → "Run"
--   3. In "Project Settings → API" copia Project URL e anon public key
--   4. Incollali nelle Impostazioni del pannello NEXORA → "Collega cloud"
-- ============================================================

-- Stato dell'applicazione: UNA sola riga (id = 'app_state') che contiene
-- operatori, clienti e conversazioni in formato JSON.
create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Presenza dello staff: UNA riga per membro. Ogni dispositivo aggiorna
-- solo la propria riga (heartbeat), senza sovrascrivere il lavoro altrui.
create table if not exists public.app_presence (
  user_id text primary key,
  online boolean not null default false,
  last_seen timestamptz not null default now()
);

-- La chiave "anon" di Supabase è pubblica (viaggia nel codice del sito):
-- attiviamo RLS e permettiamo l'accesso SOLO a queste due tabelle
-- applicative, mai alle tabelle di sistema.
alter table public.app_state enable row level security;
alter table public.app_presence enable row level security;

drop policy if exists "nexora_app_state_access" on public.app_state;
create policy "nexora_app_state_access"
  on public.app_state
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "nexora_app_presence_access" on public.app_presence;
create policy "nexora_app_presence_access"
  on public.app_presence
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Allegati delle chat (immagini e file) su Supabase Storage:
-- bucket pubblico in lettura, scrittura libera per la chiave anon.
insert into storage.buckets (id, name, public)
values ('nexora-attachments', 'nexora-attachments', true)
on conflict (id) do nothing;

drop policy if exists "nexora_attachments_access" on storage.objects;
create policy "nexora_attachments_access"
  on storage.objects
  for all
  to anon, authenticated
  using (bucket_id = 'nexora-attachments')
  with check (bucket_id = 'nexora-attachments');

-- Fatto! Torna nel pannello NEXORA → Impostazioni → "Collega cloud".
