@echo off
echo ============================================
echo Migration Files Viewer
echo ============================================
echo.
echo Choose a migration to view:
echo.
echo 1. Migration 1: add_subscription_period_tracking.sql
echo 2. Migration 2: fix_function_authorization.sql
echo 3. Migration 3: fix_rls_policies.sql
echo 4. Migration 4: fix_mark_simulation_counted.sql
echo 5. Migration 5: fix_concurrent_sessions.sql
echo 6. Migration 6: create_counter_reconciliation.sql
echo 7. Migration 7: handle_multiple_subscriptions.sql
echo 8. View ALL migrations list
echo 9. Exit
echo.
set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" type "supabase\migrations\add_subscription_period_tracking.sql" & pause & goto :eof
if "%choice%"=="2" type "supabase\migrations\fix_function_authorization.sql" & pause & goto :eof
if "%choice%"=="3" type "supabase\migrations\fix_rls_policies.sql" & pause & goto :eof
if "%choice%"=="4" type "supabase\migrations\fix_mark_simulation_counted.sql" & pause & goto :eof
if "%choice%"=="5" type "supabase\migrations\fix_concurrent_sessions.sql" & pause & goto :eof
if "%choice%"=="6" type "supabase\migrations\create_counter_reconciliation.sql" & pause & goto :eof
if "%choice%"=="7" type "supabase\migrations\handle_multiple_subscriptions.sql" & pause & goto :eof
if "%choice%"=="8" dir /B "supabase\migrations\*.sql" & pause & goto :eof
if "%choice%"=="9" exit

echo Invalid choice!
pause
