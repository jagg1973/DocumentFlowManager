-- Export script for migrating data from existing database
-- Run this in your current database to export data

-- Export Projects
\copy (SELECT id, project_name, owner_id, created_at, status, priority, pillar, phase, description, start_date, end_date FROM dms_projects ORDER BY created_at DESC) TO 'projects_export.csv' WITH CSV HEADER;

-- Export Users  
\copy (SELECT id, email, first_name, last_name, role, is_email_verified, created_at FROM dms_users) TO 'users_export.csv' WITH CSV HEADER;

-- Export Project Members
\copy (SELECT project_id, user_id, permission_level, joined_at FROM dms_project_members) TO 'project_members_export.csv' WITH CSV HEADER;

-- Export Tasks
\copy (SELECT id, project_id, title, description, status, priority, pillar, phase, assigned_to, due_date, progress, created_at FROM dms_tasks ORDER BY created_at DESC) TO 'tasks_export.csv' WITH CSV HEADER;

-- Export Documents
\copy (SELECT id, title, description, file_path, file_size, mime_type, uploaded_by, project_id, category, is_public, created_at FROM dms_documents ORDER BY created_at DESC) TO 'documents_export.csv' WITH CSV HEADER;

-- Export User Activity
\copy (SELECT id, user_id, activity_type, points_earned, related_id, created_at FROM dms_user_activity_log ORDER BY created_at DESC LIMIT 1000) TO 'activity_export.csv' WITH CSV HEADER;

-- Export User Stats
\copy (SELECT user_id, experience_points, level, badges_earned, tasks_completed, current_streak, max_streak, authority_score FROM dms_user_stats) TO 'user_stats_export.csv' WITH CSV HEADER;

-- Show current data counts
SELECT 
    'Projects' as table_name, COUNT(*) as record_count FROM dms_projects
UNION ALL
SELECT 'Users', COUNT(*) FROM dms_users  
UNION ALL
SELECT 'Tasks', COUNT(*) FROM dms_tasks
UNION ALL
SELECT 'Documents', COUNT(*) FROM dms_documents
UNION ALL
SELECT 'Project Members', COUNT(*) FROM dms_project_members
UNION ALL
SELECT 'User Activity', COUNT(*) FROM dms_user_activity_log
UNION ALL
SELECT 'User Stats', COUNT(*) FROM dms_user_stats;