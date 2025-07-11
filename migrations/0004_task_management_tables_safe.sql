-- Migration: Task Management Tables Safe Version
-- Version: 0004
-- Description: Safely adds new tables for task management features

-- ================================================
-- FIRST, SAFELY UPDATE EXISTING DATA
-- ================================================

-- Find a valid user ID to use as default
SET @valid_user_id = (SELECT id FROM users LIMIT 1);

-- Update tasks with valid user references
UPDATE tasks 
SET 
  created_by = @valid_user_id,
  owner_id = COALESCE(assigned_to_id, @valid_user_id),
  last_updated_by = @valid_user_id,
  priority = COALESCE(priority, 'medium')
WHERE created_by IS NULL OR owner_id IS NULL OR last_updated_by IS NULL OR priority IS NULL;

-- Clean up any invalid user references
UPDATE tasks 
SET 
  created_by = @valid_user_id,
  owner_id = @valid_user_id,
  last_updated_by = @valid_user_id
WHERE created_by NOT IN (SELECT id FROM users) 
   OR owner_id NOT IN (SELECT id FROM users) 
   OR last_updated_by NOT IN (SELECT id FROM users);

-- ================================================
-- CREATE NEW TASK MANAGEMENT TABLES
-- ================================================

-- Task Followers/Watchers
CREATE TABLE IF NOT EXISTS task_followers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  follow_type ENUM('explicit', 'auto_assignee', 'auto_creator', 'auto_owner') DEFAULT 'explicit',
  notification_settings JSON DEFAULT ('{"comments": true, "updates": true, "mentions": true, "status_changes": true}'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_task_follower (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
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
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES task_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
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
  FOREIGN KEY (comment_id) REFERENCES task_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_comment_reactions_comment (comment_id),
  INDEX idx_comment_reactions_user (user_id)
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
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
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
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_activities_task (task_id),
  INDEX idx_task_activities_user (user_id),
  INDEX idx_task_activities_type (activity_type),
  INDEX idx_task_activities_date (created_at)
);

-- Task Notifications
CREATE TABLE IF NOT EXISTS task_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recipient_id VARCHAR(255) NOT NULL,
  task_id INT NOT NULL,
  activity_id INT,
  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES task_activities(id) ON DELETE CASCADE,
  INDEX idx_task_notifications_recipient (recipient_id, is_read),
  INDEX idx_task_notifications_task (task_id),
  INDEX idx_task_notifications_date (created_at)
);

-- Task Dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  predecessor_task_id INT NOT NULL,
  successor_task_id INT NOT NULL,
  dependency_type ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish') DEFAULT 'finish_to_start',
  lag_days INT DEFAULT 0,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_dependency (predecessor_task_id, successor_task_id),
  FOREIGN KEY (predecessor_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (successor_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_task_dependencies_predecessor (predecessor_task_id),
  INDEX idx_task_dependencies_successor (successor_task_id)
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
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_time_entries_task (task_id),
  INDEX idx_task_time_entries_user (user_id),
  INDEX idx_task_time_entries_date (start_time)
);

-- Task Templates
CREATE TABLE IF NOT EXISTS task_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  template_description TEXT,
  task_name_template VARCHAR(255) NOT NULL,
  description_template TEXT,
  estimated_hours DECIMAL(6,2),
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  phase VARCHAR(100),
  pillar VARCHAR(100),
  default_assigned_to VARCHAR(255),
  is_public BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_task_templates_creator (created_by),
  INDEX idx_task_templates_project (project_id),
  INDEX idx_task_templates_public (is_public)
);
