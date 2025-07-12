-- SEO Timeline Dashboard Database Schema for MySQL 8.0

-- Set charset and collation
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS seo_timeline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE seo_timeline;

-- Users table with enhanced authentication
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  profile_image_url VARCHAR(512),
  is_admin BOOLEAN DEFAULT FALSE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP NULL,
  member_authority_score DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects table
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectName VARCHAR(255) NOT NULL,
  ownerId VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_owner (ownerId),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project members table
CREATE TABLE project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT NOT NULL,
  userId VARCHAR(255) NOT NULL,
  permissionLevel ENUM('view', 'edit', 'admin') DEFAULT 'view',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_user (projectId, userId),
  INDEX idx_project (projectId),
  INDEX idx_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks table
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT NOT NULL,
  taskName VARCHAR(255) NOT NULL,
  pillar ENUM('Technical SEO', 'On-Page & Content', 'Off-Page SEO', 'Analytics & Tracking') NOT NULL,
  phase ENUM('Foundation', 'Growth', 'Authority') NOT NULL,
  description TEXT,
  assignedToId VARCHAR(255),
  status ENUM('Not Started', 'In Progress', 'Completed', 'On Hold', 'Overdue') DEFAULT 'Not Started',
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  startDate DATE,
  endDate DATE,
  priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignedToId) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_project (projectId),
  INDEX idx_assigned (assignedToId),
  INDEX idx_status (status),
  INDEX idx_pillar_phase (pillar, phase)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task items for granular tracking
CREATE TABLE task_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taskId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  isCompleted BOOLEAN DEFAULT FALSE,
  completedAt TIMESTAMP NULL,
  completedBy VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (completedBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_task (taskId),
  INDEX idx_completed (isCompleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task sub-items for detailed breakdown
CREATE TABLE task_sub_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taskItemId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  isCompleted BOOLEAN DEFAULT FALSE,
  completedAt TIMESTAMP NULL,
  completedBy VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (taskItemId) REFERENCES task_items(id) ON DELETE CASCADE,
  FOREIGN KEY (completedBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_task_item (taskItemId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table for authentication
CREATE TABLE sessions (
  sid VARCHAR(128) PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL,
  INDEX IDX_session_expire (expire)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Document management tables
CREATE TABLE dms_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  original_filename VARCHAR(255) NOT NULL,
  disk_filename VARCHAR(255) NOT NULL,
  filepath VARCHAR(500) NOT NULL,
  file_extension VARCHAR(10) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(255),
  tags TEXT,
  uploaded_by VARCHAR(255) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  download_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_uploader (uploaded_by),
  INDEX idx_category (category),
  INDEX idx_public (is_public),
  FULLTEXT idx_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task-document linking
CREATE TABLE task_document_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  document_id INT NOT NULL,
  linked_by VARCHAR(255) NOT NULL,
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES dms_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_task_document (task_id, document_id),
  INDEX idx_task (task_id),
  INDEX idx_document (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Document access control
CREATE TABLE document_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  access_type ENUM('read', 'write', 'admin') DEFAULT 'read',
  granted_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES dms_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_document_user (document_id, user_id),
  INDEX idx_document (document_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Document versions
CREATE TABLE document_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  documentId INT NOT NULL,
  versionNumber INT NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  filePath VARCHAR(512) NOT NULL,
  fileSize BIGINT NOT NULL,
  uploadedBy VARCHAR(255) NOT NULL,
  changeNotes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (documentId) REFERENCES dms_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_document_version (documentId, versionNumber),
  INDEX idx_document (documentId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user
INSERT INTO users (id, email, password, first_name, last_name, is_admin, is_email_verified) 
VALUES (
  'admin-001', 
  'jaguzman123@hotmail.com', 
  '$2b$10$f5RffxKwaCo33wpq8jrEDeVg2VB36Bnkj5YZSDTWravasvLPfrk1m', 
  'Admin', 
  'User', 
  TRUE, 
  TRUE
) ON DUPLICATE KEY UPDATE email=email;

-- Create sample project for testing
INSERT INTO projects (projectName, ownerId, description) 
VALUES (
  'SEO Masterplan Demo', 
  'admin-001', 
  'Sample project to demonstrate the SEO Timeline Dashboard features'
) ON DUPLICATE KEY UPDATE projectName=projectName;

-- Add admin as project member
INSERT INTO project_members (projectId, userId, permissionLevel) 
VALUES (
  (SELECT id FROM projects WHERE projectName = 'SEO Masterplan Demo' LIMIT 1),
  'admin-001',
  'admin'
) ON DUPLICATE KEY UPDATE permissionLevel=permissionLevel;