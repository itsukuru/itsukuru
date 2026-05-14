-- ============================================================
-- Migration 0005: arrival_reports に phase カラムを追加
-- ============================================================
-- アプリ側の BenefitReport.phase ("notice" | "actual") を保存するため。
--   * "notice"  ... 案内・申込書が届いた段階の投稿
--   * "actual"  ... 優待品（実物）が届いた段階の投稿
--
-- 既存データには値が無いので、デフォルト 'actual' を設定。
-- NULL は許容するが、アプリ側で未指定なら 'actual' 扱いとしてフォールバック。
-- ============================================================

alter table public.arrival_reports
  add column if not exists phase text
    check (phase is null or phase in ('notice', 'actual'));

-- 既存レコードを 'actual' で埋める（NULLのままだと検索効率が下がるため）
update public.arrival_reports
  set phase = 'actual'
  where phase is null;

-- 以後のデフォルトを 'actual' に
alter table public.arrival_reports
  alter column phase set default 'actual';

create index if not exists arrival_reports_phase_idx
  on public.arrival_reports (phase);

-- usage_reports には phase 概念が無いので変更不要。
