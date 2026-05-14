-- ============================================================
-- いつクル？ 初期スキーマ (Phase 1)
-- ============================================================
-- このSQLは Supabase の SQL Editor に貼り付けて実行してください。
-- 何度実行しても問題ない（冪等）よう作っています。
-- ============================================================

-- UUIDを生成するための拡張機能
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. profiles: ユーザープロファイル
-- ============================================================
-- auth.users（Supabaseの認証テーブル）と1対1で紐付くプロファイル。
-- 新規ユーザー登録時に自動で作成される（後段のトリガーで実装）。
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'ゲスト',
  region text,
  registered_at timestamptz,            -- 会員登録完了時刻（nullなら匿名ゲスト）
  agreed_to_policy_at timestamptz,      -- 編集ガイドライン同意時刻
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'ユーザーのプロフィール情報。auth.usersと1:1。';
comment on column public.profiles.registered_at is '会員登録完了時刻。NULLならゲスト扱い。優待情報の編集権限の判定に使う。';

-- ============================================================
-- 2. benefits: 株主優待情報
-- ============================================================
-- 誰でも閲覧できる共有データ。会員登録済みユーザーのみが編集可能。
-- 銘柄コードをPRIMARY KEYにすることで「1銘柄1レコード」を保証。
-- ============================================================
create table if not exists public.benefits (
  stock_code text primary key,
  content text not null default '',
  rights_months text not null default '',
  min_shares integer not null default 0,
  long_term_note text,
  yield_percent numeric,
  notes text,
  last_edited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. arrival_reports: 「届いた！」投稿
-- ============================================================
create table if not exists public.arrival_reports (
  id uuid primary key default uuid_generate_v4(),
  stock_code text not null,
  user_id uuid references auth.users(id) on delete set null,
  reporter_name text not null default '匿名',
  region text,
  arrival_date date not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists arrival_reports_stock_code_idx
  on public.arrival_reports(stock_code);
create index if not exists arrival_reports_user_id_idx
  on public.arrival_reports(user_id);
create index if not exists arrival_reports_arrival_date_idx
  on public.arrival_reports(arrival_date);

-- ============================================================
-- 4. usage_reports: 「使った！」投稿
-- ============================================================
create table if not exists public.usage_reports (
  id uuid primary key default uuid_generate_v4(),
  stock_code text not null,
  user_id uuid references auth.users(id) on delete set null,
  reporter_name text not null default '匿名',
  region text,
  used_date date not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists usage_reports_stock_code_idx
  on public.usage_reports(stock_code);
create index if not exists usage_reports_user_id_idx
  on public.usage_reports(user_id);
create index if not exists usage_reports_used_date_idx
  on public.usage_reports(used_date);

-- ============================================================
-- 5. holdings: 保有銘柄
-- ============================================================
-- 「ユーザー × 銘柄コード」の組で1レコード。
-- 株数は1以上のみ許可（保有してないなら行ごと削除する）。
-- ============================================================
create table if not exists public.holdings (
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_code text not null,
  shares integer not null check (shares > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, stock_code)
);

-- ============================================================
-- 6. watchlist: キニナル銘柄
-- ============================================================
create table if not exists public.watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_code text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, stock_code)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
-- 各テーブルでRLSを有効化。デフォルトでは「誰もアクセスできない」状態になり、
-- 下のポリシーで明示的に許可した操作だけが可能になる。
-- ============================================================
alter table public.profiles enable row level security;
alter table public.benefits enable row level security;
alter table public.arrival_reports enable row level security;
alter table public.usage_reports enable row level security;
alter table public.holdings enable row level security;
alter table public.watchlist enable row level security;

-- ----------------------------------------
-- profiles: 表示名等は公開、編集は本人のみ
-- ----------------------------------------
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ----------------------------------------
-- benefits: 誰でも閲覧、会員登録済みのみ編集
-- ----------------------------------------
drop policy if exists "benefits_select_all" on public.benefits;
create policy "benefits_select_all" on public.benefits
  for select using (true);

drop policy if exists "benefits_insert_registered" on public.benefits;
create policy "benefits_insert_registered" on public.benefits
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and registered_at is not null
    )
  );

