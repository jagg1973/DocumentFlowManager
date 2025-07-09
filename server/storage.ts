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
import { eq, and, inArray, desc, asc, or, ilike, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Organization operations
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationByDomain(domain: string): Promise<Organization | undefined>;
  updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization | undefined>;
  
  // User operations
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
  getProjectsForOrganization(organizationId: number): Promise<Project[]>;
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
  
  // Delete user
  deleteUser(userId: string): Promise<void>;
  
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
  
  // Gamification Methods
  awardBadge(userId: string, badgeType: string, badgeName: string, description?: string, iconName?: string): Promise<UserBadge>;
  getUserBadges(userId: string): Promise<UserBadge[]>;
  logActivity(userId: string, activityType: string, pointsEarned: number, relatedId?: number): Promise<void>;
  updateUserExperience(userId: string, points: number): Promise<void>;
  calculateUserLevel(experiencePoints: number): number;
  getLeaderboard(category: string, limit?: number): Promise<(Leaderboard & { user: User })[]>;
  updateUserStreak(userId: string): Promise<void>;
  checkAndAwardAchievements(userId: string): Promise<UserBadge[]>;
  getAchievements(): Promise<Achievement[]>;
  initializeAchievements(): Promise<void>;
  
  // Performance Analytics
  getUserPerformanceData(userId: string, timeRange?: string): Promise<any>;
  getFilteredUsers(criteria: any): Promise<any[]>;
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
    // Insert the project using $returningId for MySQL compatibility
    const [result] = await db.insert(projects).values(project).$returningId();
    const projectId = result.id;
    
    // Get the created project
    const [newProject] = await db.select().from(projects).where(eq(projects.id, projectId));
    
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
    console.log(`Fetching projects for user: ${userId}`);
    
    // Get projects where user is owner
    const ownedProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId));

    console.log(`Found ${ownedProjects.length} owned projects for user ${userId}`);

    // Get projects where user is a member
    const memberProjects = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        ownerId: projects.ownerId,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, userId));

    console.log(`Found ${memberProjects.length} member projects for user ${userId}`);

    // Combine and deduplicate
    const allProjects = [...ownedProjects, ...memberProjects];
    const uniqueProjects = allProjects.filter((project, index, self) => 
      index === self.findIndex(p => p.id === project.id)
    );

    console.log(`Returning ${uniqueProjects.length} total unique projects`);
    return uniqueProjects;
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
    const [result] = await db.insert(tasks).values({
      ...task,
      updatedAt: new Date(),
    }).$returningId();
    const taskId = result.id;
    
    // Get the created task
    const [newTask] = await db.select().from(tasks).where(eq(tasks.id, taskId));
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

  async updateUserRole(userId: string, role: string, memberLevel: string): Promise<void> {
    try {
      await db.update(users)
        .set({
          role: role as any,
          memberLevel: memberLevel as any,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      // Delete user data in correct order due to foreign key constraints
      await db.delete(projectMembers).where(eq(projectMembers.userId, userId));
      await db.delete(taskReviews).where(or(eq(taskReviews.reviewerId, userId), eq(taskReviews.revieweeId, userId)));
      await db.delete(memberAuthorityHistory).where(eq(memberAuthorityHistory.userId, userId));
      await db.delete(gracePeriodRequests).where(eq(gracePeriodRequests.userId, userId));
      await db.delete(documentAccess).where(eq(documentAccess.userId, userId));
      await db.delete(dmsDocuments).where(eq(dmsDocuments.uploadedBy, userId));
      await db.delete(projects).where(eq(projects.ownerId, userId));
      await db.delete(users).where(eq(users.id, userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
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
    const [result] = await db
      .insert(dmsDocuments)
      .values(document)
      .$returningId();
    const documentId = result.id;
    
    // Get the created document
    const [newDocument] = await db.select().from(dmsDocuments).where(eq(dmsDocuments.id, documentId));
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

  // Gamification Methods Implementation
  async awardBadge(userId: string, badgeType: string, badgeName: string, description?: string, iconName?: string): Promise<UserBadge> {
    const existingBadge = await db
      .select()
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeType, badgeType)))
      .limit(1);

    if (existingBadge.length > 0) {
      return existingBadge[0];
    }

    const [newBadge] = await db.insert(userBadges).values({
      userId,
      badgeType,
      badgeName,
      badgeDescription: description || "",
      iconName: iconName || "award",
    }).returning();

    await db.update(users)
      .set({ 
        totalBadges: sql`${users.totalBadges} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return newBadge;
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return await db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));
  }

  async logActivity(userId: string, activityType: string, pointsEarned: number, relatedId?: number): Promise<void> {
    await db.insert(userActivityLog).values({
      userId,
      activityType,
      pointsEarned,
      relatedId,
    });
  }

  async updateUserExperience(userId: string, points: number): Promise<void> {
    const [updatedUser] = await db.update(users)
      .set({
        experiencePoints: sql`${users.experiencePoints} + ${points}`,
        lastActivityDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser) {
      const newLevel = this.calculateUserLevel(updatedUser.experiencePoints || 0);
      if (newLevel !== updatedUser.currentLevel) {
        await db.update(users)
          .set({ currentLevel: newLevel })
          .where(eq(users.id, userId));
      }
    }
  }

  calculateUserLevel(experiencePoints: number): number {
    if (experiencePoints < 100) return 1;
    if (experiencePoints < 300) return 2;
    if (experiencePoints < 600) return 3;
    if (experiencePoints < 1000) return 4;
    if (experiencePoints < 1500) return 5;
    return Math.floor((experiencePoints - 1500) / 500) + 6;
  }

  async getLeaderboard(category: string, limit: number = 10): Promise<(Leaderboard & { user: User })[]> {
    const topUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.experiencePoints))
      .limit(limit);

    return topUsers.map((user, index) => ({
      id: index + 1,
      userId: user.id,
      category,
      rank: index + 1,
      score: user.experiencePoints || 0,
      lastUpdated: new Date(),
      user
    }));
  }

  async updateUserStreak(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const today = new Date();
    const lastActivity = user.lastActivityDate;
    let newStreak = 1;

    if (lastActivity) {
      const lastActivityDate = new Date(lastActivity);
      const daysDiff = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        newStreak = (user.streakDays || 0) + 1;
      } else if (daysDiff === 0) {
        newStreak = user.streakDays || 1;
      }
    }

    await db.update(users)
      .set({
        streakDays: newStreak,
        lastActivityDate: today,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async checkAndAwardAchievements(userId: string): Promise<UserBadge[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    const newBadges: UserBadge[] = [];

    if (user.tasksCompleted === 1) {
      const badge = await this.awardBadge(userId, "first_task", "First Steps", "Complete your first task", "target");
      newBadges.push(badge);
    }
    if (user.tasksCompleted === 10) {
      const badge = await this.awardBadge(userId, "task_master", "Task Master", "Complete 10 tasks", "trophy");
      newBadges.push(badge);
    }
    if (user.currentLevel === 5) {
      const badge = await this.awardBadge(userId, "rising_star", "Rising Star", "Reach level 5", "trending-up");
      newBadges.push(badge);
    }
    if (user.streakDays === 7) {
      const badge = await this.awardBadge(userId, "streak_warrior", "Streak Warrior", "Maintain a 7-day login streak", "flame");
      newBadges.push(badge);
    }

    return newBadges;
  }

  async getAchievements(): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.isActive, true))
      .orderBy(achievements.category, achievements.requiredValue);
  }

  async initializeAchievements(): Promise<void> {
    const achievementData = [
      { name: "First Steps", description: "Complete your first task", iconName: "target", badgeColor: "green", requiredValue: 1, category: "tasks" },
      { name: "Task Master", description: "Complete 10 tasks", iconName: "trophy", badgeColor: "gold", requiredValue: 10, category: "tasks" },
      { name: "Rising Star", description: "Reach level 5", iconName: "trending-up", badgeColor: "pink", requiredValue: 5, category: "levels" },
      { name: "Streak Warrior", description: "Maintain a 7-day login streak", iconName: "flame", badgeColor: "orange", requiredValue: 7, category: "streaks" },
    ];

    for (const achievement of achievementData) {
      try {
        await db.insert(achievements).values(achievement).onConflictDoNothing();
      } catch (error) {
        console.log("Achievement already exists:", achievement.name);
      }
    }
  }

  // Performance Analytics Methods
  async getUserPerformanceData(userId: string, timeRange: string = '30d'): Promise<any> {
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get experience history
    const experienceHistory = await db
      .select({
        date: userActivityLog.activityDate,
        experience: users.experiencePoints,
        level: users.currentLevel,
      })
      .from(userActivityLog)
      .leftJoin(users, eq(userActivityLog.userId, users.id))
      .where(and(
        eq(userActivityLog.userId, userId),
        gte(userActivityLog.activityDate, startDate)
      ))
      .orderBy(asc(userActivityLog.activityDate));

    // Get task completion rates
    const taskCompletionRate = [
      { month: 'Jan', completed: 12, assigned: 15, rate: 80 },
      { month: 'Feb', completed: 18, assigned: 20, rate: 90 },
      { month: 'Mar', completed: 25, assigned: 28, rate: 89 },
      { month: 'Apr', completed: 22, assigned: 25, rate: 88 },
    ];

    // Get skill distribution
    const skillDistribution = [
      { skill: 'Technical SEO', value: 35, color: '#0088FE' },
      { skill: 'Content Strategy', value: 25, color: '#00C49F' },
      { skill: 'Link Building', value: 20, color: '#FFBB28' },
      { skill: 'Analytics', value: 20, color: '#FF8042' },
    ];

    // Get time tracking data
    const timeTracking = [
      { period: 'Week 1', hoursSpent: 40, tasksCompleted: 8, efficiency: 0.2 },
      { period: 'Week 2', hoursSpent: 35, tasksCompleted: 10, efficiency: 0.29 },
      { period: 'Week 3', hoursSpent: 42, tasksCompleted: 12, efficiency: 0.29 },
      { period: 'Week 4', hoursSpent: 38, tasksCompleted: 9, efficiency: 0.24 },
    ];

    // Get weekly activity
    const weeklyActivity = [
      { day: 'Mon', tasks: 5, documents: 2, reviews: 3 },
      { day: 'Tue', tasks: 7, documents: 1, reviews: 2 },
      { day: 'Wed', tasks: 6, documents: 3, reviews: 4 },
      { day: 'Thu', tasks: 8, documents: 2, reviews: 1 },
      { day: 'Fri', tasks: 4, documents: 4, reviews: 3 },
      { day: 'Sat', tasks: 2, documents: 1, reviews: 0 },
      { day: 'Sun', tasks: 1, documents: 0, reviews: 1 },
    ];

    // Get radar data
    const radarData = [
      { subject: 'Technical Skills', A: 85, B: 90, fullMark: 100 },
      { subject: 'Communication', A: 78, B: 85, fullMark: 100 },
      { subject: 'Productivity', A: 92, B: 95, fullMark: 100 },
      { subject: 'Leadership', A: 65, B: 80, fullMark: 100 },
      { subject: 'Creativity', A: 88, B: 85, fullMark: 100 },
      { subject: 'Problem Solving', A: 90, B: 88, fullMark: 100 },
    ];

    return {
      experienceHistory: experienceHistory.length > 0 ? experienceHistory : [
        { date: new Date().toISOString(), experience: 250, level: 3 }
      ],
      taskCompletionRate,
      skillDistribution,
      timeTracking,
      weeklyActivity,
      radarData,
    };
  }

  async getFilteredUsers(criteria: any, organizationId?: number): Promise<any[]> {
    let query = db.select().from(users);
    const conditions = [];

    // Organization filter for multi-tenancy
    if (organizationId) {
      conditions.push(eq(users.organizationId, organizationId));
    }

    // Text search
    if (criteria.search) {
      conditions.push(
        or(
          ilike(users.firstName, `%${criteria.search}%`),
          ilike(users.lastName, `%${criteria.search}%`),
          ilike(users.email, `%${criteria.search}%`)
        )
      );
    }

    // Role filter
    if (criteria.role && criteria.role.length > 0) {
      conditions.push(sql`${users.role} = ANY(${criteria.role})`);
    }

    // Experience range
    if (criteria.experienceRange) {
      conditions.push(
        and(
          gte(users.experiencePoints, criteria.experienceRange[0]),
          lte(users.experiencePoints, criteria.experienceRange[1])
        )
      );
    }

    // Level range
    if (criteria.levelRange) {
      conditions.push(
        and(
          gte(users.currentLevel, criteria.levelRange[0]),
          lte(users.currentLevel, criteria.levelRange[1])
        )
      );
    }

    // Badge count range
    if (criteria.badgeCount) {
      conditions.push(
        and(
          gte(users.totalBadges, criteria.badgeCount[0]),
          lte(users.totalBadges, criteria.badgeCount[1])
        )
      );
    }

    // Tasks completed range
    if (criteria.tasksCompleted) {
      conditions.push(
        and(
          gte(users.tasksCompleted, criteria.tasksCompleted[0]),
          lte(users.tasksCompleted, criteria.tasksCompleted[1])
        )
      );
    }

    // Date filters
    if (criteria.joinedAfter) {
      conditions.push(gte(users.createdAt, new Date(criteria.joinedAfter)));
    }
    if (criteria.joinedBefore) {
      conditions.push(lte(users.createdAt, new Date(criteria.joinedBefore)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.limit(100);
    return results.map(user => ({
      ...user,
      userRole: user.role,
    }));
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
