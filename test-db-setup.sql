-- Quick verification query
SELECT 
  'plan_limits' as table_name,
  COUNT(*) as row_count
FROM plan_limits
UNION ALL
SELECT 
  'user_subscriptions' as table_name,
  COUNT(*) as row_count
FROM user_subscriptions;
