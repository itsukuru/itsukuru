-- ============================================================
-- いつクル？ Phase 2: 優待情報の信頼度メタデータ＋発送時期追加
-- ============================================================
-- benefits テーブルに4つの新フィールドを追加:
--   - ir_url: 公式IRページのURL（情報源リンク）
--   - last_confirmed_at: 最終確認日
--   - confidence: 確度ラベル（verified / stable / uncertain / abolished）
--   - expected_arrival: 企業案内の発送時期（自由記述。例: "6月下旬発送"）
-- ============================================================

-- 1. 列追加（既にあればスキップ）
alter table public.benefits
  add column if not exists ir_url text,
  add column if not exists last_confirmed_at date,
  add column if not exists confidence text,
  add column if not exists expected_arrival text;

-- 2. confidence の値を制約（CHECK制約）
do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'benefits_confidence_check'
  ) then
    alter table public.benefits
      add constraint benefits_confidence_check
      check (
        confidence is null or
        confidence in ('verified', 'stable', 'uncertain', 'abolished')
      );
  end if;
end $$;

-- 3. 表示順や検索効率化のためのインデックス
create index if not exists benefits_confidence_idx
  on public.benefits(confidence)
  where confidence is not null;

-- ============================================================
-- 完了！ 確認クエリ:
--   select column_name, data_type from information_schema.columns
--   where table_name = 'benefits' and table_schema = 'public';
-- ============================================================
