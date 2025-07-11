-- Migration: Task Management Enhancements
-- Version: 0001
-- Description: Adds comprehensive task management features including ownership, followers, comments, attachments, and activity tracking

-- ================================================
-- PHASE 1: ENHANCE EXISTING TASKS TABLE
-- ================================================

-- Add new columns to existing tasks table
ALTER TABLE tasks 
ADD COLUMN created_by VARCHAR(255) AFTER assigned_to_id,
ADD COLUMN owner_id VARCHAR(255) AFTER created_by,
ADD COLUMN last_updated_by VARCHAR(255) AFTER owner_id,
ADD COLUMN priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' AFTER progress,
ADD COLUMN estimated_hours DECIMAL(6,2) AFTER priority,
ADD COLUMN actual_hours DECIMAL(6,2) AFTER estimated_hours,
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE AFTER actual_hours,
ADD COLUMN archived_at TIMESTAMP NULL AFTER is_archived,
ADD COLUMN due_date TIMESTAMP NULL AFTER archived_at;

-- Add foreign key constraints to tasks table
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_tasks_owner_id FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_tasks_last_updated_by FOREIGN KEY (last_updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_archived ON tasks(is_archived);

-- ================================================
-- PHASE 2: CREATE NEW TASK MANAGEMENT TABLES
-- ================================================

-- Task Followers/Watchers
CREATE TABLE task_followers (
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

-- Task Comments with Threading Support
CREATE TABLE task_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  parent_comment_id INT NULL,
  author_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  comment_type ENUM('comment', 'system', 'status_change', 'assignment_change') DEFAULT 'comment',
  mentioned_users JSON DEFAULT NULL, -- Array of user IDs mentioned in comment
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES task_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_comments_task (task_id, created_at),
  INDEX idx_task_comments_parent (parent_comment_id),
  INDEX idx_task_comments_author (author_id)
);

-- Comment Reactions (Like, Love, Laugh, etc.)
CREATE TABLE task_comment_reactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  comment_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  reaction_type ENUM('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'thumbs_up', 'thumbs_down') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_comment_reaction (comment_id, user_id, reaction_type),
  FOREIGN KEY (comment_id) REFERENCES task_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_comment_reactions_comment (comment_id),
  INDEX idx_comment_reactions_user (user_id)
);

-- Task Attachments
CREATE TABLE task_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  uploaded_by VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_extension VARCHAR(10) NOT NULL,
  attachment_type ENUM('file', 'image', 'document', 'video', 'audio') DEFAULT 'file',
  is_public BOOLEAN DEFAULT FALSE,
  download_count INT DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_attachments_task (task_id),
  INDEX idx_task_attachments_user (uploaded_by),
  INDEX idx_task_attachments_type (attachment_type)
);

-- Task Activity Log
CREATE TABLE task_activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  activity_data JSON,
  old_value TEXT,
  new_value TEXT,
  field_name VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_activities_task (task_id, created_at),
  INDEX idx_task_activities_user (user_id, created_at),
  INDEX idx_task_activities_type (activity_type)
);

-- Task Notifications
CREATE TABLE task_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recipient_id VARCHAR(255) NOT NULL,
  task_id INT NOT NULL,
  activity_id INT,
  comment_id INT,
  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  is_push BOOLEAN DEFAULT FALSE,
  is_email BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES task_activities(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES task_comments(id) ON DELETE CASCADE,
  INDEX idx_task_notifications_recipient (recipient_id, is_read, created_at),
  INDEX idx_task_notifications_task (task_id),
  INDEX idx_task_notifications_type (notification_type)
);

-- Task Dependencies
CREATE TABLE task_dependencies (
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
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_dependencies_predecessor (predecessor_task_id),
  INDEX idx_task_dependencies_successor (successor_task_id)
);

-- Task Time Tracking
CREATE TABLE task_time_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NULL,
  duration_minutes INT,
  description TEXT,
  is_billable BOOLEAN DEFAULT FALSE,
  hourly_rate DECIMAL(8,2),
  is_active BOOLEAN DEFAULT FALSE, -- For tracking currently running timers
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_time_entries_task (task_id),
  INDEX idx_task_time_entries_user (user_id, start_time),
  INDEX idx_task_time_entries_active (is_active)
);

-- Task Templates
CREATE TABLE task_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_data JSON NOT NULL, -- Complete task structure with items and sub-items
  created_by VARCHAR(255) NOT NULL,
  project_id INT, -- If template is project-specific
  is_public BOOLEAN DEFAULT FALSE,
  use_count INT DEFAULT 0,
  tags JSON, -- Array of tags
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_task_templates_creator (created_by),
  INDEX idx_task_templates_project (project_id),
  INDEX idx_task_templates_public (is_public)
);

