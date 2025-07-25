-- HydrateAI Database Schema (Supabase/Postgres)

-- 1. User Profiles (Onboarding)
create table if not exists profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    name text,
    pronouns text,
    age int,
    weight_kg numeric,
    height_cm numeric,
    activity_level text, -- e.g. 'low', 'moderate', 'high'
    climate text,        -- e.g. 'hot', 'temperate', 'cold'
    forgets_water boolean,
    wants_coaching boolean,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS for profiles
alter table profiles enable row level security;
create policy "Users can manage their own profile" on profiles
  for all using (user_id = auth.uid());

-- 2. Hydration Plans
create table if not exists hydration_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    daily_goal text not null, -- e.g. '80oz/day', 'Stay hydrated for optimal energy'
    suggested_logging_times jsonb, -- e.g. [{"time": "08:00", "oz": 20}, ...]
    lifestyle_adjustments jsonb,   -- e.g. {"activity": "high", "climate": "hot"}
    plan_generated_by text, -- e.g. 'ai', 'manual'
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS for hydration_plans
alter table hydration_plans enable row level security;
create policy "Users can manage their own hydration plans" on hydration_plans
  for all using (user_id = auth.uid());

-- 3. Hydration Check-ins
create table if not exists hydration_checkins (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    checkin_type text not null, -- 'slider', 'ai_checkin', 'freeform'
    value numeric,             -- e.g. slider value, estimated oz, etc.
    raw_input text,            -- for freeform input
    ai_estimate_oz numeric,    -- if AI estimates amount
    created_at timestamptz default now()
);

-- RLS for hydration_checkins
alter table hydration_checkins enable row level security;
create policy "Users can manage their own hydration checkins" on hydration_checkins
  for all using (user_id = auth.uid());

-- 4. Notification Templates
create table if not exists notification_templates (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    title text not null,
    body text not null,
    type text, -- e.g. 'reminder', 'celebration', 'checkin', 'custom'
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Example templates
insert into notification_templates (name, title, body, type) values
  ('daily_reminder', 'Time to hydrate!', 'Don''t forget to drink some water and keep your streak going.', 'reminder'),
  ('ai_checkin', 'Quick check-in', 'Hey {{name}}, did you drink any water since I last checked in?', 'checkin'),
  ('streak_celebration', 'Hydration Hero!', 'Day {{streak}} – You''re crushing your hydration goals! 🎉', 'celebration'),
  ('goal_achieved', 'Goal Achieved!', 'You hit your daily hydration target. Great job!', 'celebration'),
  ('custom_message', 'Message from HydrateAI', '{{message}}', 'custom')
  on conflict (name) do nothing;

-- 5. Notifications
create table if not exists notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    template_id uuid references notification_templates(id),
    title text not null,
    body text not null,
    sent_at timestamptz default now(),
    read_at timestamptz,
    status text default 'sent', -- 'sent', 'delivered', 'read', 'failed'
    metadata jsonb
);

-- RLS for notifications
alter table notifications enable row level security;
create policy "Users can manage their own notifications" on notifications
  for all using (user_id = auth.uid());

-- 6. Streaks
create table if not exists streaks (
    user_id uuid primary key references auth.users(id) on delete cascade,
    current_streak int default 0,
    longest_streak int default 0,
    last_checkin_date date,
    goal_days int default 0,   -- number of days user met their goal
    total_days int default 0,  -- number of days tracked
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS for streaks
alter table streaks enable row level security;
create policy "Users can manage their own streaks" on streaks
  for all using (user_id = auth.uid());

-- 7. Achievement Templates (definitions)
create table if not exists achievement_templates (
    id serial primary key,
    title text not null,
    description text not null,
    icon text, -- e.g. emoji or icon name
    criteria jsonb, -- e.g. {"type": "streak", "value": 7}
    is_active boolean default true
);

-- 8. Achievements (user-earned)
create table if not exists achievements (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    achievement_id int references achievement_templates(id),
    earned_at timestamptz default now()
);

-- RLS for achievements
alter table achievements enable row level security;
create policy "Users can manage their own achievements" on achievements
  for all using (user_id = auth.uid()); 