-- Create new task management tables without foreign key constraints first
-- Version: 0007
-- Description: Create Phase 1 task management tables

-- Task Followers/Watchers
CREATE TABLE IF NOT EXISTS task_followers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  follow_type ENUM('explicit', 'auto_assignee', 'auto_creator', 'auto_owner') DEFAULT 'explicit',
  notification_settings JSON DEFAULT ('{"comments": true, "updates": true, "mentions": true, "status_changes": true}'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_task_follower (task_id, user_id),
  INDEX idx_task_followers_task (task_id),
  INDEX idx_task_followers_user (user_id)
);

-- Task Comments with Threading
CREATE TABLE IF NOT EXISTS task_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  parent_comment_id INT NULL,
  author_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  comment_type ENUM('comment', 'system', 'status_change') DEFAULT 'comment',
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_task_comments_task (task_id),
  INDEX idx_task_comments_parent (parent_comment_id),
  INDEX idx_task_comments_author (author_id)
);

-- Task Comment Reactions
CREATE TABLE IF NOT EXISTS task_comment_reactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  comment_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  reaction_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_comment_reaction (comment_id, user_id, reaction_type),
  INDEX idx_comment_reactions_comment (comment_id),
  INDEX idx_comment_reactions_user (user_id)
);

-- Task Comment Mentions
CREATE TABLE IF NOT EXISTS task_comment_mentions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  comment_id INT NOT NULL,
  mentioned_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task_comment_mentions_comment_id (comment_id),
  INDEX idx_task_comment_mentions_mentioned_user_id (mentioned_user_id)
);

-- Task Attachments
CREATE TABLE IF NOT EXISTS task_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  uploaded_by VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_extension VARCHAR(10) NOT NULL,
  attachment_type ENUM('file', 'image', 'document') DEFAULT 'file',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task_attachments_task (task_id),
  INDEX idx_task_attachments_uploader (uploaded_by)
);

-- Task Activity Log
CREATE TABLE IF NOT EXISTS task_activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  field_name VARCHAR(100),
  description TEXT,
  activity_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task_activities_task (task_id),
  INDEX idx_task_activities_user (user_id),
  INDEX idx_task_activities_type (activity_type),
  INDEX idx_task_activities_date (created_at)
);

-- Task Permissions
CREATE TABLE IF NOT EXISTS task_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  permission_type ENUM('view', 'edit', 'admin') NOT NULL,
  granted_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_task_permission (task_id, user_id),
  INDEX idx_task_permissions_task_id (task_id),
  INDEX idx_task_permissions_user_id (user_id)
);

-- Task Time Entries
CREATE TABLE IF NOT EXISTS task_time_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NULL,
  duration_minutes INT,
  description TEXT,
  is_billable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_task_time_entries_task (task_id),
  INDEX idx_task_time_entries_user (user_id),
  INDEX idx_task_time_entries_date (start_time)
);

-- Create initial data for existing tasks
-- Find a valid user ID to use as default
SET @valid_user_id = (SELECT id FROM users LIMIT 1);

-- Update tasks with valid user references for new columns
UPDATE tasks 
SET 
  created_by = COALESCE(created_by, @valid_user_id),
  owner_id = COALESCE(owner_id, assignedToId, @valid_user_id),
  last_updated_by = COALESCE(last_updated_by, @valid_user_id)
WHERE created_by IS NULL OR owner_id IS NULL OR last_updated_by IS NULL;

-- Auto-follow tasks for existing assignees
INSERT IGNORE INTO task_followers (task_id, user_id, follow_type, created_at)
SELECT 
    t.id as task_id,
    t.assignedToId as user_id,
    'auto_assignee' as follow_type,
    t.createdAt as created_at
FROM tasks t 
WHERE t.assignedToId IS NOT NULL;

-- Auto-follow for owners
INSERT IGNORE INTO task_followers (task_id, user_id, follow_type, created_at)
SELECT 
    t.id as task_id,
    t.owner_id as user_id,
    'auto_owner' as follow_type,
    t.createdAt as created_at
FROM tasks t 
WHERE t.owner_id IS NOT NULL 
AND t.owner_id != t.assignedToId;

-- Create initial activity entries for existing tasks
INSERT IGNORE INTO task_activities (task_id, user_id, activity_type, description, created_at)
SELECT 
    t.id as task_id,
    t.created_by as user_id,
    'task_created' as activity_type,
    CONCAT('Task "', t.taskName, '" was created') as description,
    t.createdAt as created_at
FROM tasks t 
WHERE t.created_by IS NOT NULL;
