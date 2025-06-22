import {
  users,
  projects,
  tasks,
  projectMembers,
  taskItems,
  taskSubItems,
  taskReviews,
  authorityHistory,
  gracePeriodRequests,
  dmsDocuments,
  taskDocumentLinks,
  documentAccess,
  documentVersions,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type ProjectMember,
  type InsertProjectMember,
  type TaskItem,
  type InsertTaskItem,
  type TaskSubItem,
  type InsertTaskSubItem,
  type TaskReview,
  type InsertTaskReview,
  type AuthorityHistory,
  type GracePeriodRequest,
  type InsertGracePeriodRequest,
  type DmsDocument,
  type InsertDmsDocument,
  type TaskDocumentLink,
  type InsertTaskDocumentLink,
  type DocumentAccess,
  type InsertDocumentAccess,
  type DocumentVersion,
  type InsertDocumentVersion,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc, asc, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsForUser(userId: string): Promise<Project[]>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksForProject(projectId: number): Promise<Task[]>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;
  
  // Project member operations
  addProjectMember(member: InsertProjectMember): Promise<ProjectMember>;
  getProjectMembers(projectId: number): Promise<(ProjectMember & { user: User })[]>;
  updateProjectMember(id: number, member: Partial<InsertProjectMember>): Promise<ProjectMember | undefined>;
  removeProjectMember(id: number): Promise<void>;
  checkUserProjectAccess(userId: string, projectId: number): Promise<{ hasAccess: boolean; permission?: string }>;
  
  // Search users for member invitation
  searchUsers(query: string): Promise<User[]>;
  
  // Task Items operations
  createTaskItem(item: InsertTaskItem): Promise<TaskItem>;
  getTaskItems(taskId: number): Promise<TaskItem[]>;
  updateTaskItem(id: number, item: Partial<InsertTaskItem>): Promise<TaskItem | undefined>;
  deleteTaskItem(id: number): Promise<void>;
  
  // Task Sub-items operations
  createTaskSubItem(subItem: InsertTaskSubItem): Promise<TaskSubItem>;
  getTaskSubItems(taskItemId: number): Promise<TaskSubItem[]>;
  updateTaskSubItem(id: number, subItem: Partial<InsertTaskSubItem>): Promise<TaskSubItem | undefined>;
  deleteTaskSubItem(id: number): Promise<void>;
  
  // Task Reviews & Authority System
  createTaskReview(review: InsertTaskReview): Promise<TaskReview>;
  getTaskReviews(taskId: number): Promise<(TaskReview & { reviewer: User; reviewee: User })[]>;
  updateMemberAuthority(userId: string, reason: string, relatedTaskId?: number, relatedReviewId?: number): Promise<void>;
  calculateMemberAuthorityScore(userId: string): Promise<number>;
  
  // Grace Period Requests
  createGracePeriodRequest(request: InsertGracePeriodRequest): Promise<GracePeriodRequest>;
  getGracePeriodRequests(userId: string): Promise<GracePeriodRequest[]>;
  approveGracePeriodRequest(requestId: number, approverId: string): Promise<void>;
  
  // DMS Document Management
  createDocument(document: InsertDmsDocument): Promise<DmsDocument>;
  getDocument(id: number): Promise<DmsDocument | undefined>;
  getDocuments(filters?: { search?: string; category?: string; userId?: string; isPublic?: boolean }): Promise<(DmsDocument & { uploader: User })[]>;
  updateDocument(id: number, document: Partial<InsertDmsDocument>): Promise<DmsDocument | undefined>;
  deleteDocument(id: number): Promise<void>;
  incrementDownloadCount(id: number): Promise<void>;
  
  // Document-Task Linking
  linkDocumentToTask(link: InsertTaskDocumentLink): Promise<TaskDocumentLink>;
  unlinkDocumentFromTask(linkId: number): Promise<void>;
  getTaskDocuments(taskId: number): Promise<(DmsDocument & { uploader: User })[]>;
  getDocumentTasks(documentId: number): Promise<(Task & { project: Project })[]>;
  
  // Document Access Control
  grantDocumentAccess(access: InsertDocumentAccess): Promise<DocumentAccess>;
  revokeDocumentAccess(accessId: number): Promise<void>;
  checkDocumentAccess(userId: string, documentId: number): Promise<{ hasAccess: boolean; accessType?: string }>;
  
  // Document Versions
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  getDocumentVersions(documentId: number): Promise<(DocumentVersion & { uploader: User })[]>;
  
  // Admin Statistics
  getAdminStats(): Promise<{
    totalDocuments: number;
    totalUsers: number;
    totalDownloads: number;
    storageUsed: string;
    newDocumentsThisWeek: number;
    newUsersThisWeek: number;
    downloadsThisWeek: number;
    storagePercentage: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    
    // Add owner as project member with edit permission
    await this.addProjectMember({
      projectId: newProject.id,
      userId: project.ownerId,
      permissionLevel: "edit",
    });
    
    return newProject;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsForUser(userId: string): Promise<Project[]> {
    const userProjects = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        ownerId: projects.ownerId,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, userId))
      .orderBy(desc(projects.createdAt));
    
    return userProjects;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.projectId, id));
    await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Task operations
  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values({
      ...task,
      updatedAt: new Date(),
    }).returning();
    return newTask;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksForProject(projectId: number): Promise<Task[]> {
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(asc(tasks.createdAt));
    
    return projectTasks;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set({
        ...task,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Project member operations
  async addProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
    const [newMember] = await db.insert(projectMembers).values(member).returning();
    return newMember;
  }

  async getProjectMembers(projectId: number): Promise<(ProjectMember & { user: User })[]> {
    const members = await db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        permissionLevel: projectMembers.permissionLevel,
        user: users,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));
    
    return members;
  }

  async updateProjectMember(id: number, member: Partial<InsertProjectMember>): Promise<ProjectMember | undefined> {
    const [updatedMember] = await db
      .update(projectMembers)
      .set(member)
      .where(eq(projectMembers.id, id))
      .returning();
    return updatedMember;
  }

  async removeProjectMember(id: number): Promise<void> {
    await db.delete(projectMembers).where(eq(projectMembers.id, id));
  }

  async checkUserProjectAccess(userId: string, projectId: number): Promise<{ hasAccess: boolean; permission?: string }> {
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.userId, userId),
        eq(projectMembers.projectId, projectId)
      ));
    
    return {
      hasAccess: !!member,
      permission: member?.permissionLevel || undefined,
    };
  }

  async searchUsers(query: string): Promise<User[]> {
    if (!query || query.length < 2) return [];
    
    const searchResults = await db
      .select()
      .from(users)
      .where(
        // Simple search by email, firstName, lastName
        // In production, you might want to use full-text search
        eq(users.email, query)
      )
      .limit(10);
    
    return searchResults;
  }

  // Task Items operations
  async createTaskItem(item: InsertTaskItem): Promise<TaskItem> {
    const [newItem] = await db.insert(taskItems).values(item).returning();
    return newItem;
  }

  async getTaskItems(taskId: number): Promise<TaskItem[]> {
    const items = await db
      .select()
      .from(taskItems)
      .where(eq(taskItems.taskId, taskId))
      .orderBy(asc(taskItems.id));
    
    return items;
  }

  async updateTaskItem(id: number, item: Partial<InsertTaskItem>): Promise<TaskItem | undefined> {
    const [updatedItem] = await db
      .update(taskItems)
      .set(item)
      .where(eq(taskItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteTaskItem(id: number): Promise<void> {
    await db.delete(taskItems).where(eq(taskItems.id, id));
  }

  // Task Sub-items operations
  async createTaskSubItem(subItem: InsertTaskSubItem): Promise<TaskSubItem> {
    const [newSubItem] = await db.insert(taskSubItems).values(subItem).returning();
    return newSubItem;
  }

  async getTaskSubItems(taskItemId: number): Promise<TaskSubItem[]> {
    const subItems = await db
      .select()
      .from(taskSubItems)
      .where(eq(taskSubItems.taskItemId, taskItemId))
      .orderBy(asc(taskSubItems.id));
    
    return subItems;
  }

  async updateTaskSubItem(id: number, subItem: Partial<InsertTaskSubItem>): Promise<TaskSubItem | undefined> {
    const [updatedSubItem] = await db
      .update(taskSubItems)
      .set(subItem)
      .where(eq(taskSubItems.id, id))
      .returning();
    return updatedSubItem;
  }

  async deleteTaskSubItem(id: number): Promise<void> {
    await db.delete(taskSubItems).where(eq(taskSubItems.id, id));
  }

  // Task Reviews & Authority System
  async createTaskReview(review: InsertTaskReview): Promise<TaskReview> {
    const [newReview] = await db.insert(taskReviews).values(review).returning();
    return newReview;
  }

  async getTaskReviews(taskId: number): Promise<(TaskReview & { reviewer: User; reviewee: User })[]> {
    const reviews = await db
      .select({
        id: taskReviews.id,
        taskId: taskReviews.taskId,
        reviewerId: taskReviews.reviewerId,
        revieweeId: taskReviews.revieweeId,
        reviewType: taskReviews.reviewType,
        rating: taskReviews.rating,
        feedback: taskReviews.feedback,
        createdAt: taskReviews.createdAt,
        reviewer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        reviewee: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(taskReviews)
      .innerJoin(users, eq(taskReviews.reviewerId, users.id))
      .where(eq(taskReviews.taskId, taskId))
      .orderBy(desc(taskReviews.createdAt));
    
    return reviews as any;
  }

  async updateMemberAuthority(userId: string, reason: string, relatedTaskId?: number, relatedReviewId?: number): Promise<void> {
    await db.insert(authorityHistory).values({
      userId,
      changeReason: reason,
      relatedTaskId,
      relatedReviewId,
    });
  }

  async calculateMemberAuthorityScore(userId: string): Promise<number> {
    // This would implement the E-E-A-T scoring algorithm
    // For now, return a simple score based on review count
    const reviews = await db
      .select()
      .from(taskReviews)
      .where(eq(taskReviews.revieweeId, userId));
    
    return reviews.length * 10; // Simple calculation
  }

  // Grace Period Requests
  async createGracePeriodRequest(request: InsertGracePeriodRequest): Promise<GracePeriodRequest> {
    const [newRequest] = await db.insert(gracePeriodRequests).values(request).returning();
    return newRequest;
  }

  async getGracePeriodRequests(userId: string): Promise<GracePeriodRequest[]> {
    const requests = await db
      .select()
      .from(gracePeriodRequests)
      .where(eq(gracePeriodRequests.userId, userId))
      .orderBy(desc(gracePeriodRequests.createdAt));
    
    return requests;
  }

  async approveGracePeriodRequest(requestId: number, approverId: string): Promise<void> {
    await db
      .update(gracePeriodRequests)
      .set({
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
      })
      .where(eq(gracePeriodRequests.id, requestId));
  }

  // DMS Document Management Implementation
  async createDocument(document: InsertDmsDocument): Promise<DmsDocument> {
    const [newDocument] = await this.db
      .insert(dmsDocuments)
      .values(document)
      .returning();
    return newDocument;
  }

  async getDocument(id: number): Promise<DmsDocument | undefined> {
    const [document] = await this.db
      .select()
      .from(dmsDocuments)
      .where(eq(dmsDocuments.id, id));
    return document;
  }

  async getDocuments(filters?: { search?: string; category?: string; userId?: string; isPublic?: boolean }): Promise<(DmsDocument & { uploader: User })[]> {
    let query = this.db
      .select({
        id: dmsDocuments.id,
        title: dmsDocuments.title,
        description: dmsDocuments.description,
        originalFilename: dmsDocuments.originalFilename,
        diskFilename: dmsDocuments.diskFilename,
        filepath: dmsDocuments.filepath,
        fileExtension: dmsDocuments.fileExtension,
        mimeType: dmsDocuments.mimeType,
        fileSize: dmsDocuments.fileSize,
        category: dmsDocuments.category,
        subcategory: dmsDocuments.subcategory,
        tags: dmsDocuments.tags,
        uploadedBy: dmsDocuments.uploadedBy,
        isPublic: dmsDocuments.isPublic,
        downloadCount: dmsDocuments.downloadCount,
        createdAt: dmsDocuments.createdAt,
        updatedAt: dmsDocuments.updatedAt,
        uploader: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(dmsDocuments)
      .leftJoin(users, eq(dmsDocuments.uploadedBy, users.id));

    if (filters?.search) {
      query = query.where(
        or(
          ilike(dmsDocuments.title, `%${filters.search}%`),
          ilike(dmsDocuments.description, `%${filters.search}%`)
        )
      );
    }

    if (filters?.category) {
      query = query.where(eq(dmsDocuments.category, filters.category));
    }

    if (filters?.userId) {
      query = query.where(eq(dmsDocuments.uploadedBy, filters.userId));
    }

    if (filters?.isPublic !== undefined) {
      query = query.where(eq(dmsDocuments.isPublic, filters.isPublic));
    }

    const results = await query.orderBy(desc(dmsDocuments.createdAt));
    return results.map(row => ({
      ...row,
      uploader: {
        ...row.uploader,
        firstName: row.uploader.firstName || "",
        lastName: row.uploader.lastName || "",
      }
    })) as (DmsDocument & { uploader: User })[];
  }

  async updateDocument(id: number, document: Partial<InsertDmsDocument>): Promise<DmsDocument | undefined> {
    const [updated] = await this.db
      .update(dmsDocuments)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(dmsDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteDocument(id: number): Promise<void> {
    await this.db.delete(taskDocumentLinks).where(eq(taskDocumentLinks.documentId, id));
    await this.db.delete(documentAccess).where(eq(documentAccess.documentId, id));
    await this.db.delete(documentVersions).where(eq(documentVersions.documentId, id));
    await this.db.delete(dmsDocuments).where(eq(dmsDocuments.id, id));
  }

  async incrementDownloadCount(id: number): Promise<void> {
    await this.db
      .update(dmsDocuments)
      .set({ downloadCount: sql`${dmsDocuments.downloadCount} + 1` })
      .where(eq(dmsDocuments.id, id));
  }

  async linkDocumentToTask(link: InsertTaskDocumentLink): Promise<TaskDocumentLink> {
    const [newLink] = await this.db
      .insert(taskDocumentLinks)
      .values(link)
      .returning();
    return newLink;
  }

  async unlinkDocumentFromTask(linkId: number): Promise<void> {
    await this.db
      .delete(taskDocumentLinks)
      .where(eq(taskDocumentLinks.id, linkId));
  }

  async getTaskDocuments(taskId: number): Promise<(DmsDocument & { uploader: User })[]> {
    const results = await this.db
      .select({
        id: dmsDocuments.id,
        title: dmsDocuments.title,
        description: dmsDocuments.description,
        originalFilename: dmsDocuments.originalFilename,
        diskFilename: dmsDocuments.diskFilename,
        filepath: dmsDocuments.filepath,
        fileExtension: dmsDocuments.fileExtension,
        mimeType: dmsDocuments.mimeType,
        fileSize: dmsDocuments.fileSize,
        category: dmsDocuments.category,
        subcategory: dmsDocuments.subcategory,
        tags: dmsDocuments.tags,
        uploadedBy: dmsDocuments.uploadedBy,
        isPublic: dmsDocuments.isPublic,
        downloadCount: dmsDocuments.downloadCount,
        createdAt: dmsDocuments.createdAt,
        updatedAt: dmsDocuments.updatedAt,
        uploader: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(taskDocumentLinks)
      .innerJoin(dmsDocuments, eq(taskDocumentLinks.documentId, dmsDocuments.id))
      .leftJoin(users, eq(dmsDocuments.uploadedBy, users.id))
      .where(eq(taskDocumentLinks.taskId, taskId));

    return results.map(row => ({
      ...row,
      uploader: {
        ...row.uploader,
        firstName: row.uploader.firstName || "",
        lastName: row.uploader.lastName || "",
      }
    })) as (DmsDocument & { uploader: User })[];
  }

  async getDocumentTasks(documentId: number): Promise<(Task & { project: Project })[]> {
    const results = await this.db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        taskName: tasks.taskName,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        pillar: tasks.pillar,
        phase: tasks.phase,
        assignedToId: tasks.assignedToId,
        startDate: tasks.startDate,
        endDate: tasks.endDate,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        progressPercentage: tasks.progressPercentage,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        project: {
          id: projects.id,
          projectName: projects.projectName,
          description: projects.description,
          status: projects.status,
          ownerId: projects.ownerId,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        }
      })
      .from(taskDocumentLinks)
      .innerJoin(tasks, eq(taskDocumentLinks.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(taskDocumentLinks.documentId, documentId));

    return results as (Task & { project: Project })[];
  }

  async grantDocumentAccess(access: InsertDocumentAccess): Promise<DocumentAccess> {
    const [newAccess] = await this.db
      .insert(documentAccess)
      .values(access)
      .returning();
    return newAccess;
  }

  async revokeDocumentAccess(accessId: number): Promise<void> {
    await this.db
      .delete(documentAccess)
      .where(eq(documentAccess.id, accessId));
  }

  async checkDocumentAccess(userId: string, documentId: number): Promise<{ hasAccess: boolean; accessType?: string }> {
    const [document] = await this.db
      .select({ isPublic: dmsDocuments.isPublic, uploadedBy: dmsDocuments.uploadedBy })
      .from(dmsDocuments)
      .where(eq(dmsDocuments.id, documentId));

    if (!document) return { hasAccess: false };
    if (document.uploadedBy === userId) return { hasAccess: true, accessType: "edit" };
    if (document.isPublic) return { hasAccess: true, accessType: "view" };

    const [access] = await this.db
      .select({ accessType: documentAccess.accessType })
      .from(documentAccess)
      .where(and(eq(documentAccess.documentId, documentId), eq(documentAccess.userId, userId)));

    return access ? { hasAccess: true, accessType: access.accessType } : { hasAccess: false };
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const [newVersion] = await this.db
      .insert(documentVersions)
      .values(version)
      .returning();
    return newVersion;
  }

  async getDocumentVersions(documentId: number): Promise<(DocumentVersion & { uploader: User })[]> {
    const results = await this.db
      .select({
        id: documentVersions.id,
        documentId: documentVersions.documentId,
        versionNumber: documentVersions.versionNumber,
        originalFilename: documentVersions.originalFilename,
        diskFilename: documentVersions.diskFilename,
        filepath: documentVersions.filepath,
        fileSize: documentVersions.fileSize,
        uploadedBy: documentVersions.uploadedBy,
        changeNotes: documentVersions.changeNotes,
        createdAt: documentVersions.createdAt,
        uploader: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(documentVersions)
      .leftJoin(users, eq(documentVersions.uploadedBy, users.id))
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNumber));

    return results.map(row => ({
      ...row,
      uploader: {
        ...row.uploader,
        firstName: row.uploader.firstName || "",
        lastName: row.uploader.lastName || "",
      }
    })) as (DocumentVersion & { uploader: User })[];
  }

  async getAdminStats(): Promise<{
    totalDocuments: number;
    totalUsers: number;
    totalDownloads: number;
    storageUsed: string;
    newDocumentsThisWeek: number;
    newUsersThisWeek: number;
    downloadsThisWeek: number;
    storagePercentage: number;
  }> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [docStats] = await this.db
      .select({
        totalDocuments: sql<number>`count(*)`,
        totalDownloads: sql<number>`sum(${dmsDocuments.downloadCount})`,
        totalSize: sql<number>`sum(${dmsDocuments.fileSize})`,
        newThisWeek: sql<number>`count(case when ${dmsDocuments.createdAt} > ${weekAgo} then 1 end)`
      })
      .from(dmsDocuments);

    const [userStats] = await this.db
      .select({
        totalUsers: sql<number>`count(*)`,
        newThisWeek: sql<number>`count(case when ${users.createdAt} > ${weekAgo} then 1 end)`
      })
      .from(users);

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return "0 MB";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return {
      totalDocuments: docStats?.totalDocuments || 0,
      totalUsers: userStats?.totalUsers || 0,
      totalDownloads: docStats?.totalDownloads || 0,
      storageUsed: formatBytes(docStats?.totalSize || 0),
      newDocumentsThisWeek: docStats?.newThisWeek || 0,
      newUsersThisWeek: userStats?.newThisWeek || 0,
      downloadsThisWeek: 0,
      storagePercentage: Math.min((docStats?.totalSize || 0) / (1024 * 1024 * 1024) * 100, 100),
    };
  }
}

export const storage = new DatabaseStorage();
