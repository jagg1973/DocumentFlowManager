-- Database Schema that EXACTLY matches the Drizzle schema requirements
-- This creates all tables with the exact column names expected by the application

-- Session storage table for Express Session
CREATE TABLE `sessions` (
  `sid` VARCHAR(255) PRIMARY KEY,
  `sess` JSON NOT NULL,
  `expire` TIMESTAMP NOT NULL
);

CREATE INDEX `IDX_session_expire` ON `sessions` (`expire`);

-- Enhanced User storage table with Member Authority (MA) system and SAAS auth
CREATE TABLE `users` (
  `id` VARCHAR(255) PRIMARY KEY NOT NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255),
  `first_name` VARCHAR(255),
  `last_name` VARCHAR(255),
  `profile_image_url` VARCHAR(512),
  `is_admin` BOOLEAN DEFAULT FALSE,
  `is_email_verified` BOOLEAN DEFAULT FALSE,
  `email_verification_token` VARCHAR(255),
  `password_reset_token` VARCHAR(255),
  `password_reset_expires` TIMESTAMP NULL,
  `member_authority_score` DECIMAL(5,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE `projects` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `project_name` VARCHAR(255) NOT NULL,
  `owner_id` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`)
);

-- Project members with permissions
CREATE TABLE `dms_project_members` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `permission_level` VARCHAR(50) DEFAULT 'view',
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

-- Enhanced Tasks table
CREATE TABLE `tasks` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `task_name` VARCHAR(255) NOT NULL,
  `assigned_to_id` VARCHAR(255),
  `start_date` DATE,
  `end_date` DATE,
  `progress` INT DEFAULT 0,
  `pillar` VARCHAR(100),
  `phase` VARCHAR(100),
  `guideline_doc_link` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT 'Not Started',
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`)
);

-- Task Items - Granular checklist items within tasks
CREATE TABLE `dms_task_items` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `task_id` INT NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `assigned_to_id` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT 'pending',
  `completed_at` TIMESTAMP NULL,
  `estimated_hours` DECIMAL(4,2),
  `actual_hours` DECIMAL(4,2),
  `priority` INT DEFAULT 1,
  `order_index` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`)
);

-- Task Sub-items - Non-assignable micro-tasks
CREATE TABLE `dms_task_sub_items` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `task_item_id` INT NOT NULL,
  `sub_item_name` VARCHAR(255) NOT NULL,
  `is_completed` BOOLEAN DEFAULT FALSE,
  `completed_at` TIMESTAMP NULL,
  `order_index` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_item_id`) REFERENCES `dms_task_items`(`id`) ON DELETE CASCADE
);

-- Task Reviews & Social Validation System
CREATE TABLE `dms_task_reviews` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `task_id` INT NOT NULL,
  `reviewer_id` VARCHAR(255) NOT NULL,
  `reviewee_id` VARCHAR(255) NOT NULL,
  `review_type` VARCHAR(50) NOT NULL,
  `rating` INT,
  `feedback` TEXT,
  `is_public` BOOLEAN DEFAULT TRUE,
  `authority_weight` DECIMAL(3,2) DEFAULT 1.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`),
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`reviewee_id`) REFERENCES `users`(`id`)
);

-- Member Authority History - Track MA changes over time
CREATE TABLE `dms_authority_history` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` VARCHAR(255) NOT NULL,
  `previous_ma` INT,
  `new_ma` INT,
  `change_reason` VARCHAR(255),
  `related_task_id` INT,
  `related_review_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`related_task_id`) REFERENCES `tasks`(`id`),
  FOREIGN KEY (`related_review_id`) REFERENCES `dms_task_reviews`(`id`)
);

-- Grace Period Requests - For handling negative reviews
CREATE TABLE `dms_grace_period_requests` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` VARCHAR(255) NOT NULL,
  `task_id` INT NOT NULL,
  `review_id` INT NOT NULL,
  `reason` TEXT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `requested_days` INT DEFAULT 3,
  `approved_by` VARCHAR(255),
  `approved_at` TIMESTAMP NULL,
  `expires_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`),
  FOREIGN KEY (`review_id`) REFERENCES `dms_task_reviews`(`id`),
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`)
);

-- DMS Document Management Tables
CREATE TABLE `dms_documents` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `original_filename` VARCHAR(255) NOT NULL,
  `disk_filename` VARCHAR(255) NOT NULL,
  `filepath` VARCHAR(500) NOT NULL,
  `file_extension` VARCHAR(10) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` INT NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `subcategory` VARCHAR(255),
  `tags` TEXT,
  `uploaded_by` VARCHAR(255) NOT NULL,
  `is_public` BOOLEAN DEFAULT FALSE,
  `download_count` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`)
);

CREATE TABLE `task_document_links` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `task_id` INT NOT NULL,
  `document_id` INT NOT NULL,
  `linked_by` VARCHAR(255) NOT NULL,
  `linked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`),
  FOREIGN KEY (`document_id`) REFERENCES `dms_documents`(`id`),
  FOREIGN KEY (`linked_by`) REFERENCES `users`(`id`)
);

CREATE TABLE `document_access` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `document_id` INT NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `access_type` VARCHAR(50) NOT NULL,
  `granted_by` VARCHAR(255) NOT NULL,
  `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`document_id`) REFERENCES `dms_documents`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`)
);

CREATE TABLE `document_versions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `document_id` INT NOT NULL,
  `version_number` INT NOT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `disk_filename` VARCHAR(255) NOT NULL,
  `filepath` VARCHAR(500) NOT NULL,
  `file_size` INT NOT NULL,
  `uploaded_by` VARCHAR(255) NOT NULL,
  `change_notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`document_id`) REFERENCES `dms_documents`(`id`),
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`)
);

-- Gamification Tables
CREATE TABLE `user_badges` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` VARCHAR(255) NOT NULL,
  `badge_type` VARCHAR(100) NOT NULL,
  `badge_name` VARCHAR(255) NOT NULL,
  `badge_description` VARCHAR(500),
  `icon_name` VARCHAR(255) NOT NULL,
  `earned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `achievements` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `description` VARCHAR(500) NOT NULL,
  `icon_name` VARCHAR(255) NOT NULL,
  `badge_color` VARCHAR(50) DEFAULT 'blue',
  `required_value` INT DEFAULT 1,
  `category` VARCHAR(100) NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `user_activity_log` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` VARCHAR(255) NOT NULL,
  `activity_type` VARCHAR(100) NOT NULL,
  `points_earned` INT DEFAULT 0,
  `related_id` INT,
  `activity_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `leaderboard` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `rank` INT NOT NULL,
  `score` INT NOT NULL,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Insert the test user with the exact ID and credentials expected by the app
INSERT INTO `users` (
  `id`, 
  `email`, 
  `password`, 
  `first_name`, 
  `last_name`, 
  `is_admin`, 
  `is_email_verified`, 
  `member_authority_score`
) VALUES (
  'jaguzman123@hotmail.com', 
  'jaguzman123@hotmail.com', 
  '$2b$10$sD.bnlq7FnTMf5yb2A5X4O17H39M.z7HZqyHZ1jRJWsn1h8eI8gfG', 
  'Admin', 
  'User', 
  true, 
  true, 
  100.00
);
