-- Import script for local environment
-- Run this after setting up your local database to import existing data

-- First ensure tables exist (run npm run db:push first)

-- Import Users (run this first due to foreign key constraints)
\copy dms_users(id, email, first_name, last_name, role, is_email_verified, created_at) FROM 'users_export.csv' WITH CSV HEADER;

-- Import Projects
\copy dms_projects(id, project_name, owner_id, created_at, status, priority, pillar, phase, description, start_date, end_date) FROM 'projects_export.csv' WITH CSV HEADER;

-- Import Project Members
\copy dms_project_members(project_id, user_id, permission_level, joined_at) FROM 'project_members_export.csv' WITH CSV HEADER;

-- Import Tasks
\copy dms_tasks(id, project_id, title, description, status, priority, pillar, phase, assigned_to, due_date, progress, created_at) FROM 'tasks_export.csv' WITH CSV HEADER;

-- Import Documents
\copy dms_documents(id, title, description, file_path, file_size, mime_type, uploaded_by, project_id, category, is_public, created_at) FROM 'documents_export.csv' WITH CSV HEADER;

-- Import User Activity
\copy dms_user_activity_log(id, user_id, activity_type, points_earned, related_id, created_at) FROM 'activity_export.csv' WITH CSV HEADER;

-- Import User Stats
\copy dms_user_stats(user_id, experience_points, level, badges_earned, tasks_completed, current_streak, max_streak, authority_score) FROM 'user_stats_export.csv' WITH CSV HEADER;

-- Update sequences to current max values
SELECT setval('dms_projects_id_seq', (SELECT MAX(id) FROM dms_projects));
SELECT setval('dms_tasks_id_seq', (SELECT MAX(id) FROM dms_tasks));
SELECT setval('dms_documents_id_seq', (SELECT MAX(id) FROM dms_documents));
SELECT setval('dms_user_activity_log_id_seq', (SELECT MAX(id) FROM dms_user_activity_log));

-- Verify import
SELECT 
    'Projects' as table_name, COUNT(*) as imported_count FROM dms_projects
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

-- Test query to ensure data is accessible
SELECT 
    p.id,
    p.project_name,
    p.owner_id,
    p.created_at,
    u.email as owner_email
FROM dms_projects p
JOIN dms_users u ON p.owner_id = u.id
ORDER BY p.created_at DESC
LIMIT 5;