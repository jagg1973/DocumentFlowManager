import {
  mysqlTable,
  text,
  varchar,
  timestamp,
  json,
  index,
  int,
  decimal,
  boolean,
  date,
  mysqlEnum,
  primaryKey,
  bigint,
  unique,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums first
export const pillarEnum = mysqlEnum("pillar", ["Technical", "On-Page & Content", "Off-Page", "Analytics"]);
export const phaseEnum = mysqlEnum("phase", ["1: Foundation", "2: Growth", "3: Authority"]);
export const permissionEnum = mysqlEnum("permission_level", ["edit", "view"]);
export const statusEnum = mysqlEnum("status", ["Not Started", "In Progress", "Completed", "On Hold", "Overdue"]);
export const memberLevelEnum = mysqlEnum("member_level", ["C-Level", "Manager", "SEO Lead", "SEO Specialist", "Junior", "Intern"]);
export const reviewTypeEnum = mysqlEnum("review_type", ["thumbs_up", "thumbs_down", "star_rating", "detailed_review"]);
export const itemStatusEnum = mysqlEnum("item_status", ["pending", "in_progress", "completed", "rejected"]);
export const userRoleEnum = mysqlEnum("user_role", ["admin", "manager", "client"]);
export const documentCategoryEnum = mysqlEnum("document_category", [
  "Executive Summary",
  "Strategic Implementation", 
  "Expert Guidelines",
  "Essential Considerations",
  "Ongoing Management",
  "SEO Email Synergy",
  "SEO Social Media Synergy",
  "SEO Press Release Synergy",
  "SEO PPC Synergy",
  "Templates",
  "Checklists"
]);

// Session storage table for Express Session
export const sessions = mysqlTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enhanced User storage table with Member Authority (MA) system and SAAS auth
export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  profileImageUrl: varchar("profile_image_url", { length: 512 }),
  isAdmin: boolean("is_admin").default(false),
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpires: timestamp("password_reset_expires"),
  memberAuthorityScore: decimal("member_authority_score", { precision: 5, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Projects table
export const projects = mysqlTable("projects", {
  id: int("id").primaryKey().autoincrement(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  ownerId: varchar("owner_id", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project members with permissions
export const projectMembers = mysqlTable("dms_project_members", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  permissionLevel: varchar("permission_level", { length: 50 }).default("view"),
});

// Enhanced Tasks table
export const tasks = mysqlTable("tasks", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  assignedToId: varchar("assigned_to_id", { length: 255 }).references(() => users.id),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  ownerId: varchar("owner_id", { length: 255 }).references(() => users.id),
  lastUpdatedBy: varchar("last_updated_by", { length: 255 }).references(() => users.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  progress: int("progress").default(0),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  estimatedHours: decimal("estimated_hours", { precision: 6, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 6, scale: 2 }),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  dueDate: timestamp("due_date"),
  pillar: varchar("pillar", { length: 100 }),
  phase: varchar("phase", { length: 100 }),
  guidelineDocLink: varchar("guideline_doc_link", { length: 255 }),
  status: varchar("status", { length: 50 }).default("Not Started"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Task Items - Granular checklist items within tasks
export const taskItems = mysqlTable("dms_task_items", {
  id: int("id").primaryKey().autoincrement(),
  taskId: int("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  description: text("description"),
  assignedToId: varchar("assigned_to_id", { length: 255 }).references(() => users.id),
  status: varchar("status", { length: 50 }).default("pending"),
  completedAt: timestamp("completed_at"),
  estimatedHours: decimal("estimated_hours", { precision: 4, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 4, scale: 2 }),
  priority: int("priority").default(1), // 1-5 scale
  orderIndex: int("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Task Sub-items - Non-assignable micro-tasks
export const taskSubItems = mysqlTable("dms_task_sub_items", {
  id: int("id").primaryKey().autoincrement(),
  taskItemId: int("task_item_id").notNull().references(() => taskItems.id, { onDelete: "cascade" }),
  subItemName: varchar("sub_item_name", { length: 255 }).notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  orderIndex: int("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task Reviews & Social Validation System
export const taskReviews = mysqlTable("dms_task_reviews", {
  id: int("id").primaryKey().autoincrement(),
  taskId: int("task_id").notNull().references(() => tasks.id),
  reviewerId: varchar("reviewer_id", { length: 255 }).notNull().references(() => users.id),
  revieweeId: varchar("reviewee_id", { length: 255 }).notNull().references(() => users.id), // Task assignee
  reviewType: varchar("review_type", { length: 50 }).notNull(),
  rating: int("rating"), // 1-5 stars (optional)
  feedback: text("feedback"),
  isPublic: boolean("is_public").default(true),
  authorityWeight: decimal("authority_weight", { precision: 3, scale: 2 }).default("1.00"), // Based on reviewer MA
  createdAt: timestamp("created_at").defaultNow(),
});

// Member Authority History - Track MA changes over time
export const authorityHistory = mysqlTable("dms_authority_history", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  previousMA: int("previous_ma"),
  newMA: int("new_ma"),
  changeReason: varchar("change_reason", { length: 255 }), // "task_completion", "peer_review", "performance_decay"
  relatedTaskId: int("related_task_id").references(() => tasks.id),
  relatedReviewId: int("related_review_id").references(() => taskReviews.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Grace Period Requests - For handling negative reviews
export const gracePeriodRequests = mysqlTable("dms_grace_period_requests", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  taskId: int("task_id").notNull().references(() => tasks.id),
  reviewId: int("review_id").notNull().references(() => taskReviews.id),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected
  requestedDays: int("requested_days").default(3),
  approvedBy: varchar("approved_by", { length: 255 }).references(() => users.id),
  approvedAt: timestamp("approved_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task Followers/Watchers System
export const taskFollowers = mysqlTable("task_followers", {
  id: int("id").primaryKey().autoincrement(),
  taskId: int("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  followType: varchar("follow_type", { length: 50 }).default("explicit"),
  notificationSettings: json("notification_settings").default({
    comments: true,
    updates: true,
    mentions: true,
    statusChanges: true
  }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueTaskFollower: unique("unique_task_follower").on(table.taskId, table.userId),
}));

// Task Comments with Threading
export const taskComments: any = mysqlTable("task_comments", {
  id: int("id").primaryKey().autoincrement(),
  taskId: int("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  parentCommentId: int("parent_comment_id").references((): any => taskComments.id, { onDelete: "cascade" }),
  authorId: varchar("author_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  commentType: varchar("comment_type", { length: 50 }).default("comment"),
  mentionedUsers: json("mentioned_users"),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Comment Reactions
export const taskCommentReactions = mysqlTable("task_comment_reactions", {
  id: int("id").primaryKey().autoincrement(),
  commentId: int("comment_id").notNull().references(() => taskComments.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  reactionType: varchar("reaction_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueCommentReaction: unique("unique_comment_reaction").on(table.commentId, table.userId, table.reactionType),
}));

// Task Attachments
export const taskAttachments = mysqlTable("task_attachments", {
  id: int("id").primaryKey().autoincrement(),
  taskId: int("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  uploadedBy: varchar("uploaded_by", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  storedFilename: varchar("stored_filename", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileExtension: varchar("file_extension", { length: 10 }).notNull(),
  attachmentType: varchar("attachment_type", { length: 50 }).default("file"),
  isPublic: boolean("is_public").default(false),
  downloadCount: int("download_count").default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Task Activity Log
export const taskActivities = mysqlTable("task_activities", {
  id: int("id").primaryKey().autoincrement(),
  taskId: int("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  activityType: varchar("activity_type", { length: 100 }).notNull(),
  activityData: json("activity_data"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  fieldName: varchar("field_name", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task Notifications
export const taskNotifications = mysqlTable("task_notifications", {
  id: int("id").primaryKey().autoincrement(),
  recipientId: varchar("recipient_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: int("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  activityId: int("activity_id").references(() => taskActivities.id, { onDelete: "cascade" }),
  commentId: int("comment_id").references(() => taskComments.id, { onDelete: "cascade" }),
  notificationType: varchar("notification_type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  actionUrl: varchar("action_url", { length: 500 }),
  isRead: boolean("is_read").default(false),
  isPush: boolean("is_push").default(false),
  isEmail: boolean("is_email").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task Dependencies
export const taskDependencies = mysqlTable("task_dependencies", {
  id: int("id").primaryKey().autoincrement(),
  predecessorTaskId: int("predecessor_task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  successorTaskId: int("successor_task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependencyType: varchar("dependency_type", { length: 50 }).default("finish_to_start"),
  lagDays: int("lag_days").default(0),
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueDependency: unique("unique_dependency").on(table.predecessorTaskId, table.successorTaskId),
}));

// Task Time Tracking
export const taskTimeEntries = mysqlTable("task_time_entries", {
  id: int("id").primaryKey().autoincrement(),
  taskId: int("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationMinutes: int("duration_minutes"),
  description: text("description"),
  isBillable: boolean("is_billable").default(false),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Task Templates
export const taskTemplates = mysqlTable("task_templates", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  templateData: json("template_data").notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: int("project_id").references(() => projects.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(false),
  useCount: int("use_count").default(0),
  tags: json("tags"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// User Activity Log table for tracking user actions
export const userActivityLog = mysqlTable(
  "user_activity_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    action: text("action").notNull(),
    description: text("description"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    activityDate: timestamp("activity_date").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    activityDateIdx: index("activity_date_idx").on(table.activityDate),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects),
  projectMemberships: many(projectMembers),
  assignedTasks: many(tasks),
  assignedTaskItems: many(taskItems),
  givenReviews: many(taskReviews, { relationName: "reviewer" }),
  receivedReviews: many(taskReviews, { relationName: "reviewee" }),
  authorityHistory: many(authorityHistory),
  gracePeriodRequests: many(gracePeriodRequests),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  members: many(projectMembers),
  tasks: many(tasks),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignedUser: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
  ownerUser: one(users, {
    fields: [tasks.ownerId],
    references: [users.id],
  }),
  lastUpdatedByUser: one(users, {
    fields: [tasks.lastUpdatedBy],
    references: [users.id],
  }),
  taskItems: many(taskItems),
  reviews: many(taskReviews),
  followers: many(taskFollowers),
  comments: many(taskComments),
  attachments: many(taskAttachments),
  activities: many(taskActivities),
  notifications: many(taskNotifications),
  predecessorDependencies: many(taskDependencies, { relationName: "predecessor" }),
  successorDependencies: many(taskDependencies, { relationName: "successor" }),
  timeEntries: many(taskTimeEntries),
}));

export const taskItemsRelations = relations(taskItems, ({ one, many }) => ({
  task: one(tasks, {
    fields: [taskItems.taskId],
    references: [tasks.id],
  }),
  assignedUser: one(users, {
    fields: [taskItems.assignedToId],
    references: [users.id],
  }),
  subItems: many(taskSubItems),
}));

export const taskSubItemsRelations = relations(taskSubItems, ({ one }) => ({
  taskItem: one(taskItems, {
    fields: [taskSubItems.taskItemId],
    references: [taskItems.id],
  }),
}));

export const taskReviewsRelations = relations(taskReviews, ({ one }) => ({
  task: one(tasks, {
    fields: [taskReviews.taskId],
    references: [tasks.id],
  }),
  reviewer: one(users, {
    fields: [taskReviews.reviewerId],
    references: [users.id],
    relationName: "reviewer",
  }),
  reviewee: one(users, {
    fields: [taskReviews.revieweeId],
    references: [users.id],
    relationName: "reviewee",
  }),
}));

export const authorityHistoryRelations = relations(authorityHistory, ({ one }) => ({
  user: one(users, {
    fields: [authorityHistory.userId],
    references: [users.id],
  }),
  relatedTask: one(tasks, {
    fields: [authorityHistory.relatedTaskId],
    references: [tasks.id],
  }),
  relatedReview: one(taskReviews, {
    fields: [authorityHistory.relatedReviewId],
    references: [taskReviews.id],
  }),
}));

export const gracePeriodRequestsRelations = relations(gracePeriodRequests, ({ one }) => ({
  user: one(users, {
    fields: [gracePeriodRequests.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [gracePeriodRequests.taskId],
    references: [tasks.id],
  }),
  review: one(taskReviews, {
    fields: [gracePeriodRequests.reviewId],
    references: [taskReviews.id],
  }),
  approver: one(users, {
    fields: [gracePeriodRequests.approvedBy],
    references: [users.id],
  }),
}));

// DMS Document Management Tables
export const dmsDocuments = mysqlTable("dms_documents", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  diskFilename: varchar("disk_filename", { length: 255 }).notNull(),
  filepath: varchar("filepath", { length: 500 }).notNull(),
  fileExtension: varchar("file_extension", { length: 10 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: int("file_size").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  subcategory: varchar("subcategory", { length: 255 }),
  tags: text("tags"),
  uploadedBy: varchar("uploaded_by", { length: 255 }).notNull(),
  isPublic: boolean("is_public").default(false),
  downloadCount: int("download_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const taskDocumentLinks = mysqlTable("task_document_links", {
  id: int("id").primaryKey().autoincrement(),
  taskId: int("task_id").notNull(),
  documentId: int("document_id").notNull(),
  linkedBy: varchar("linked_by", { length: 255 }).notNull(),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
});

export const documentAccess = mysqlTable("document_access", {
  id: int("id").primaryKey().autoincrement(),
  documentId: int("document_id").notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  accessType: varchar("access_type", { length: 50 }).notNull(),
  grantedBy: varchar("granted_by", { length: 255 }).notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
});

export const documentVersions = mysqlTable("document_versions", {
  id: int("id").primaryKey().autoincrement(),
  documentId: int("document_id").notNull(),
  versionNumber: int("version_number").notNull(),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  diskFilename: varchar("disk_filename", { length: 255 }).notNull(),
  filepath: varchar("filepath", { length: 500 }).notNull(),
  fileSize: int("file_size").notNull(),
  uploadedBy: varchar("uploaded_by", { length: 255 }).notNull(),
  changeNotes: text("change_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// DMS Relations
export const dmsDocumentsRelations = relations(dmsDocuments, ({ one, many }) => ({
  uploader: one(users, { fields: [dmsDocuments.uploadedBy], references: [users.id] }),
  taskLinks: many(taskDocumentLinks),
  accessPermissions: many(documentAccess),
  versions: many(documentVersions),
}));

export const taskDocumentLinksRelations = relations(taskDocumentLinks, ({ one }) => ({
  task: one(tasks, { fields: [taskDocumentLinks.taskId], references: [tasks.id] }),
  document: one(dmsDocuments, { fields: [taskDocumentLinks.documentId], references: [dmsDocuments.id] }),
  linkedByUser: one(users, { fields: [taskDocumentLinks.linkedBy], references: [users.id] }),
}));

export const documentAccessRelations = relations(documentAccess, ({ one }) => ({
  document: one(dmsDocuments, { fields: [documentAccess.documentId], references: [dmsDocuments.id] }),
  user: one(users, { fields: [documentAccess.userId], references: [users.id] }),
  grantedByUser: one(users, { fields: [documentAccess.grantedBy], references: [users.id] }),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(dmsDocuments, { fields: [documentVersions.documentId], references: [dmsDocuments.id] }),
  uploader: one(users, { fields: [documentVersions.uploadedBy], references: [users.id] }),
}));

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
});

export const insertTaskItemSchema = createInsertSchema(taskItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSubItemSchema = createInsertSchema(taskSubItems).omit({
  id: true,
  createdAt: true,
});

export const insertTaskReviewSchema = createInsertSchema(taskReviews).omit({
  id: true,
  createdAt: true,
  authorityWeight: true,
});

export const insertGracePeriodRequestSchema = createInsertSchema(gracePeriodRequests).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  expiresAt: true,
});

export const insertTaskFollowerSchema = createInsertSchema(taskFollowers).omit({
  id: true,
  createdAt: true,
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskAttachmentSchema = createInsertSchema(taskAttachments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskActivitySchema = createInsertSchema(taskActivities).omit({
  id: true,
  createdAt: true,
});

export const insertTaskNotificationSchema = createInsertSchema(taskNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertTaskDependencySchema = createInsertSchema(taskDependencies).omit({
  id: true,
  createdAt: true,
});

export const insertTaskTimeEntrySchema = createInsertSchema(taskTimeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDmsDocumentSchema = createInsertSchema(dmsDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  downloadCount: true,
});

export const insertTaskDocumentLinkSchema = createInsertSchema(taskDocumentLinks).omit({
  id: true,
  linkedAt: true,
});

export const insertDocumentAccessSchema = createInsertSchema(documentAccess).omit({
  id: true,
  grantedAt: true,
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLog).omit({
  id: true,
  activityDate: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type TaskItem = typeof taskItems.$inferSelect;
export type InsertTaskItem = z.infer<typeof insertTaskItemSchema>;
export type TaskSubItem = typeof taskSubItems.$inferSelect;
export type InsertTaskSubItem = z.infer<typeof insertTaskSubItemSchema>;
export type TaskReview = typeof taskReviews.$inferSelect;
export type InsertTaskReview = z.infer<typeof insertTaskReviewSchema>;
export type AuthorityHistory = typeof authorityHistory.$inferSelect;
export type GracePeriodRequest = typeof gracePeriodRequests.$inferSelect;
export type InsertGracePeriodRequest = z.infer<typeof insertGracePeriodRequestSchema>;

// DMS Schema Types
export type DmsDocument = typeof dmsDocuments.$inferSelect;
export type InsertDmsDocument = z.infer<typeof insertDmsDocumentSchema>;
export type TaskDocumentLink = typeof taskDocumentLinks.$inferSelect;
export type InsertTaskDocumentLink = z.infer<typeof insertTaskDocumentLinkSchema>;
export type DocumentAccess = typeof documentAccess.$inferSelect;
export type InsertDocumentAccess = z.infer<typeof insertDocumentAccessSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;

// Task Management Types
export type TaskFollower = typeof taskFollowers.$inferSelect;
export type InsertTaskFollower = z.infer<typeof insertTaskFollowerSchema>;
export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskCommentReaction = typeof taskCommentReactions.$inferSelect;
export type InsertTaskCommentReaction = typeof taskCommentReactions.$inferInsert;
export type TaskAttachment = typeof taskAttachments.$inferSelect;
export type InsertTaskAttachment = z.infer<typeof insertTaskAttachmentSchema>;
export type TaskActivity = typeof taskActivities.$inferSelect;
export type InsertTaskActivity = z.infer<typeof insertTaskActivitySchema>;
export type TaskNotification = typeof taskNotifications.$inferSelect;
export type InsertTaskNotification = z.infer<typeof insertTaskNotificationSchema>;
export type TaskDependency = typeof taskDependencies.$inferSelect;
export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;
export type TaskTimeEntry = typeof taskTimeEntries.$inferSelect;
export type InsertTaskTimeEntry = z.infer<typeof insertTaskTimeEntrySchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;