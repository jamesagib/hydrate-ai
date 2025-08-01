-- Fix the check_and_award_achievements function to properly handle user_stats record assignment
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
  
  -- Get user's goal achievement stats with proper fallback
  select * into user_stats
  from (
    select 
      coalesce(count(*), 0) as total_goals,
      coalesce(count(*) filter (where date(hc.created_at) >= date_trunc('month', current_date)), 0) as monthly_goals,
      coalesce(count(*) filter (where extract(dow from hc.created_at) in (0, 6)), 0) as weekend_goals,
      coalesce(count(*) filter (where extract(hour from hc.created_at) < 9), 0) as early_checkins,
      coalesce(count(*) filter (where extract(hour from hc.created_at) >= 22), 0) as late_checkins,
      coalesce(count(*) filter (where hc.value >= (regexp_replace(hp.daily_goal, '[^0-9.]', '', 'g')::numeric) * 1.2), 0) as exceeded_goals
    from hydration_checkins hc
    join hydration_plans hp on hc.user_id = hp.user_id
    where hc.user_id = user_uuid 
      and hc.value >= (regexp_replace(hp.daily_goal, '[^0-9.]', '', 'g')::numeric)
      and hc.created_at >= hp.created_at
  ) user_achievement_stats;
  
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