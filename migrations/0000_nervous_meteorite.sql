CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(500) NOT NULL,
	`icon_name` varchar(255) NOT NULL,
	`badge_color` varchar(50) DEFAULT 'blue',
	`required_value` int DEFAULT 1,
	`category` varchar(100) NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `achievements_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `dms_authority_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`previous_ma` int,
	`new_ma` int,
	`change_reason` varchar(255),
	`related_task_id` int,
	`related_review_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `dms_authority_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dms_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`original_filename` varchar(255) NOT NULL,
	`disk_filename` varchar(255) NOT NULL,
	`filepath` varchar(500) NOT NULL,
	`file_extension` varchar(10) NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`file_size` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`subcategory` varchar(255),
	`tags` text,
	`uploaded_by` varchar(255) NOT NULL,
	`is_public` boolean DEFAULT false,
	`download_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dms_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`access_type` varchar(50) NOT NULL,
	`granted_by` varchar(255) NOT NULL,
	`granted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_access_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int NOT NULL,
	`version_number` int NOT NULL,
	`original_filename` varchar(255) NOT NULL,
	`disk_filename` varchar(255) NOT NULL,
	`filepath` varchar(500) NOT NULL,
	`file_size` int NOT NULL,
	`uploaded_by` varchar(255) NOT NULL,
	`change_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dms_grace_period_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`task_id` int NOT NULL,
	`review_id` int NOT NULL,
	`reason` text NOT NULL,
	`status` varchar(50) DEFAULT 'pending',
	`requested_days` int DEFAULT 3,
	`approved_by` varchar(255),
	`approved_at` timestamp,
	`expires_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `dms_grace_period_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaderboard` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`rank` int NOT NULL,
	`score` int NOT NULL,
	`last_updated` timestamp DEFAULT (now()),
	CONSTRAINT `leaderboard_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dms_project_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`permission_level` varchar(50) DEFAULT 'view',
	CONSTRAINT `dms_project_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_name` varchar(255) NOT NULL,
	`owner_id` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`sid` varchar(255) NOT NULL,
	`sess` json NOT NULL,
	`expire` timestamp NOT NULL,
	CONSTRAINT `sessions_sid` PRIMARY KEY(`sid`)
);
--> statement-breakpoint
CREATE TABLE `task_document_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`document_id` int NOT NULL,
	`linked_by` varchar(255) NOT NULL,
	`linked_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_document_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dms_task_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`item_name` varchar(255) NOT NULL,
	`description` text,
	`assigned_to_id` varchar(255),
	`status` varchar(50) DEFAULT 'pending',
	`completed_at` timestamp,
	`estimated_hours` decimal(4,2),
	`actual_hours` decimal(4,2),
	`priority` int DEFAULT 1,
	`order_index` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dms_task_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dms_task_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`reviewer_id` varchar(255) NOT NULL,
	`reviewee_id` varchar(255) NOT NULL,
	`review_type` varchar(50) NOT NULL,
	`rating` int,
	`feedback` text,
	`is_public` boolean DEFAULT true,
	`authority_weight` decimal(3,2) DEFAULT '1.00',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `dms_task_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dms_task_sub_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_item_id` int NOT NULL,
	`sub_item_name` varchar(255) NOT NULL,
	`is_completed` boolean DEFAULT false,
	`completed_at` timestamp,
	`order_index` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `dms_task_sub_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`task_name` varchar(255) NOT NULL,
	`assigned_to_id` varchar(255),
	`start_date` date,
	`end_date` date,
	`progress` int DEFAULT 0,
	`pillar` varchar(100),
	`phase` varchar(100),
	`guideline_doc_link` varchar(255),
	`status` varchar(50) DEFAULT 'Not Started',
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`activity_type` varchar(100) NOT NULL,
	`points_earned` int DEFAULT 0,
	`related_id` int,
	`activity_date` timestamp DEFAULT (now()),
	CONSTRAINT `user_activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`badge_type` varchar(100) NOT NULL,
	`badge_name` varchar(255) NOT NULL,
	`badge_description` varchar(500),
	`icon_name` varchar(255) NOT NULL,
	`earned_at` timestamp DEFAULT (now()),
	CONSTRAINT `user_badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255),
	`first_name` varchar(255),
	`last_name` varchar(255),
	`profile_image_url` varchar(512),
	`is_admin` boolean DEFAULT false,
	`is_email_verified` boolean DEFAULT false,
	`email_verification_token` varchar(255),
	`password_reset_token` varchar(255),
	`password_reset_expires` timestamp,
	`member_authority_score` decimal(5,2) DEFAULT '0.00',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `dms_authority_history` ADD CONSTRAINT `dms_authority_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_authority_history` ADD CONSTRAINT `dms_authority_history_related_task_id_tasks_id_fk` FOREIGN KEY (`related_task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_authority_history` ADD CONSTRAINT `dms_authority_history_related_review_id_dms_task_reviews_id_fk` FOREIGN KEY (`related_review_id`) REFERENCES `dms_task_reviews`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_grace_period_requests` ADD CONSTRAINT `dms_grace_period_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_grace_period_requests` ADD CONSTRAINT `dms_grace_period_requests_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_grace_period_requests` ADD CONSTRAINT `dms_grace_period_requests_review_id_dms_task_reviews_id_fk` FOREIGN KEY (`review_id`) REFERENCES `dms_task_reviews`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_grace_period_requests` ADD CONSTRAINT `dms_grace_period_requests_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leaderboard` ADD CONSTRAINT `leaderboard_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_project_members` ADD CONSTRAINT `dms_project_members_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_project_members` ADD CONSTRAINT `dms_project_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_task_items` ADD CONSTRAINT `dms_task_items_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_task_items` ADD CONSTRAINT `dms_task_items_assigned_to_id_users_id_fk` FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_task_reviews` ADD CONSTRAINT `dms_task_reviews_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_task_reviews` ADD CONSTRAINT `dms_task_reviews_reviewer_id_users_id_fk` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_task_reviews` ADD CONSTRAINT `dms_task_reviews_reviewee_id_users_id_fk` FOREIGN KEY (`reviewee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dms_task_sub_items` ADD CONSTRAINT `dms_task_sub_items_task_item_id_dms_task_items_id_fk` FOREIGN KEY (`task_item_id`) REFERENCES `dms_task_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_to_id_users_id_fk` FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_activity_log` ADD CONSTRAINT `user_activity_log_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_badges` ADD CONSTRAINT `user_badges_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `IDX_session_expire` ON `sessions` (`expire`);