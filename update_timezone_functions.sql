-- Update get_home_screen_data function to use user's timezone
create or replace function get_home_screen_data(user_uuid uuid)
returns json as $$
declare
  result json;
  user_timezone text;
  today_date date;
begin
  -- Get user's timezone, default to UTC if not set
  select coalesce(timezone, 'UTC') into user_timezone
  from profiles 
  where user_id = user_uuid;
  
  -- Calculate today's date in user's timezone
  today_date := (now() at time zone user_timezone)::date;
  
  select json_build_object(
    'hydration_plan', (
      select row_to_json(hp) 
      from hydration_plans hp 
      where hp.user_id = user_uuid 
      order by hp.created_at desc 
      limit 1
    ),
    'today_checkins', (
      select coalesce(json_agg(row_to_json(hc) order by hc.created_at desc), '[]'::json)
      from hydration_checkins hc 
      where hc.user_id = user_uuid 
        and (hc.created_at at time zone user_timezone)::date = today_date
    ),
    'streak', (
      select row_to_json(s) 
      from streaks s 
      where s.user_id = user_uuid
    )
  ) into result;
  
  return result;
end;
$$ language plpgsql security definer;

-- Update get_stats_screen_data function to use user's timezone
create or replace function get_stats_screen_data(user_uuid uuid, period_type text default 'week')
returns json as $$
declare
  result json;
  user_timezone text;
  today_date date;
  period_start date;
  data_points int;
begin
  -- Get user's timezone, default to UTC if not set
  select coalesce(timezone, 'UTC') into user_timezone
  from profiles 
  where user_id = user_uuid;
  
  -- Calculate today's date in user's timezone
  today_date := (now() at time zone user_timezone)::date;
  
  -- Calculate period start date and data points
  case period_type
    when 'week' then
      period_start := today_date - interval '7 days';
      data_points := 7;
    when 'month' then
      period_start := today_date - interval '30 days';
      data_points := 30;
    when 'year' then
      period_start := today_date - interval '1 year';
      data_points := 12;
    else
      period_start := today_date - interval '7 days';
      data_points := 7;
  end case;

  select json_build_object(
    'hydration_plan', (
      select row_to_json(hp) 
      from hydration_plans hp 
      where hp.user_id = user_uuid 
      order by hp.created_at desc 
      limit 1
    ),
    'period_checkins', (
      select coalesce(json_agg(row_to_json(hc) order by hc.created_at asc), '[]'::json)
      from hydration_checkins hc 
      where hc.user_id = user_uuid 
        and (hc.created_at at time zone user_timezone)::date >= period_start
    ),
    'streak', (
      select row_to_json(s) 
      from streaks s 
      where s.user_id = user_uuid
    ),
    'achievements', (
      select json_build_object(
        'templates', (
          select coalesce(json_agg(row_to_json(at)), '[]'::json)
          from achievement_templates at
          where at.is_active = true
        ),
        'earned', (
          select coalesce(json_agg(a.achievement_id), '[]'::json)
          from achievements a
          where a.user_id = user_uuid
        )
      )
    ),
    'period_info', json_build_object(
      'start_date', period_start,
      'data_points', data_points,
      'period_type', period_type
    )
  ) into result;
  
  return result;
end;
$$ language plpgsql security definer; 