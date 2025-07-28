-- HydrateAI Database Schema (Supabase/Postgres)

-- 1. User Profiles (Onboarding)
create table if not exists profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    name text,
    sex text,
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
create policy if not exists "Users can manage their own profile" on profiles
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
create policy if not exists "Users can manage their own hydration plans" on hydration_plans
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
create policy if not exists "Users can manage their own hydration checkins" on hydration_checkins
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
create policy if not exists "Users can manage their own notifications" on notifications
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
create policy if not exists "Users can manage their own streaks" on streaks
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
drop policy if exists "Users can manage their own achievements" on achievements;
create policy "Users can manage their own achievements" on achievements
  for all using (user_id = auth.uid());

-- Insert achievement templates
insert into achievement_templates (title, description, icon, criteria) values
  ('First Goal', 'Reach your daily hydration goal for the first time', '🎯', '{"type": "first_goal", "value": 1}'),
  ('Goal Master', 'Reach your daily hydration goal 7 days in a row', '🏆', '{"type": "streak", "value": 7}'),
  ('Hydration Hero', 'Reach your daily hydration goal 30 days in a row', '👑', '{"type": "streak", "value": 30}'),
  ('Perfect Week', 'Reach your daily hydration goal every day for a week', '⭐', '{"type": "perfect_week", "value": 7}'),
  ('Consistency King', 'Track your hydration for 14 consecutive days', '📊', '{"type": "tracking_streak", "value": 14}'),
  ('Early Bird', 'Log your first hydration of the day before 9 AM', '🌅', '{"type": "early_checkin", "value": 1}'),
  ('Night Owl', 'Log hydration after 10 PM', '🦉', '{"type": "late_checkin", "value": 1}'),
  ('Overachiever', 'Exceed your daily goal by 20%', '🚀', '{"type": "exceed_goal", "value": 120}'),
  ('Weekend Warrior', 'Reach your goal on both Saturday and Sunday', '🏃', '{"type": "weekend_goals", "value": 2}'),
  ('Monthly Master', 'Reach your goal for 25 days in a month', '📅', '{"type": "monthly_goals", "value": 25}')
  on conflict do nothing;

-- Function to check and award achievements
create or replace function check_and_award_achievements(user_uuid uuid)
returns void as $$
declare
  achievement_record record;
  user_streak record;
  user_stats record;
  goal_count int;
  weekend_goals int;
  monthly_goals int;
  early_checkins int;
  late_checkins int;
  exceeded_goals int;
begin
  -- Get user's current streak and stats (handle case where user doesn't have streak record)
  select * into user_streak from streaks where user_id = user_uuid;
  
  -- Initialize user_stats with default values if no data found
  user_stats.total_goals := 0;
  user_stats.monthly_goals := 0;
  user_stats.weekend_goals := 0;
  user_stats.early_checkins := 0;
  user_stats.late_checkins := 0;
  user_stats.exceeded_goals := 0;
  
  -- Get user's goal achievement stats (only if they have hydration data)
  select 
    count(*) as total_goals,
    count(*) filter (where date(created_at) >= date_trunc('month', current_date)) as monthly_goals,
    count(*) filter (where extract(dow from created_at) in (0, 6)) as weekend_goals,
    count(*) filter (where extract(hour from created_at) < 9) as early_checkins,
    count(*) filter (where extract(hour from created_at) >= 22) as late_checkins,
    count(*) filter (where value >= daily_goal * 1.2) as exceeded_goals
  into user_stats
  from hydration_checkins hc
  join hydration_plans hp on hc.user_id = hp.user_id
  where hc.user_id = user_uuid 
    and hc.value >= hp.daily_goal
    and hc.created_at >= hp.created_at;
  
  -- Loop through all achievement templates
  for achievement_record in 
    select * from achievement_templates where is_active = true
  loop
    -- Check if user already has this achievement
    if not exists (
      select 1 from achievements 
      where user_id = user_uuid and achievement_id = achievement_record.id
    ) then
      -- Check achievement criteria
      case achievement_record.criteria->>'type'
        when 'first_goal' then
          if coalesce(user_stats.total_goals, 0) >= (achievement_record.criteria->>'value')::int then
            insert into achievements (user_id, achievement_id) 
            values (user_uuid, achievement_record.id);
          end if;
          
        when 'streak' then
          if coalesce(user_streak.current_streak, 0) >= (achievement_record.criteria->>'value')::int then
            insert into achievements (user_id, achievement_id) 
            values (user_uuid, achievement_record.id);
          end if;
          
        when 'perfect_week' then
          if coalesce(user_streak.current_streak, 0) >= (achievement_record.criteria->>'value')::int then
            insert into achievements (user_id, achievement_id) 
            values (user_uuid, achievement_record.id);
          end if;
          
        when 'tracking_streak' then
          if coalesce(user_streak.total_days, 0) >= (achievement_record.criteria->>'value')::int then
            insert into achievements (user_id, achievement_id) 
            values (user_uuid, achievement_record.id);
          end if;
          
        when 'early_checkin' then
          if coalesce(user_stats.early_checkins, 0) >= (achievement_record.criteria->>'value')::int then
            insert into achievements (user_id, achievement_id) 
            values (user_uuid, achievement_record.id);
          end if;
          
        when 'late_checkin' then
          if coalesce(user_stats.late_checkins, 0) >= (achievement_record.criteria->>'value')::int then
            insert into achievements (user_id, achievement_id) 
            values (user_uuid, achievement_record.id);
          end if;
          
        when 'exceed_goal' then
          if coalesce(user_stats.exceeded_goals, 0) >= (achievement_record.criteria->>'value')::int then
            insert into achievements (user_id, achievement_id) 
            values (user_uuid, achievement_record.id);
          end if;
          
        when 'weekend_goals' then
          if coalesce(user_stats.weekend_goals, 0) >= (achievement_record.criteria->>'value')::int then
            insert into achievements (user_id, achievement_id) 
            values (user_uuid, achievement_record.id);
          end if;
          
        when 'monthly_goals' then
          if coalesce(user_stats.monthly_goals, 0) >= (achievement_record.criteria->>'value')::int then
            insert into achievements (user_id, achievement_id) 
            values (user_uuid, achievement_record.id);
          end if;
      end case;
    end if;
  end loop;
end;
$$ language plpgsql security definer; 