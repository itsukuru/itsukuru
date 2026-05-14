-- ============================================================
-- いつクル？ お問い合わせ・通報メッセージ用テーブル
-- ============================================================
-- 用途:
--   /contact のフォームから投稿される通報・お問い合わせを蓄積
-- 設計:
--   - 未認証ユーザーでも投稿可能（INSERT は anon でも許可）
--   - 閲覧は admin（service_role）専用 → 通常 RLS で SELECT を許可しない
--   - 管理者は Supabase Dashboard の「Table Editor」で閲覧する
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.contact_messages (
  id uuid primary key default uuid_generate_v4(),
  category text not null check (category in (
    'bug',          -- 不具合
    'wrong_info',   -- 優待情報の誤り
    'report_post',  -- 投稿の通報
    'feature',      -- 機能要望
    'other'         -- その他
  )),
  message text not null check (char_length(message) between 5 and 5000),
  email text check (email is null or char_length(email) <= 320),
  related_code text check (related_code is null or char_length(related_code) <= 10),
  related_url text check (related_url is null or char_length(related_url) <= 500),
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_category_idx
  on public.contact_messages (category);

-- RLS: 未認証ユーザーでも INSERT 可能、SELECT は禁止
alter table public.contact_messages enable row level security;

drop policy if exists "contact_insert_anyone" on public.contact_messages;
create policy "contact_insert_anyone"
  on public.contact_messages
  for insert
  with check (true);

-- 既存のテーブルアクセス権限を anon に付与（INSERT のみ）
grant insert on public.contact_messages to anon;
grant insert on public.contact_messages to authenticated;

-- 完了！ 管理者は Supabase Dashboard の Table Editor で
-- public.contact_messages を開いて投稿内容を閲覧できる。
