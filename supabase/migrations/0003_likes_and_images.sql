-- ============================================================
-- Migration 0003: いいね & 画像添付対応
-- ============================================================
--   * arrival_reports / usage_reports に image_url・helpful_count を追加
--   * post_likes テーブル新設（誰がどの投稿に「役に立った」を押したか）
--   * helpful_count を増減する RPC 関数
--   * report-images ストレージバケット & RLS
--
-- 適用方法:
--   1. Supabase ダッシュボード → SQL Editor で本ファイル内容を実行
--   2. Storage → Create bucket は SQL では作成できないため、画面で
--      `report-images` を Public で作成すること（このSQLの末尾コメント参照）
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. 既存テーブルへの列追加
-- ─────────────────────────────────────────────────────────

alter table public.arrival_reports
  add column if not exists image_url text,
  add column if not exists helpful_count int not null default 0;

alter table public.usage_reports
  add column if not exists image_url text,
  add column if not exists helpful_count int not null default 0;

-- ─────────────────────────────────────────────────────────
-- 2. post_likes テーブル
-- ─────────────────────────────────────────────────────────
-- (user_id, target_type, target_id) で1人1いいね。target_type は
-- 'arrival' か 'usage' のいずれか。

create table if not exists public.post_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('arrival', 'usage')),
  target_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create index if not exists post_likes_target_idx
  on public.post_likes (target_type, target_id);

alter table public.post_likes enable row level security;

drop policy if exists "post_likes self read" on public.post_likes;
create policy "post_likes self read"
  on public.post_likes for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "post_likes self insert" on public.post_likes;
create policy "post_likes self insert"
  on public.post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "post_likes self delete" on public.post_likes;
create policy "post_likes self delete"
  on public.post_likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────
-- 3. helpful_count を増減する RPC
-- ─────────────────────────────────────────────────────────
-- クライアント側で楽観更新 → RPC でアトミックに反映。
-- SECURITY DEFINER で、ターゲット投稿の所有者ではないユーザーも
-- カウンタだけは更新できるようにしている。

create or replace function public.increment_helpful_count(
  p_target_type text,
  p_target_id text,
  p_delta int
)
returns void
language plpgsql
security definer
as $$
begin
  if p_target_type = 'arrival' then
    update public.arrival_reports
      set helpful_count = greatest(0, helpful_count + p_delta)
      where id = p_target_id;
  elsif p_target_type = 'usage' then
    update public.usage_reports
      set helpful_count = greatest(0, helpful_count + p_delta)
      where id = p_target_id;
  end if;
end;
$$;

grant execute on function public.increment_helpful_count(text, text, int)
  to authenticated;

-- ─────────────────────────────────────────────────────────
-- 4. report-images ストレージバケット（手動作成が必要）
-- ─────────────────────────────────────────────────────────
-- Supabase ダッシュボード → Storage → "New bucket"
--   Name:   report-images
--   Public: ON
--   File size limit: 5 MB
--   Allowed MIME types: image/jpeg, image/png, image/webp
--
-- 以下の RLS ポリシーは Storage → Policies で同名のバケットに対して
-- 設定する。SQL でも作成できるが UI からのほうが安全。
--
--   read:   全員（anon を含む）
--   insert: authenticated AND (storage.foldername(name))[1] = auth.uid()::text
--   delete: authenticated AND (storage.foldername(name))[1] = auth.uid()::text
--
-- これにより各ユーザーは自分の uid フォルダ配下にのみアップロード可、
-- 読み込みはサイト閲覧者全員に公開される。
