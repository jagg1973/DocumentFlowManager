import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums first
export const pillarEnum = pgEnum("pillar", ["Technical", "On-Page & Content", "Off-Page", "Analytics"]);
export const phaseEnum = pgEnum("phase", ["1: Foundation", "2: Growth", "3: Authority"]);
export const permissionEnum = pgEnum("permission_level", ["edit", "view"]);
export const statusEnum = pgEnum("status", ["Not Started", "In Progress", "Completed", "On Hold", "Overdue"]);
export const memberLevelEnum = pgEnum("member_level", ["C-Level", "Manager", "SEO Lead", "SEO Specialist", "Junior", "Intern"]);
export const reviewTypeEnum = pgEnum("review_type", ["thumbs_up", "thumbs_down", "star_rating", "detailed_review"]);
export const itemStatusEnum = pgEnum("item_status", ["pending", "in_progress", "completed", "rejected"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "client"]);
export const documentCategoryEnum = pgEnum("document_category", [
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

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enhanced User storage table with Member Authority (MA) system
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  memberLevel: memberLevelEnum("member_level").default("SEO Specialist"),
  memberAuthority: integer("member_authority").default(100), // MA Score (0-1000)
  experienceScore: integer("experience_score").default(50), // E1: Experience
  expertiseScore: integer("expertise_score").default(50), // E2: Expertise  
  authorityScore: integer("authority_score").default(50), // A: Authority
  userRole: userRoleEnum("user_role").default("client"), // DMS Role
  trustScore: integer("trust_score").default(50), // T: Trustworthiness
  tasksCompleted: integer("tasks_completed").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("dms_projects", {
  id: serial("id").primaryKey(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project members with permissions
export const projectMembers = pgTable("dms_project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  permissionLevel: permissionEnum("permission_level").default("view"),
});

// Enhanced Tasks table
export const tasks = pgTable("dms_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  progress: integer("progress").default(0),
  pillar: pillarEnum("pillar"),
  phase: phaseEnum("phase"),
  guidelineDocLink: varchar("guideline_doc_link", { length: 255 }),
  status: statusEnum("status").default("Not Started"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task Items - Granular checklist items within tasks
export const taskItems = pgTable("dms_task_items", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  description: text("description"),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  status: itemStatusEnum("status").default("pending"),
  completedAt: timestamp("completed_at"),
  estimatedHours: decimal("estimated_hours", { precision: 4, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 4, scale: 2 }),
  priority: integer("priority").default(1), // 1-5 scale
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task Sub-items - Non-assignable micro-tasks
export const taskSubItems = pgTable("dms_task_sub_items", {
  id: serial("id").primaryKey(),
  taskItemId: integer("task_item_id").notNull().references(() => taskItems.id, { onDelete: "cascade" }),
  subItemName: varchar("sub_item_name", { length: 255 }).notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task Reviews & Social Validation System
export const taskReviews = pgTable("dms_task_reviews", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  revieweeId: varchar("reviewee_id").notNull().references(() => users.id), // Task assignee
  reviewType: reviewTypeEnum("review_type").notNull(),
  rating: integer("rating"), // 1-5 stars (optional)
  feedback: text("feedback"),
  isPublic: boolean("is_public").default(true),
  authorityWeight: decimal("authority_weight", { precision: 3, scale: 2 }).default("1.00"), // Based on reviewer MA
  createdAt: timestamp("created_at").defaultNow(),
});

// Member Authority History - Track MA changes over time
export const authorityHistory = pgTable("dms_authority_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  previousMA: integer("previous_ma"),
  newMA: integer("new_ma"),
  changeReason: varchar("change_reason", { length: 255 }), // "task_completion", "peer_review", "performance_decay"
  relatedTaskId: integer("related_task_id").references(() => tasks.id),
  relatedReviewId: integer("related_review_id").references(() => taskReviews.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Grace Period Requests - For handling negative reviews
export const gracePeriodRequests = pgTable("dms_grace_period_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  reviewId: integer("review_id").notNull().references(() => taskReviews.id),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected
  requestedDays: integer("requested_days").default(3),
  approvedBy: varchar("approved_by").references(() => users.id),
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
export const dmsDocuments = pgTable("dms_documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  diskFilename: varchar("disk_filename", { length: 255 }).notNull(),
  filepath: varchar("filepath", { length: 500 }).notNull(),
  fileExtension: varchar("file_extension", { length: 10 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  category: documentCategoryEnum("category").notNull(),
  subcategory: varchar("subcategory", { length: 255 }),
  tags: text("tags").array(),
  uploadedBy: varchar("uploaded_by").notNull(),
  isPublic: boolean("is_public").default(false),
  downloadCount: integer("download_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskDocumentLinks = pgTable("task_document_links", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  documentId: integer("document_id").notNull(),
  linkedBy: varchar("linked_by").notNull(),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
});

export const documentAccess = pgTable("document_access", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  userId: varchar("user_id").notNull(),
  accessType: permissionEnum("access_type").notNull(),
  grantedBy: varchar("granted_by").notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
});

export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  diskFilename: varchar("disk_filename", { length: 255 }).notNull(),
  filepath: varchar("filepath", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedBy: varchar("uploaded_by").notNull(),
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