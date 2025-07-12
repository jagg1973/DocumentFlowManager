import { db } from "./db";
import { sql, eq, and, gte, lte, desc, asc, or, isNull, like, inArray, ne, count } from "drizzle-orm";
import {
  users,
  projects,
  projectMembers,
  tasks,
  taskItems,
  taskSubItems,
  taskReviews,
  gracePeriodRequests,
  dmsDocuments,
  taskDocumentLinks,
  documentAccess,
  documentVersions,
  sessions,
  taskActivities,
  taskTimeEntries,
  taskAttachments,
  taskNotifications,
  taskComments,
  taskPermissions,
  taskCommentMentions,
  taskCommentReactions,
  taskFollowers,
  type User,
  type Project,
  type Task,
  type TaskItem,
  type TaskSubItem,
  type TaskReview,
  type GracePeriodRequest,
  type DmsDocument,
  type TaskDocumentLink,
  type DocumentAccess,
  type DocumentVersion,
  type UpsertUser,
  type InsertProject,
  type InsertTask,
  type InsertTaskItem,
  type InsertTaskSubItem,
  type InsertTaskReview,
  type InsertGracePeriodRequest,
  type InsertDmsDocument,
  type InsertTaskDocumentLink,
  type InsertDocumentAccess,
  type InsertDocumentVersion,
  type ProjectMember,
  type InsertProjectMember,
} from "../shared/schema";