-- ================================================
-- PHASE 3: UPDATE EXISTING DATA
-- ================================================

-- Set default values for new columns
UPDATE tasks 
SET 
  created_by = 'system',
  owner_id = assigned_to_id,
  last_updated_by = 'system',
  priority = 'medium'
WHERE created_by IS NULL OR owner_id IS NULL OR last_updated_by IS NULL;

-- ================================================
-- PHASE 4: CREATE TRIGGERS FOR AUTOMATIC ACTIONS
-- ================================================

-- Trigger to automatically follow tasks when assigned
DELIMITER //
CREATE TRIGGER task_assignment_follow 
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
  IF NEW.assigned_to_id IS NOT NULL AND (OLD.assigned_to_id IS NULL OR OLD.assigned_to_id != NEW.assigned_to_id) THEN
    INSERT IGNORE INTO task_followers (task_id, user_id, follow_type) 
    VALUES (NEW.id, NEW.assigned_to_id, 'auto_assignee');
  END IF;
END //
DELIMITER ;

-- Trigger to automatically follow tasks when created
DELIMITER //
CREATE TRIGGER task_creation_follow 
AFTER INSERT ON tasks
FOR EACH ROW
BEGIN
  -- Creator follows the task
  IF NEW.created_by IS NOT NULL THEN
    INSERT IGNORE INTO task_followers (task_id, user_id, follow_type) 
    VALUES (NEW.id, NEW.created_by, 'auto_creator');
  END IF;
  
  -- Owner follows the task (if different from creator)
  IF NEW.owner_id IS NOT NULL AND NEW.owner_id != NEW.created_by THEN
    INSERT IGNORE INTO task_followers (task_id, user_id, follow_type) 
    VALUES (NEW.id, NEW.owner_id, 'auto_owner');
  END IF;
  
  -- Assignee follows the task (if different from creator and owner)
  IF NEW.assigned_to_id IS NOT NULL AND NEW.assigned_to_id != NEW.created_by AND NEW.assigned_to_id != NEW.owner_id THEN
    INSERT IGNORE INTO task_followers (task_id, user_id, follow_type) 
    VALUES (NEW.id, NEW.assigned_to_id, 'auto_assignee');
  END IF;
END //
DELIMITER ;

-- Trigger to log task activities
DELIMITER //
CREATE TRIGGER task_activity_log 
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
  DECLARE activity_description TEXT;
  
  -- Log status changes
  IF OLD.status != NEW.status THEN
    INSERT INTO task_activities (task_id, user_id, activity_type, old_value, new_value, field_name, description) 
    VALUES (NEW.id, NEW.last_updated_by, 'status_change', OLD.status, NEW.status, 'status', 
            CONCAT('Status changed from "', OLD.status, '" to "', NEW.status, '"'));
  END IF;
  
  -- Log assignment changes
  IF IFNULL(OLD.assigned_to_id, '') != IFNULL(NEW.assigned_to_id, '') THEN
    INSERT INTO task_activities (task_id, user_id, activity_type, old_value, new_value, field_name, description) 
    VALUES (NEW.id, NEW.last_updated_by, 'assignment_change', OLD.assigned_to_id, NEW.assigned_to_id, 'assigned_to_id', 
            CONCAT('Assignment changed'));
  END IF;
  
  -- Log progress changes
  IF OLD.progress != NEW.progress THEN
    INSERT INTO task_activities (task_id, user_id, activity_type, old_value, new_value, field_name, description) 
    VALUES (NEW.id, NEW.last_updated_by, 'progress_change', OLD.progress, NEW.progress, 'progress', 
            CONCAT('Progress updated from ', OLD.progress, '% to ', NEW.progress, '%'));
  END IF;
  
  -- Log priority changes
  IF OLD.priority != NEW.priority THEN
    INSERT INTO task_activities (task_id, user_id, activity_type, old_value, new_value, field_name, description) 
    VALUES (NEW.id, NEW.last_updated_by, 'priority_change', OLD.priority, NEW.priority, 'priority', 
            CONCAT('Priority changed from "', OLD.priority, '" to "', NEW.priority, '"'));
  END IF;
END //
DELIMITER ;

-- ================================================
-- PHASE 5: CREATE INITIAL DATA
-- ================================================

-- Create system notification types
INSERT INTO task_notifications (recipient_id, task_id, notification_type, title, message, is_read, created_at) 
VALUES 
  ('system', 1, 'system_init', 'Task Management Enhanced', 'Advanced task management features have been enabled', TRUE, NOW())
ON DUPLICATE KEY UPDATE id = id;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

-- Log migration completion
INSERT INTO task_activities (task_id, user_id, activity_type, description) 
SELECT 1, 'system', 'migration_complete', 'Task management enhancements migration completed successfully'
WHERE EXISTS (SELECT 1 FROM tasks LIMIT 1);
