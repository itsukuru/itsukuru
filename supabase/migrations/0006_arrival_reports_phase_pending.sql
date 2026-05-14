-- 「まだ届いていない」投稿用に phase に 'pending' を許可する。
-- 0005 の CHECK 制約を差し替える。

alter table public.arrival_reports
  drop constraint if exists arrival_reports_phase_check;

alter table public.arrival_reports
  add constraint arrival_reports_phase_check
  check (phase is null or phase in ('notice', 'actual', 'pending'));