// Helper function to safely extract insertId from database insert results
function extractInsertId(result: any): number {
  if (typeof result.insertId === 'number') {
    return result.insertId;
  } else if (typeof result.insertId === 'string') {
    const parsed = parseInt(result.insertId, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid insertId string: ${result.insertId}`);
    }
    return parsed;
  } else if (typeof result.insertId === 'bigint') {
    return Number(result.insertId);
  } else if (result[0] && typeof result[0].insertId === 'number') {
    return result[0].insertId;
  } else if (Array.isArray(result) && result.length > 0 && result[0].insertId) {
    const id = result[0].insertId;
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
      const parsed = parseInt(id, 10);
      if (isNaN(parsed)) {
        throw new Error(`Invalid insertId in array: ${id}`);
      }
      return parsed;
    }
  }
  
  console.error('Could not determine insertId from result:', result);
  throw new Error(`Unable to extract insertId from database result: ${JSON.stringify(result)}`);
}

interface ProjectWithMembers extends Project {
  members: (ProjectMember & { user: User })[];
}

interface TaskWithProject extends Task {
  project: Project;
}

interface TaskWithDetails extends Task {
  project: Project;
  items: TaskItem[];
  taskItems: TaskItem[];
}

interface TaskItemWithSubItems extends TaskItem {
  subItems: TaskSubItem[];
}

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export class DatabaseStorage {
  // User methods
  async createUser(userData: UpsertUser): Promise<User> {
    const result = await db.insert(users).values(userData);
    
    const insertId = userData.id; // Since we're using custom IDs
    const [newUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, insertId))
      .limit(1);
    
    return newUser;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await db.insert(users).values(userData)
      .onDuplicateKeyUpdate({
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          
        },
      });
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userData.id))
      .limit(1);
    
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    await db.update(users)
      .set({ ...updates })
      .where(eq(users.id, id));
    
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Project methods
  async createProject(projectData: any): Promise<Project> {
    try {
      const result = await db.insert(projects).values(projectData);
      const insertId = extractInsertId(result);
      
      const [newProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, insertId))
        .limit(1);
      
      return newProject;
    } catch (error) {
      console.error('Error in createProject:', error);
      // Fallback: get the most recent project for this user
      const [latestProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.ownerId, projectData.ownerId))
        .orderBy(desc(projects.createdAt))
        .limit(1);
      return latestProject;
    }
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    
    return project;
  }

  async getProjectsForUser(userId: string): Promise<ProjectWithMembers[]> {
    const results = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        ownerId: projects.ownerId,
        createdAt: projects.createdAt,
        memberId: projectMembers.userId,
        memberPermissionLevel: projectMembers.permissionLevel,
        memberUserId: users.id,
        memberEmail: users.email,
        memberFirstName: users.firstName,
        memberLastName: users.lastName,
        memberProfileImageUrl: users.profileImageUrl,
      })
      .from(projects)
      .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .leftJoin(users, eq(projectMembers.userId, users.id))
      .where(
        or(
          eq(projects.ownerId, userId),
          eq(projectMembers.userId, userId)
        )
      )
      .orderBy(desc(projects.createdAt));

    const projectsMap = new Map<number, ProjectWithMembers>();
    
    results.forEach(row => {
      if (!projectsMap.has(row.id)) {
        projectsMap.set(row.id, {
          id: row.id,
          projectName: row.projectName,
          ownerId: row.ownerId,
          createdAt: row.createdAt,
          members: []
        });
      }
      
      const project = projectsMap.get(row.id)!;
      
      if (row.memberId && row.memberUserId) {
        project.members.push({
          id: 0, // Will be set properly when we have the actual record
          userId: row.memberId,
          projectId: row.id,
          permissionLevel: row.memberPermissionLevel,
          user: {
            id: row.memberUserId,
            email: row.memberEmail!,
            firstName: row.memberFirstName,
            lastName: row.memberLastName,
            profileImageUrl: row.memberProfileImageUrl,
            password: null,
            isAdmin: false,
            isEmailVerified: false,
            emailVerificationToken: null,
            passwordResetToken: null,
            passwordResetExpires: null,
            memberAuthorityScore: "0.00",
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
      }
    });
    
    return Array.from(projectsMap.values());
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    await db.update(projects)
      .set(updates)
      .where(eq(projects.id, id));
    
    const [updatedProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Project member methods
  async addProjectMember(memberData: InsertProjectMember): Promise<ProjectMember> {
    const result = await db.insert(projectMembers).values(memberData);
    
    const [newMember] = await db
      .select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, memberData.projectId),
        eq(projectMembers.userId, memberData.userId)
      ))
      .limit(1);
    
    return newMember;
  }

  async updateProjectMember(projectId: number, userId: string, updates: Partial<InsertProjectMember>): Promise<ProjectMember | undefined> {
    await db.update(projectMembers)
      .set(updates)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ));
    
    const [updatedMember] = await db
      .select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ))
      .limit(1);
    
    return updatedMember;
  }

  async removeProjectMember(projectId: number, userId: string): Promise<void> {
    await db.delete(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ));
  }

  async getProjectMembers(projectId: number): Promise<(ProjectMember & { user: User })[]> {
    const results = await db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        projectId: projectMembers.projectId,
        permissionLevel: projectMembers.permissionLevel,
        user: users
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));

    return results;
  }

  // Task methods
  async createTask(taskData: any): Promise<Task> {
    try {
      const result = await db.insert(tasks).values(taskData);
      const insertId = extractInsertId(result);
      
      const [newTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, insertId))
        .limit(1);
      
      return newTask;
    } catch (error) {
      console.error('Error in createTask:', error);
      // Fallback: get the most recent task for this project
      const [latestTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, taskData.projectId))
        .orderBy(desc(tasks.createdAt))
        .limit(1);
      return latestTask;
    }
  }

  async getTask(id: number): Promise<TaskWithDetails | undefined> {
    const [task] = await db
      .select({
        id: tasks.id,
        taskName: tasks.taskName,
        description: tasks.description,
        pillar: tasks.pillar,
        phase: tasks.phase,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        projectId: tasks.projectId,
        assignedToId: tasks.assignedToId,
        createdBy: tasks.createdBy,
        ownerId: tasks.ownerId,
        lastUpdatedBy: tasks.lastUpdatedBy,
        startDate: tasks.startDate,
        endDate: tasks.endDate,
        progress: tasks.progress,
        isArchived: tasks.isArchived,
        archivedAt: tasks.archivedAt,
        guidelineDocLink: tasks.guidelineDocLink,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        project: projects
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, id))
      .limit(1);

    if (!task) return undefined;

    const taskItemsResults = await db
      .select()
      .from(taskItems)
      .where(eq(taskItems.taskId, id))
      .orderBy(asc(taskItems.id));

    return {
      ...task,
      items: taskItemsResults,
      taskItems: taskItemsResults,
    };
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    try {
      // Log the incoming updates for debugging
      console.log('UpdateTask called with id:', id, 'updates:', updates);
      
      // Filter out undefined values and invalid fields
      const validUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key, value]) => value !== undefined)
      );
      
      console.log('Valid updates:', validUpdates);
      
      await db.update(tasks)
        .set(validUpdates)
        .where(eq(tasks.id, id));
      
      const [updatedTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1);
      
      console.log('Updated task:', updatedTask);
      return updatedTask;
    } catch (error) {
      console.error('Error in updateTask:', error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getTasksForProject(projectId: number): Promise<TaskWithProject[]> {
    const results = await db
      .select({
        id: tasks.id,
        taskName: tasks.taskName,
        description: tasks.description,
        pillar: tasks.pillar,
        phase: tasks.phase,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        projectId: tasks.projectId,
        assignedToId: tasks.assignedToId,
        createdBy: tasks.createdBy,
        ownerId: tasks.ownerId,
        lastUpdatedBy: tasks.lastUpdatedBy,
        startDate: tasks.startDate,
        endDate: tasks.endDate,
        progress: tasks.progress,
        isArchived: tasks.isArchived,
        archivedAt: tasks.archivedAt,
        guidelineDocLink: tasks.guidelineDocLink,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        project: projects
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.createdAt));

    return results;
  }

  async getTaskStats(taskId: number): Promise<TaskStats> {
    const [stats] = await db
      .select({
        totalTasks: sql<number>`COUNT(*)`,
        completedTasks: sql<number>`COUNT(CASE WHEN status = 'Completed' THEN 1 END)`,
        inProgressTasks: sql<number>`COUNT(CASE WHEN status = 'In Progress' THEN 1 END)`,
        overdueTasks: sql<number>`COUNT(CASE WHEN status != 'Completed' AND due_date < NOW() THEN 1 END)`,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId));

    const totalTasks = Number(stats.totalTasks) || 0;
    const completedTasks = Number(stats.completedTasks) || 0;
    const inProgressTasks = Number(stats.inProgressTasks) || 0;
    const overdueTasks = Number(stats.overdueTasks) || 0;
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }

  // Task item methods
  async createTaskItem(itemData: any): Promise<TaskItem> {
    const result = await db.insert(taskItems).values(itemData);
    
    const insertId = extractInsertId(result);
    const [newItem] = await db
      .select()
      .from(taskItems)
      .where(eq(taskItems.id, insertId))
      .limit(1);
    
    return newItem;
  }

  async updateTaskItem(id: number, updates: Partial<InsertTaskItem>): Promise<TaskItem | undefined> {
    await db.update(taskItems)
      .set({ ...updates })
      .where(eq(taskItems.id, id));
    
    const [updatedItem] = await db
      .select()
      .from(taskItems)
      .where(eq(taskItems.id, id))
      .limit(1);
    
    return updatedItem;
  }

  async deleteTaskItem(id: number): Promise<void> {
    await db.delete(taskItems).where(eq(taskItems.id, id));
  }

  async getTaskItemsForTask(taskId: number): Promise<TaskItemWithSubItems[]> {
    const items = await db
      .select()
      .from(taskItems)
      .where(eq(taskItems.taskId, taskId))
      .orderBy(asc(taskItems.id));

    const itemsWithSubItems = await Promise.all(
      items.map(async (item) => {
        const subItems = await this.getTaskSubItemsForItem(item.id);
        return { ...item, subItems };
      })
    );

    return itemsWithSubItems;
  }

  // Task sub-item methods
  async createTaskSubItem(subItem: any): Promise<TaskSubItem> {
    const result = await db.insert(taskSubItems).values(subItem);
    
    const insertId = extractInsertId(result);
    const [newSubItem] = await db
      .select()
      .from(taskSubItems)
      .where(eq(taskSubItems.id, insertId))
      .limit(1);
    
    return newSubItem;
  }

  async updateTaskSubItem(id: number, subItem: Partial<InsertTaskSubItem>): Promise<TaskSubItem | undefined> {
    await db
      .update(taskSubItems)
      .set(subItem)
      .where(eq(taskSubItems.id, id));
    
    const [updatedSubItem] = await db
      .select()
      .from(taskSubItems)
      .where(eq(taskSubItems.id, id))
      .limit(1);
    
    return updatedSubItem;
  }

  async deleteTaskSubItem(id: number): Promise<void> {
    await db.delete(taskSubItems).where(eq(taskSubItems.id, id));
  }

  async getTaskSubItemsForItem(taskItemId: number): Promise<TaskSubItem[]> {
    const subItems = await db
      .select()
      .from(taskSubItems)
      .where(eq(taskSubItems.taskItemId, taskItemId))
      .orderBy(asc(taskSubItems.id));
    
    return subItems;
  }

  // Task review methods
  async createTaskReview(review: any): Promise<TaskReview> {
    const result = await db.insert(taskReviews).values(review);
    
    const insertId = extractInsertId(result);
    const [newReview] = await db
      .select()
      .from(taskReviews)
      .where(eq(taskReviews.id, insertId))
      .limit(1);
    
    return newReview;
  }

  async getTaskReviews(taskId: number): Promise<TaskReview[]> {
    const reviews = await db
      .select()
      .from(taskReviews)
      .where(eq(taskReviews.taskId, taskId))
      .orderBy(desc(taskReviews.createdAt));
    
    return reviews;
  }

  // Grace period request methods
  async createGracePeriodRequest(request: InsertGracePeriodRequest): Promise<GracePeriodRequest> {
    const result = await db.insert(gracePeriodRequests).values(request);
    
    const insertId = extractInsertId(result);
    const [newRequest] = await db
      .select()
      .from(gracePeriodRequests)
      .where(eq(gracePeriodRequests.id, insertId))
      .limit(1);
    
    return newRequest;
  }

  async getGracePeriodRequests(taskId: number): Promise<GracePeriodRequest[]> {
    const requests = await db
      .select()
      .from(gracePeriodRequests)
      .where(eq(gracePeriodRequests.taskId, taskId))
      .orderBy(desc(gracePeriodRequests.createdAt));
    
    return requests;
  }

  // Document methods
  async createDocument(document: InsertDmsDocument): Promise<DmsDocument> {
    const result = await db.insert(dmsDocuments).values(document);
    
    const insertId = extractInsertId(result);
    const [newDocument] = await db
      .select()
      .from(dmsDocuments)
      .where(eq(dmsDocuments.id, insertId))
      .limit(1);
    
    return newDocument;
  }

  async getDocument(id: number): Promise<DmsDocument | undefined> {
    const [document] = await db
      .select()
      .from(dmsDocuments)
      .where(eq(dmsDocuments.id, id))
      .limit(1);
    
    return document;
  }

  async updateDocument(id: number, document: Partial<InsertDmsDocument>): Promise<DmsDocument | undefined> {
    await db
      .update(dmsDocuments)
      .set({ ...document })
      .where(eq(dmsDocuments.id, id));
    
    const [updated] = await db
      .select()
      .from(dmsDocuments)
      .where(eq(dmsDocuments.id, id))
      .limit(1);
    
    return updated;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(taskDocumentLinks).where(eq(taskDocumentLinks.documentId, id));
    await db.delete(documentAccess).where(eq(documentAccess.documentId, id));
    await db.delete(dmsDocuments).where(eq(dmsDocuments.id, id));
  }

  async linkDocumentToTask(link: InsertTaskDocumentLink): Promise<TaskDocumentLink> {
    const result = await db
      .insert(taskDocumentLinks)
      .values(link);
    
    const insertId = extractInsertId(result);
    const [newLink] = await db
      .select()
      .from(taskDocumentLinks)
      .where(eq(taskDocumentLinks.id, insertId))
      .limit(1);
    
    return newLink;
  }

  async grantDocumentAccess(access: InsertDocumentAccess): Promise<DocumentAccess> {
    const result = await db
      .insert(documentAccess)
      .values(access);
    
    const insertId = extractInsertId(result);
    const [newAccess] = await db
      .select()
      .from(documentAccess)
      .where(eq(documentAccess.id, insertId))
      .limit(1);
    
    return newAccess;
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const result = await db
      .insert(documentVersions)
      .values(version);
    
    const insertId = extractInsertId(result);
    const [newVersion] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.id, insertId))
      .limit(1);
    
    return newVersion;
  }

  // Dashboard Analytics Methods
  async getDashboardStats(): Promise<any> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [docStats] = await db
      .select({
        totalSize: sql<number>`COALESCE(SUM(file_size), 0)`,
        totalDownloads: sql<number>`COALESCE(SUM(download_count), 0)`,
        newThisWeek: sql<number>`COALESCE(COUNT(CASE WHEN created_at >= ${oneWeekAgo} THEN 1 END), 0)`,
      })
      .from(dmsDocuments);

    const [userStats] = await db
      .select({
        totalUsers: sql<number>`COALESCE(COUNT(*), 0)`,
        newThisWeek: sql<number>`COALESCE(COUNT(CASE WHEN created_at >= ${oneWeekAgo} THEN 1 END), 0)`,
      })
      .from(users);

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      totalTasks: 0, // Placeholder - would need task count query
      totalProjects: 0, // Placeholder - would need project count query
      totalUsers: Number(userStats.totalUsers) || 0,
      totalDownloads: Number(docStats.totalDownloads) || 0,
      storageUsed: formatBytes(Number(docStats.totalSize) || 0),
      newDocumentsThisWeek: Number(docStats.newThisWeek) || 0,
      newUsersThisWeek: Number(userStats.newThisWeek) || 0,
      downloadsThisWeek: 0,
      storagePercentage: Math.min((Number(docStats.totalSize) || 0) / (1024 * 1024 * 1024) * 100, 100),
    };
  }

  async checkUserProjectAccess(userId: string, projectId: number): Promise<boolean> {
    const member = await db.select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.userId, userId),
        eq(projectMembers.projectId, projectId)
      ))
      .limit(1);
    
    return member.length > 0;
  }

  async createTaskActivity(activity: {
    taskId: number;
    userId: string;
    activityType: string;
    description: string;
    metadata?: any;
  }): Promise<any> {
    const result = await db.insert(taskActivities).values({
      taskId: activity.taskId,
      userId: activity.userId,
      activityType: activity.activityType,
      description: activity.description,
      activityData: activity.metadata ? JSON.stringify(activity.metadata) : null,
      createdAt: new Date()
    });
    
    const newActivity = await db.select()
      .from(taskActivities)
      .where(eq(taskActivities.id, result[0].insertId))
      .limit(1);
    
    return newActivity[0];
  }

  async getTaskActivities(taskId: number): Promise<any[]> {
    return await db.select()
      .from(taskActivities)
      .leftJoin(users, eq(taskActivities.userId, users.id))
      .where(eq(taskActivities.taskId, taskId))
      .orderBy(desc(taskActivities.createdAt));
  }

  async getTimeEntries(taskId: number): Promise<any[]> {
    return await db.select()
      .from(taskTimeEntries)
      .leftJoin(users, eq(taskTimeEntries.userId, users.id))
      .where(eq(taskTimeEntries.taskId, taskId))
      .orderBy(desc(taskTimeEntries.createdAt));
  }

  async createTimeEntry(entry: {
    taskId: number;
    userId: string;
    description: string;
    startTime: Date;
    endTime: Date;
    duration: number;
  }): Promise<any> {
    const result = await db.insert(taskTimeEntries).values({
      taskId: entry.taskId,
      userId: entry.userId,
      description: entry.description,
      startTime: entry.startTime,
      endTime: entry.endTime,
      durationMinutes: entry.duration,
      createdAt: new Date()
    });
    
    const newEntry = await db.select()
      .from(taskTimeEntries)
      .where(eq(taskTimeEntries.id, result[0].insertId))
      .limit(1);
    
    return newEntry[0];
  }

  async createTaskAttachment(attachment: {
    taskId: number;
    userId: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    filePath: string;
  }): Promise<any> {
    const result = await db.insert(taskAttachments).values({
      taskId: attachment.taskId,
      uploadedBy: attachment.userId,
      originalFilename: attachment.originalName,
      storedFilename: attachment.filename,
      mimeType: attachment.mimeType,
      fileSize: attachment.size,
      filePath: attachment.filePath,
      fileExtension: attachment.originalName.split('.').pop() || '',
      createdAt: new Date()
    });
    
    const newAttachment = await db.select()
      .from(taskAttachments)
      .where(eq(taskAttachments.id, result[0].insertId))
      .limit(1);
    
    return newAttachment[0];
  }

  async deleteTaskAttachment(attachmentId: number): Promise<void> {
    await db.delete(taskAttachments)
      .where(eq(taskAttachments.id, attachmentId));
  }

  async getTaskNotifications(userId: string): Promise<any[]> {
    return await db.select()
      .from(taskNotifications)
      .where(eq(taskNotifications.recipientId, userId))
      .orderBy(desc(taskNotifications.createdAt));
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await db.update(taskNotifications)
      .set({ isRead: true })
      .where(eq(taskNotifications.id, notificationId));
  }

  async getAdminStats(): Promise<any> {
    const userCount = await db.select({ count: count() }).from(users);
    const projectCount = await db.select({ count: count() }).from(projects);
    const taskCount = await db.select({ count: count() }).from(tasks);
    const documentCount = await db.select({ count: count() }).from(dmsDocuments);
    
    return {
      users: userCount[0].count,
      projects: projectCount[0].count,
      tasks: taskCount[0].count,
      documents: documentCount[0].count
    };
  }

  async searchUsers(query: string): Promise<any[]> {
    if (!query.trim()) {
      return await db.select().from(users).limit(50);
    }
    
    return await db.select()
      .from(users)
      .where(or(
        like(users.firstName, `%${query}%`),
        like(users.lastName, `%${query}%`),
        like(users.email, `%${query}%`)
      ))
      .limit(50);
  }

  async getDocuments(filters: any = {}): Promise<any[]> {
    const conditions = [];
    
    if (filters.category) {
      conditions.push(eq(dmsDocuments.category, filters.category));
    }

    if (filters.tags) {
      conditions.push(like(dmsDocuments.tags, `%${filters.tags}%`));
    }

    if (filters.isPublic !== undefined) {
      conditions.push(eq(dmsDocuments.isPublic, filters.isPublic));
    }

    let results;
    if (conditions.length > 0) {
      results = await db.select({
        // Document fields
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
        isPublic: dmsDocuments.isPublic,
        uploadedBy: dmsDocuments.uploadedBy,
        downloadCount: dmsDocuments.downloadCount,
        createdAt: dmsDocuments.createdAt,
        updatedAt: dmsDocuments.updatedAt,
        // User fields
        uploader: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
        .from(dmsDocuments)
        .leftJoin(users, eq(dmsDocuments.uploadedBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(dmsDocuments.createdAt));
    } else {
      results = await db.select({
        // Document fields
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
        isPublic: dmsDocuments.isPublic,
        uploadedBy: dmsDocuments.uploadedBy,
        downloadCount: dmsDocuments.downloadCount,
        createdAt: dmsDocuments.createdAt,
        updatedAt: dmsDocuments.updatedAt,
        // User fields
        uploader: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
        .from(dmsDocuments)
        .leftJoin(users, eq(dmsDocuments.uploadedBy, users.id))
        .orderBy(desc(dmsDocuments.createdAt));
    }

    return results;
  }

  async updateUserRole(userId: string, role: string, memberLevel?: number): Promise<void> {
    await db.update(users)
      .set({ 
        // Note: role field doesn't exist in current schema, but keeping for compatibility
        
      })
      .where(eq(users.id, userId));
  }

  async getTaskComments(taskId: number): Promise<any[]> {
    return await db.select()
      .from(taskComments)
      .leftJoin(users, eq(taskComments.authorId, users.id))
      .where(eq(taskComments.taskId, taskId))
      .orderBy(desc(taskComments.createdAt));
  }

  async createTaskComment(comment: {
    taskId: number;
    authorId: string;
    content: string;
    parentCommentId?: number;
    mentionedUsers?: string[];
  }): Promise<any> {
    const result = await db.insert(taskComments).values({
      taskId: comment.taskId,
      authorId: comment.authorId,
      content: comment.content,
      parentCommentId: comment.parentCommentId || null,
      mentionedUsers: comment.mentionedUsers ? JSON.stringify(comment.mentionedUsers) : null,
      createdAt: new Date()
    });
    
    const newComment = await db.select()
      .from(taskComments)
      .where(eq(taskComments.id, result[0].insertId))
      .limit(1);
    
    return newComment[0];
  }

  async updateTaskComment(commentId: number, updates: {
    content?: string;
    mentionedUsers?: string[];
  }): Promise<any> {
    await db.update(taskComments)
      .set({
        content: updates.content,
        mentionedUsers: updates.mentionedUsers ? JSON.stringify(updates.mentionedUsers) : null,
        isEdited: true,
        editedAt: new Date()
      })
      .where(eq(taskComments.id, commentId));
    
    const updatedComment = await db.select()
      .from(taskComments)
      .where(eq(taskComments.id, commentId))
      .limit(1);
    
    return updatedComment[0];
  }

  async deleteTaskComment(commentId: number): Promise<void> {
    await db.update(taskComments)
      .set({
        isDeleted: true,
        deletedAt: new Date()
      })
      .where(eq(taskComments.id, commentId));
  }

  async getTaskAttachments(taskId: number): Promise<any[]> {
    return await db.select()
      .from(taskAttachments)
      .leftJoin(users, eq(taskAttachments.uploadedBy, users.id))
      .where(eq(taskAttachments.taskId, taskId))
      .orderBy(desc(taskAttachments.createdAt));
  }

  async getTaskFollowers(taskId: number): Promise<any[]> {
    // This would need a taskFollowers table that doesn't exist yet
    // For now, return empty array
    return [];
  }

  async addTaskFollower(taskId: number, userId: string, followType: string): Promise<void> {
    // This would need a taskFollowers table that doesn't exist yet
    // For now, do nothing
  }

  async removeTaskFollower(taskId: number, userId: string): Promise<void> {
    // This would need a taskFollowers table that doesn't exist yet
    // For now, do nothing
  }

  // Authentication methods
  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await db.update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expires,
      })
      .where(eq(users.id, userId));
  }

  async getUserByResetToken(token: string): Promise<any> {
    const result = await db.select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    return result[0];
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({
        password: hashedPassword,
      })
      .where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db.update(users)
      .set({
        passwordResetToken: null,
        passwordResetExpires: null,
      })
      .where(eq(users.id, userId));
  }

  async getUserByEmailVerificationToken(token: string): Promise<any> {
    const result = await db.select()
      .from(users)
      .where(eq(users.emailVerificationToken, token));
    return result[0];
  }

  async verifyUserEmail(userId: string): Promise<void> {
    await db.update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
      })
      .where(eq(users.id, userId));
  }

  // Gamification methods
  async checkAndAwardAchievements(userId: string): Promise<void> {
    // Implementation stub - to be implemented in phase 2
    console.log('checkAndAwardAchievements called for user:', userId);
  }

  async logActivity(userId: string, activityType: string, points: number, relatedId?: string): Promise<void> {
    // Implementation stub - to be implemented in phase 2
    console.log('logActivity called:', { userId, activityType, points, relatedId });
  }

  async updateUserExperience(userId: string, points: number): Promise<void> {
    // Implementation stub - to be implemented in phase 2
    console.log('updateUserExperience called:', { userId, points });
  }

  async updateUserStreak(userId: string): Promise<void> {
    // Implementation stub - to be implemented in phase 2
    console.log('updateUserStreak called for user:', userId);
  }

  async getUserBadges(userId: string): Promise<any[]> {
    // Implementation stub - to be implemented in phase 2
    console.log('getUserBadges called for user:', userId);
    return [];
  }

  async getLeaderboard(category: string, limit: number): Promise<any[]> {
    // Implementation stub - to be implemented in phase 2
    console.log('getLeaderboard called:', { category, limit });
    return [];
  }

  async getUserPerformanceData(userId: string, timeRange: string): Promise<any> {
    // Implementation stub - to be implemented in phase 2
    console.log('getUserPerformanceData called:', { userId, timeRange });
    return {};
  }

  async getFilteredUsers(criteria: any): Promise<any[]> {
    // Implementation stub - to be implemented in phase 2
    console.log('getFilteredUsers called:', criteria);
    return [];
  }

  async initializeAchievements(): Promise<void> {
    // Implementation stub - to be implemented in phase 2
    console.log('initializeAchievements called');
  }

  // Task Permissions Methods
  async getTaskPermissions(taskId: number): Promise<any[]> {
    try {
      const permissions = await db
        .select({
          id: taskPermissions.id,
          taskId: taskPermissions.taskId,
          userId: taskPermissions.userId,
          permissionType: taskPermissions.permissionType,
          grantedBy: taskPermissions.grantedBy,
          createdAt: taskPermissions.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          }
        })
        .from(taskPermissions)
        .leftJoin(users, eq(taskPermissions.userId, users.id))
        .where(eq(taskPermissions.taskId, taskId))
        .orderBy(taskPermissions.createdAt);
      
      return permissions;
    } catch (error) {
      console.error("Error fetching task permissions:", error);
      throw error;
    }
  }

  async createTaskPermission(data: {
    taskId: number;
    userId: string;
    permissionType: string;
    grantedBy: string;
  }): Promise<any> {
    try {
      const [permission] = await db
        .insert(taskPermissions)
        .values({
          taskId: data.taskId,
          userId: data.userId,
          permissionType: data.permissionType as any,
          grantedBy: data.grantedBy,
        })
        .$returningId();
      
      return permission;
    } catch (error) {
      console.error("Error creating task permission:", error);
      throw error;
    }
  }

  async updateTaskPermission(taskId: number, userId: string, data: { permissionType: string }): Promise<any> {
    try {
      const result = await db
        .update(taskPermissions)
        .set({
          permissionType: data.permissionType as any,
        })
        .where(
          and(
            eq(taskPermissions.taskId, taskId),
            eq(taskPermissions.userId, userId)
          )
        );
      
      return result;
    } catch (error) {
      console.error("Error updating task permission:", error);
      throw error;
    }
  }

  async deleteTaskPermission(taskId: number, userId: string): Promise<void> {
    try {
      await db
        .delete(taskPermissions)
        .where(
          and(
            eq(taskPermissions.taskId, taskId),
            eq(taskPermissions.userId, userId)
          )
        );
    } catch (error) {
      console.error("Error deleting task permission:", error);
      throw error;
    }
  }

  // Comment Reactions Methods
  async createTaskCommentReaction(data: {
    commentId: number;
    userId: string;
    reactionType: string;
  }): Promise<any> {
    try {
      const result = await db
        .insert(taskCommentReactions)
        .values({
          commentId: data.commentId,
          userId: data.userId,
          reactionType: data.reactionType,
        })
        .$returningId();
      
      return result;
    } catch (error) {
      console.error("Error creating comment reaction:", error);
      throw error;
    }
  }

  async deleteTaskCommentReaction(commentId: number, userId: string, reactionType: string): Promise<void> {
    try {
      await db
        .delete(taskCommentReactions)
        .where(
          and(
            eq(taskCommentReactions.commentId, commentId),
            eq(taskCommentReactions.userId, userId),
            eq(taskCommentReactions.reactionType, reactionType)
          )
        );
    } catch (error) {
      console.error("Error deleting comment reaction:", error);
      throw error;
    }
  }

  // Get single task attachment
  async getTaskAttachment(attachmentId: number): Promise<any> {
    try {
      const [attachment] = await db
        .select()
        .from(taskAttachments)
        .where(eq(taskAttachments.id, attachmentId));
      
      return attachment;
    } catch (error) {
      console.error("Error fetching task attachment:", error);
      throw error;
    }
  }

  // Comment Mentions Methods
  async createTaskCommentMention(data: {
    commentId: number;
    mentionedUserId: string;
  }): Promise<any> {
    try {
      const result = await db
        .insert(taskCommentMentions)
        .values({
          commentId: data.commentId,
          mentionedUserId: data.mentionedUserId,
        })
        .$returningId();
      
      return result;
    } catch (error) {
      console.error("Error creating comment mention:", error);
      throw error;
    }
  }

  async getTaskCommentMentions(commentId: number): Promise<any[]> {
    try {
      const mentions = await db
        .select({
          id: taskCommentMentions.id,
          commentId: taskCommentMentions.commentId,
          mentionedUserId: taskCommentMentions.mentionedUserId,
          createdAt: taskCommentMentions.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          }
        })
        .from(taskCommentMentions)
        .leftJoin(users, eq(taskCommentMentions.mentionedUserId, users.id))
        .where(eq(taskCommentMentions.commentId, commentId))
        .orderBy(taskCommentMentions.createdAt);
      
      return mentions;
    } catch (error) {
      console.error("Error fetching comment mentions:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
