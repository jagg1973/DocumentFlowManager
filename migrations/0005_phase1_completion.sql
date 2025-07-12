-- Phase 1 Completion: Add missing tables for task permissions and comment mentions

-- Task permissions table
CREATE TABLE task_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  permission_type ENUM('view', 'edit', 'admin') NOT NULL,
  granted_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_task_permission (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Task comment mentions table
CREATE TABLE task_comment_mentions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  comment_id INT NOT NULL,
  mentioned_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (comment_id) REFERENCES task_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_task_permissions_task_id ON task_permissions(task_id);
CREATE INDEX idx_task_permissions_user_id ON task_permissions(user_id);
CREATE INDEX idx_task_comment_mentions_comment_id ON task_comment_mentions(comment_id);
CREATE INDEX idx_task_comment_mentions_mentioned_user_id ON task_comment_mentions(mentioned_user_id);
