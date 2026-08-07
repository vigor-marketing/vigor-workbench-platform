create table if not exists workbench_todos (
  id text primary key,
  title text not null,
  source text not null,
  due_at timestamptz not null,
  priority text not null check (priority in ('high', 'medium', 'normal')),
  completed boolean not null default false,
  owner_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into workbench_todos (id, title, source, due_at, priority, completed, owner_id) values
  ('todo-01', '确认华东项目的技术支持安排', '跨部门计划', '2026-08-07 10:30:00+08', 'high', false, 'employee-chen'),
  ('todo-02', '审批客户报价 V2.1', '销售审批', '2026-08-07 14:00:00+08', 'high', false, 'employee-chen'),
  ('todo-03', '完成本周 AI 陪练复盘', 'AI 销售陪练', '2026-08-08 18:00:00+08', 'medium', false, 'employee-chen'),
  ('todo-04', '核对 7 月销售提成数据', '销售提成', '2026-08-12 18:00:00+08', 'normal', false, 'employee-chen')
on conflict (id) do nothing;
