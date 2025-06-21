export interface ProjectWithStats {
  id: number;
  projectName: string;
  ownerId: string;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  averageProgress: number;
  members: Array<{
    id: number;
    projectId: number;
    userId: string;
    permissionLevel: 'edit' | 'view';
    user: {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
    };
  }>;
}

export interface TaskWithUser {
  id: number;
  projectId: number;
  taskName: string;
  assignedToId: string | null;
  startDate: string | null;
  endDate: string | null;
  progress: number | null;
  pillar: 'Technical' | 'On-Page & Content' | 'Off-Page' | 'Analytics' | null;
  phase: '1: Foundation' | '2: Growth' | '3: Authority' | null;
  guidelineDocLink: string | null;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Overdue' | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

export interface FilterState {
  pillars: Set<string>;
  phases: Set<string>;
  assignees: Set<string>;
  showCompleted: boolean;
}