drop policy if exists "benefits_update_registered" on public.benefits;
create policy "benefits_update_registered" on public.benefits
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and registered_at is not null
    )
  );

-- ----------------------------------------
-- arrival_reports: 閲覧は公開、投稿は認証済みのみ、編集/削除は本人のみ
-- ----------------------------------------
drop policy if exists "arrival_select_all" on public.arrival_reports;
create policy "arrival_select_all" on public.arrival_reports
  for select using (true);

drop policy if exists "arrival_insert_auth" on public.arrival_reports;
create policy "arrival_insert_auth" on public.arrival_reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "arrival_update_own" on public.arrival_reports;
create policy "arrival_update_own" on public.arrival_reports
  for update using (auth.uid() = user_id);

drop policy if exists "arrival_delete_own" on public.arrival_reports;
create policy "arrival_delete_own" on public.arrival_reports
  for delete using (auth.uid() = user_id);

-- ----------------------------------------
-- usage_reports: 同上
-- ----------------------------------------
drop policy if exists "usage_select_all" on public.usage_reports;
create policy "usage_select_all" on public.usage_reports
  for select using (true);

drop policy if exists "usage_insert_auth" on public.usage_reports;
create policy "usage_insert_auth" on public.usage_reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "usage_update_own" on public.usage_reports;
create policy "usage_update_own" on public.usage_reports
  for update using (auth.uid() = user_id);

drop policy if exists "usage_delete_own" on public.usage_reports;
create policy "usage_delete_own" on public.usage_reports
  for delete using (auth.uid() = user_id);

-- ----------------------------------------
-- holdings: 完全プライベート（本人のみ全操作）
-- ----------------------------------------
drop policy if exists "holdings_select_own" on public.holdings;
create policy "holdings_select_own" on public.holdings
  for select using (auth.uid() = user_id);

drop policy if exists "holdings_insert_own" on public.holdings;
create policy "holdings_insert_own" on public.holdings
  for insert with check (auth.uid() = user_id);

drop policy if exists "holdings_update_own" on public.holdings;
create policy "holdings_update_own" on public.holdings
  for update using (auth.uid() = user_id);

drop policy if exists "holdings_delete_own" on public.holdings;
create policy "holdings_delete_own" on public.holdings
  for delete using (auth.uid() = user_id);

-- ----------------------------------------
-- watchlist: 完全プライベート（本人のみ全操作）
-- ----------------------------------------
drop policy if exists "watchlist_select_own" on public.watchlist;
create policy "watchlist_select_own" on public.watchlist
  for select using (auth.uid() = user_id);

drop policy if exists "watchlist_insert_own" on public.watchlist;
create policy "watchlist_insert_own" on public.watchlist
  for insert with check (auth.uid() = user_id);

drop policy if exists "watchlist_delete_own" on public.watchlist;
create policy "watchlist_delete_own" on public.watchlist
  for delete using (auth.uid() = user_id);

-- ============================================================
-- profilesの自動作成トリガー
-- ============================================================
-- 新規ユーザー（auth.users）が作られた瞬間に、対応するprofilesレコードも
-- 自動作成する。これがないと、アプリ側で毎回「プロファイルがあるか確認 → なければ作る」
-- というコードを書く必要があり、データ不整合の原因になる。
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, 'ゲスト')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- updated_at 自動更新トリガー（汎用）
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists touch_benefits_updated_at on public.benefits;
create trigger touch_benefits_updated_at
  before update on public.benefits
  for each row execute procedure public.touch_updated_at();

drop trigger if exists touch_holdings_updated_at on public.holdings;
create trigger touch_holdings_updated_at
  before update on public.holdings
  for each row execute procedure public.touch_updated_at();

-- ============================================================
-- 完了！ 以下のクエリで作成されたテーブルを確認できます:
--   select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
-- ============================================================
