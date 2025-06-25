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
import { eq, and, inArray, desc, asc, or, ilike, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Additional user operations for SAAS auth
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Partial<UpsertUser>): Promise<User>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void>;
  clearPasswordResetToken(userId: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  verifyUserEmail(userId: string): Promise<void>;
  
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
  
  // Update user role and member level
  updateUserRole(userId: string, role: string, memberLevel: string): Promise<void>;
  
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id || '',
        email: userData.email || '',
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'client',
        isEmailVerified: userData.isEmailVerified || false,
        emailVerificationToken: userData.emailVerificationToken,
        passwordResetToken: userData.passwordResetToken,
        passwordResetExpires: userData.passwordResetExpires,
      })
      .returning();
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user;
  }

  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await db.update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expires,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db.update(users)
      .set({
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async verifyUserEmail(userId: string): Promise<void> {
    await db.update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    
    // Add owner as project member with edit permission
    await db.insert(projectMembers).values({
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
    try {
      // First get projects owned by user
      const ownedProjects = await db
        .select({
          id: projects.id,
          projectName: projects.projectName,
          ownerId: projects.ownerId,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(eq(projects.ownerId, userId))
        .orderBy(desc(projects.createdAt));

      // Then get projects where user is a member
      const memberProjects = await db
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

      // Combine and deduplicate
      const allProjects = [...ownedProjects, ...memberProjects];
      const uniqueProjects = allProjects.filter((project, index, array) => 
        array.findIndex(p => p.id === project.id) === index
      );

      return uniqueProjects.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error("Error in getProjectsForUser:", error);
      throw error;
    }
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
    try {
      if (!query || query.trim() === '') {
        // Return all users when no query provided (for admin user management)
        const allUsers = await db
          .select()
          .from(users)
          .orderBy(users.createdAt)
          .limit(100);
        return allUsers;
      }
      
      const searchTerm = `%${query.toLowerCase()}%`;
      const searchResults = await db
        .select()
        .from(users)
        .where(
          or(
            ilike(users.email, searchTerm),
            ilike(users.firstName, searchTerm),
            ilike(users.lastName, searchTerm)
          )
        )
        .orderBy(users.createdAt)
        .limit(50);
      
      return searchResults;
    } catch (error) {
      console.error("Error in searchUsers:", error);
      return [];
    }
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
    const [newDocument] = await db
      .insert(dmsDocuments)
      .values(document)
      .returning();
    return newDocument;
  }

  async getDocument(id: number): Promise<DmsDocument | undefined> {
    const [document] = await db
      .select()
      .from(dmsDocuments)
      .where(eq(dmsDocuments.id, id));
    return document;
  }

  async getDocuments(filters?: { search?: string; category?: string; userId?: string; isPublic?: boolean }): Promise<(DmsDocument & { uploader: User })[]> {
    try {
      // Check if DMS tables exist by trying a simple count query first
      try {
        await db.select({ count: sql`count(*)` }).from(dmsDocuments).limit(1);
      } catch (tableError) {
        console.log("DMS tables not yet created, returning empty array");
        return [];
      }

      let query = db
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

      let whereConditions = [];

      if (filters?.search) {
        whereConditions.push(
          or(
            ilike(dmsDocuments.title, `%${filters.search}%`),
            ilike(dmsDocuments.description, `%${filters.search}%`)
          )
        );
      }

      if (filters?.category) {
        whereConditions.push(eq(dmsDocuments.category, filters.category as any));
      }

      if (filters?.userId) {
        whereConditions.push(eq(dmsDocuments.uploadedBy, filters.userId));
      }

      if (filters?.isPublic !== undefined) {
        whereConditions.push(eq(dmsDocuments.isPublic, filters.isPublic));
      }

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions)) as any;
      }

      const results = await query.orderBy(desc(dmsDocuments.createdAt));
      return results.map(row => ({
        ...row,
        uploader: {
          id: row.uploader?.id || "",
          firstName: row.uploader?.firstName || "",
          lastName: row.uploader?.lastName || "",
          email: row.uploader?.email || "",
          profileImageUrl: row.uploader?.profileImageUrl || "",
          role: "client" as any,
          memberLevel: "Junior" as any,
          authorityScore: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })) as (DmsDocument & { uploader: User })[];
    } catch (error) {
      console.error("Error in getDocuments:", error);
      return [];
    }
  }

  async getDocumentsOld(filters?: { search?: string; category?: string; userId?: string; isPublic?: boolean }): Promise<(DmsDocument & { uploader: User })[]> {
    try {
      // Check if DMS tables exist by trying a simple count query first
      try {
        await db.select({ count: sql`count(*)` }).from(dmsDocuments).limit(1);
      } catch (tableError) {
        console.log("DMS tables not yet created, returning empty array");
        return [];
      }

      let query = db
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

      let whereConditions = [];

      if (filters?.search) {
        whereConditions.push(
          or(
            ilike(dmsDocuments.title, `%${filters.search}%`),
            ilike(dmsDocuments.description, `%${filters.search}%`)
          )
        );
      }

      if (filters?.category) {
        whereConditions.push(eq(dmsDocuments.category, filters.category as any));
      }

      if (filters?.userId) {
        whereConditions.push(eq(dmsDocuments.uploadedBy, filters.userId));
      }

      if (filters?.isPublic !== undefined) {
        whereConditions.push(eq(dmsDocuments.isPublic, filters.isPublic));
      }

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions)) as any;
      }

      const results = await query.orderBy(desc(dmsDocuments.createdAt));
      return results.map(row => ({
        ...row,
        uploader: {
          id: row.uploader?.id || "",
          firstName: row.uploader?.firstName || "",
          lastName: row.uploader?.lastName || "",
          email: row.uploader?.email || "",
          profileImageUrl: row.uploader?.profileImageUrl || "",
          role: "client" as any,
          memberLevel: "Junior" as any,
          authorityScore: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })) as (DmsDocument & { uploader: User })[];
    } catch (error) {
      console.error("Error in getDocuments:", error);
      return [];
    }
  }

  async updateDocument(id: number, document: Partial<InsertDmsDocument>): Promise<DmsDocument | undefined> {
    const [updated] = await db
      .update(dmsDocuments)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(dmsDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(taskDocumentLinks).where(eq(taskDocumentLinks.documentId, id));
    await db.delete(documentAccess).where(eq(documentAccess.documentId, id));
    await db.delete(documentVersions).where(eq(documentVersions.documentId, id));
    await db.delete(dmsDocuments).where(eq(dmsDocuments.id, id));
  }

  async incrementDownloadCount(id: number): Promise<void> {
    await db
      .update(dmsDocuments)
      .set({ downloadCount: sql`${dmsDocuments.downloadCount} + 1` })
      .where(eq(dmsDocuments.id, id));
  }

  async linkDocumentToTask(link: InsertTaskDocumentLink): Promise<TaskDocumentLink> {
    const [newLink] = await db
      .insert(taskDocumentLinks)
      .values(link)
      .returning();
    return newLink;
  }

  async unlinkDocumentFromTask(linkId: number): Promise<void> {
    await db
      .delete(taskDocumentLinks)
      .where(eq(taskDocumentLinks.id, linkId));
  }

  async getTaskDocuments(taskId: number): Promise<(DmsDocument & { uploader: User })[]> {
    const results = await db
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
        firstName: row.uploader?.firstName || "",
        lastName: row.uploader?.lastName || "",
      }
    })) as (DmsDocument & { uploader: User })[];
  }

  async getDocumentTasks(documentId: number): Promise<(Task & { project: Project })[]> {
    const results = await db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        taskName: tasks.taskName,
        description: tasks.description,
        status: tasks.status,

        pillar: tasks.pillar,
        phase: tasks.phase,
        assignedToId: tasks.assignedToId,
        startDate: tasks.startDate,
        endDate: tasks.endDate,
        progress: tasks.progress,
        guidelineDocLink: tasks.guidelineDocLink,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        project: {
          id: projects.id,
          projectName: projects.projectName,
          ownerId: projects.ownerId,
          createdAt: projects.createdAt,
        }
      })
      .from(taskDocumentLinks)
      .innerJoin(tasks, eq(taskDocumentLinks.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(taskDocumentLinks.documentId, documentId));

    return results as (Task & { project: Project })[];
  }

  async grantDocumentAccess(access: InsertDocumentAccess): Promise<DocumentAccess> {
    const [newAccess] = await db
      .insert(documentAccess)
      .values(access)
      .returning();
    return newAccess;
  }

  async revokeDocumentAccess(accessId: number): Promise<void> {
    await db
      .delete(documentAccess)
      .where(eq(documentAccess.id, accessId));
  }

  async checkDocumentAccess(userId: string, documentId: number): Promise<{ hasAccess: boolean; accessType?: string }> {
    const [document] = await db
      .select({ isPublic: dmsDocuments.isPublic, uploadedBy: dmsDocuments.uploadedBy })
      .from(dmsDocuments)
      .where(eq(dmsDocuments.id, documentId));

    if (!document) return { hasAccess: false };
    if (document.uploadedBy === userId) return { hasAccess: true, accessType: "edit" };
    if (document.isPublic) return { hasAccess: true, accessType: "view" };

    const [access] = await db
      .select({ accessType: documentAccess.accessType })
      .from(documentAccess)
      .where(and(eq(documentAccess.documentId, documentId), eq(documentAccess.userId, userId)));

    return access ? { hasAccess: true, accessType: access.accessType } : { hasAccess: false };
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const [newVersion] = await db
      .insert(documentVersions)
      .values(version)
      .returning();
    return newVersion;
  }

  async getDocumentVersions(documentId: number): Promise<(DocumentVersion & { uploader: User })[]> {
    const results = await db
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
        firstName: row.uploader?.firstName || "",
        lastName: row.uploader?.lastName || "",
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

    // Try to get document stats, handle case where no documents exist
    const docResults = await db
      .select({
        totalDocuments: sql<number>`count(*)`,
        totalDownloads: sql<number>`coalesce(sum(${dmsDocuments.downloadCount}), 0)`,
        totalSize: sql<number>`coalesce(sum(${dmsDocuments.fileSize}), 0)`,
        newThisWeek: sql<number>`count(case when ${dmsDocuments.createdAt} > ${weekAgo} then 1 end)`
      })
      .from(dmsDocuments);

    const docStats = docResults[0] || { totalDocuments: 0, totalDownloads: 0, totalSize: 0, newThisWeek: 0 };

    // Get user stats
    const userResults = await db
      .select({
        totalUsers: sql<number>`count(*)`,
        newThisWeek: sql<number>`count(case when ${users.createdAt} > ${weekAgo} then 1 end)`
      })
      .from(users);

    const userStats = userResults[0] || { totalUsers: 0, newThisWeek: 0 };

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return "0 MB";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return {
      totalDocuments: Number(docStats.totalDocuments) || 0,
      totalUsers: Number(userStats.totalUsers) || 0,
      totalDownloads: Number(docStats.totalDownloads) || 0,
      storageUsed: formatBytes(Number(docStats.totalSize) || 0),
      newDocumentsThisWeek: Number(docStats.newThisWeek) || 0,
      newUsersThisWeek: Number(userStats.newThisWeek) || 0,
      downloadsThisWeek: 0,
      storagePercentage: Math.min((Number(docStats.totalSize) || 0) / (1024 * 1024 * 1024) * 100, 100),
    };
  }
}

export const storage = new DatabaseStorage();
