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
}

export const storage = new DatabaseStorage();
