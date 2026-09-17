-- Safe, repeatable migration for budget one-click income batches.
-- This migration never drops or recreates existing tables.
begin;

alter table public.incomes add column if not exists source text default 'manual';
alter table public.incomes add column if not exists batch_id uuid null;

update public.incomes
set source = 'budget_one_click'
where coalesce(source, 'manual') = 'manual'
  and memo in ('정기 예산 원클릭', '정기 예산 원클릭 (취소)');
update public.incomes set source = 'manual' where source is null;
alter table public.incomes
  alter column source set default 'manual', alter column source set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'incomes_source_check' and conrelid = 'public.incomes'::regclass) then
    alter table public.incomes add constraint incomes_source_check check (source in ('manual', 'budget_one_click'));
  end if;
end $$;

-- Abort the whole migration if duplicate keys have conflicting values.
do $$
begin
  if exists (
    select 1 from public.budgets
    group by category, "subCategory"
    having count(*) > 1 and (count(distinct bank) > 1 or count(distinct account) > 1 or count(distinct amount) > 1)
  ) then raise exception 'BUDGET_DUPLICATE_CONFLICT'; end if;
end $$;

-- Keep the earliest row; id is the deterministic tie-breaker.
delete from public.budgets b using (
  select id, row_number() over (partition by category, "subCategory" order by created_at nulls last, id) as row_number
  from public.budgets
) duplicate where b.id = duplicate.id and duplicate.row_number > 1;

create unique index if not exists budgets_category_subcategory_unique_idx on public.budgets (category, "subCategory");
create index if not exists incomes_budget_one_click_lookup_idx on public.incomes (month, category, source, batch_id);

-- Backfill the six known executions with fixed UUIDs. Existing batch IDs are untouched.
update public.incomes
set batch_id = case
  when month = '8' and category = '교통비' then '10000000-0000-4000-8000-000000000008'::uuid
  when month = '8' and category = '생활비' then '10000000-0000-4000-8000-000000000018'::uuid
  when month = '8' and category = '예비비' then '10000000-0000-4000-8000-000000000028'::uuid
  when month = '9' and category = '교통비' then '10000000-0000-4000-8000-000000000009'::uuid
  when month = '9' and category = '생활비' then '10000000-0000-4000-8000-000000000019'::uuid
  when month = '9' and category = '예비비' then '10000000-0000-4000-8000-000000000029'::uuid
end
where source = 'budget_one_click' and memo = '정기 예산 원클릭' and amount > 0 and batch_id is null
  and month in ('8', '9') and category in ('교통비', '생활비', '예비비');

create or replace function public.create_budget_one_click(p_month text, p_date date, p_category text, p_batch_id uuid)
returns setof public.incomes language plpgsql security invoker set search_path = public as $$
begin
  if p_batch_id is null then raise exception 'BATCH_ID_REQUIRED'; end if;
  if p_month is null or btrim(p_month) = '' or p_date is null or p_category is null or btrim(p_category) = '' then
    raise exception 'BUDGET_ONE_CLICK_FIELDS_REQUIRED';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('budget_one_click:' || p_month || ':' || p_category, 0));
  if not exists (select 1 from public.budgets where category = p_category) then raise exception 'NO_BUDGET_ITEMS'; end if;
  if exists (select 1 from public.incomes where month = p_month and category = p_category and source = 'budget_one_click' and amount > 0) then
    raise exception 'ACTIVE_BUDGET_ONE_CLICK_EXISTS';
  end if;
  return query insert into public.incomes (month, date, category, "subCategory", amount, memo, source, batch_id)
    select p_month, p_date, b.category, b."subCategory", b.amount, '정기 예산 원클릭', 'budget_one_click', p_batch_id
    from public.budgets b where b.category = p_category returning *;
  if not found then raise exception 'NO_BUDGET_ITEMS'; end if;
end;
$$;

create or replace function public.cancel_budget_one_click(p_batch_id uuid)
returns integer language plpgsql security invoker set search_path = public as $$
declare batch_month text; batch_category text; deleted_count integer;
begin
  if p_batch_id is null then raise exception 'BATCH_ID_REQUIRED'; end if;
  select month, category into batch_month, batch_category from public.incomes
    where source = 'budget_one_click' and batch_id = p_batch_id limit 1;
  if batch_month is null or batch_category is null then raise exception 'ACTIVE_BUDGET_ONE_CLICK_NOT_FOUND'; end if;
  perform pg_advisory_xact_lock(hashtextextended('budget_one_click:' || batch_month || ':' || batch_category, 0));
  delete from public.incomes where source = 'budget_one_click' and batch_id = p_batch_id;
  get diagnostics deleted_count = row_count;
  if deleted_count = 0 then raise exception 'ACTIVE_BUDGET_ONE_CLICK_NOT_FOUND'; end if;
  return deleted_count;
end;
$$;

grant execute on function public.create_budget_one_click(text, date, text, uuid) to anon, authenticated;
grant execute on function public.cancel_budget_one_click(uuid) to anon, authenticated;
commit;

-- Verification queries (run after migration in a separate read-only query):
-- select count(*) as budgets_total from public.budgets;
-- select category, "subCategory", count(*) as row_count from public.budgets group by category, "subCategory" having count(*) > 1;
-- select category, "subCategory", bank, account, amount, count(*) as row_count
-- from public.budgets group by category, "subCategory", bank, account, amount
-- having count(*) > 1;
-- select count(*) as one_click_rows, count(distinct batch_id) as one_click_batches from public.incomes where source = 'budget_one_click';
-- select count(*) as one_click_without_batch from public.incomes where source = 'budget_one_click' and batch_id is null;
-- select month, category, batch_id, count(*) as row_count, sum(amount) as amount_sum from public.incomes where source = 'budget_one_click' group by month, category, batch_id order by month, category;
-- select month, category, count(distinct batch_id) as active_batches from public.incomes where source = 'budget_one_click' and amount > 0 group by month, category having count(distinct batch_id) > 1;
-- select count(*) as incorrectly_backfilled_manual_rows from public.incomes where source = 'budget_one_click' and memo not in ('정기 예산 원클릭', '정기 예산 원클릭 (취소)');
-- select count(*) as manual_income_rows from public.incomes where source = 'manual';
