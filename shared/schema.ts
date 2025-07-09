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
  mysqlEnum,
  date,
  primaryKey,
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
  startDate: date("start_date"),
  endDate: date("end_date"),
  progress: int("progress").default(0),
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
  taskItems: many(taskItems),
  reviews: many(taskReviews),
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

export type DmsDocument = typeof dmsDocuments.$inferSelect;
export type InsertDmsDocument = z.infer<typeof insertDmsDocumentSchema>;
export type TaskDocumentLink = typeof taskDocumentLinks.$inferSelect;
export type InsertTaskDocumentLink = z.infer<typeof insertTaskDocumentLinkSchema>;
export type DocumentAccess = typeof documentAccess.$inferSelect;
export type InsertDocumentAccess = z.infer<typeof insertDocumentAccessSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;

// Gamification Tables

// User Badges
export const userBadges = mysqlTable("user_badges", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeType: varchar("badge_type", { length: 100 }).notNull(),
  badgeName: varchar("badge_name", { length: 255 }).notNull(),
  badgeDescription: varchar("badge_description", { length: 500 }),
  iconName: varchar("icon_name", { length: 255 }).notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// Achievement Definitions
export const achievements = mysqlTable("achievements", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: varchar("description", { length: 500 }).notNull(),
  iconName: varchar("icon_name", { length: 255 }).notNull(),
  badgeColor: varchar("badge_color", { length: 50 }).default("blue"),
  requiredValue: int("required_value").default(1),
  category: varchar("category", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Activity Log
export const userActivityLog = mysqlTable("user_activity_log", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  activityType: varchar("activity_type", { length: 100 }).notNull(),
  pointsEarned: int("points_earned").default(0),
  relatedId: int("related_id"),
  activityDate: timestamp("activity_date").defaultNow(),
});

// Leaderboard entries
export const leaderboard = mysqlTable("leaderboard", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }).notNull(),
  rank: int("rank").notNull(),
  score: int("score").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Gamification Relations
export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
}));

export const userActivityLogRelations = relations(userActivityLog, ({ one }) => ({
  user: one(users, {
    fields: [userActivityLog.userId],
    references: [users.id],
  }),
}));

export const leaderboardRelations = relations(leaderboard, ({ one }) => ({
  user: one(users, {
    fields: [leaderboard.userId],
    references: [users.id],
  }),
}));

// Gamification Types
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof userBadges.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;
export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type InsertUserActivityLog = typeof userActivityLog.$inferInsert;
export type Leaderboard = typeof leaderboard.$inferSelect;
export type InsertLeaderboard = typeof leaderboard.$inferInsert;