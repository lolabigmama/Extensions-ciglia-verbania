create table if not exists public.special_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  starts_at time not null,
  created_at timestamptz not null default now(),
  unique(slot_date, starts_at)
);
create index if not exists special_slots_date_idx on public.special_slots(slot_date, starts_at);
alter table public.special_slots enable row level security;
insert into public.special_slots(slot_date, starts_at) values
 ('2026-11-02','10:30'),
 ('2026-11-02','14:00'),
 ('2026-11-02','16:00'),
 ('2026-11-02','18:00')
on conflict(slot_date,starts_at) do nothing;
