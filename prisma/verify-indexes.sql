-- Verify indexes created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'games', 'transactions', 'game_moves', 'game_sessions', 'audit_logs', 'wallets')
ORDER BY tablename, indexname;
