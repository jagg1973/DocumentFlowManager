import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  MessageSquare, 
  Paperclip, 
  Plus, 
  Target, 
  Users, 
  Timer,
  TrendingUp,
  AlertCircle,
  Flag,
  Eye,
  Activity
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Task } from "@shared/schema";

// Import new components
import ProjectKanbanBoard from "./ProjectKanbanBoard";
import TaskDetailSidebarEnhanced from "./TaskDetailSidebarEnhanced";
import AddTaskModal from "./AddTaskModal";
import TaskNotifications from "./TaskNotifications";

interface DashboardTask {
  id: number;
  taskName: string;
  status: string;
  priority: string;
  progress: number;
  pillar: string;
  phase: string;
  startDate: string | Date;
  endDate: string | Date;
  description: string;
  assignedToId: string | null;
  createdBy: string;
  assignedUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
  _count?: {
    comments: number;
    attachments: number;
    followers: number;
    timeLogs: number;
  };
}

interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksThisWeek: number;
  totalTimeLogged: number;
  averageCompletionTime: number;
  tasksByStatus: {
    'Not Started': number;
    'In Progress': number;
    'Review': number;
    'Completed': number;
    'On Hold': number;
  };
  tasksByPriority: {
    'Low': number;
    'Medium': number;
    'High': number;
    'Critical': number;
  };
  tasksByPillar: {
    'Technical': number;
    'On-Page & Content': number;
    'Off-Page': number;
    'Analytics': number;
  };
  recentActivity: Array<{
    id: number;
    type: string;
    description: string;
    taskId: number;
    taskName: string;
    userId: string;
    userName: string;
    createdAt: string;
  }>;
}

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  members: Array<{
    id: number;
    userId: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
    };
  }>;
}

interface ProjectDashboardEnhancedProps {
  projectId: number;
  currentUser: any;
  members?: Array<{
    id: number;
    userId: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
    };
  }>;
  onTaskUpdate?: () => void;
}

export default function ProjectDashboardEnhanced({ 
  projectId, 
  currentUser,
  members,
  onTaskUpdate 
}: ProjectDashboardEnhancedProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [initialTaskStatus, setInitialTaskStatus] = useState<string>('Not Started');
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  
  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: async () => {
      return await apiRequest(`/api/projects/${projectId}`, "GET");
    },
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: [`/api/projects/${projectId}/tasks`],
    queryFn: async () => {
      return await apiRequest(`/api/projects/${projectId}/tasks`, "GET");
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ProjectStats>({
    queryKey: [`/api/projects/${projectId}/stats`],
    queryFn: async () => {
      return await apiRequest(`/api/projects/${projectId}/stats`, "GET");
    },
  });

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
  };

  // Type compatibility function for Kanban board
  const handleKanbanTaskSelect = (kanbanTask: any) => {
    // Convert kanban task to schema task if needed
    const schemaTask: Task = {
      ...kanbanTask,
      projectId: projectId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: kanbanTask.createdBy,
      // Map other required fields
    };
    handleTaskSelect(schemaTask);
  };

  const handleAddTask = (status: string = 'Not Started') => {
    setInitialTaskStatus(status);
    setShowAddTaskModal(true);
  };

  const handleTaskUpdate = () => {
    // Refresh tasks and stats
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stats`] });
    setSelectedTask(null);
  };

  const calculateProgress = () => {
    if (!stats || stats.totalTasks === 0) return 0;
    return Math.round((stats.completedTasks / stats.totalTasks) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Review':
        return 'bg-purple-100 text-purple-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'On Hold':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (projectLoading || tasksLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project?.name}</h1>
          <p className="text-gray-600">{project?.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <TaskNotifications currentUserId={currentUser?.id} />
          <Button onClick={() => handleAddTask()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <Target className="w-4 h-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
            <div className="text-sm text-gray-600">
              {stats?.tasksThisWeek || 0} this week
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedTasks || 0}</div>
            <div className="text-sm text-gray-600">
              {calculateProgress()}% complete
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overdueTasks || 0}</div>
            <div className="text-sm text-gray-600">
              Needs attention
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Time Logged</CardTitle>
              <Timer className="w-4 h-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTimeLogged || 0}h</div>
            <div className="text-sm text-gray-600">
              Avg: {stats?.averageCompletionTime || 0}h/task
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks View */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={view === 'kanban' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('kanban')}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Kanban
                  </Button>
                  <Button
                    variant={view === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('list')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    List
                  </Button>
                  <Button
                    variant={view === 'calendar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('calendar')}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Calendar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {view === 'kanban' && (
                <ProjectKanbanBoard
                  projectId={projectId}
                  onTaskSelect={handleKanbanTaskSelect}
                  onAddTask={handleAddTask}
                />
              )}
              {view === 'list' && (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskSelect(task)}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn("w-2 h-2 rounded-full", getStatusColor(task.status || 'Not Started'))}></div>
                        <div>
                          <h4 className="font-medium">{task.taskName}</h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Badge className={cn("text-xs", getPriorityColor(task.priority || 'Medium'))}>
                              {task.priority || 'Medium'}
                            </Badge>
                            <span>{task.pillar}</span>
                            {task.assignedToId && (
                              <span>• Assigned to user {task.assignedToId}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={cn("text-xs", getStatusColor(task.status || 'Not Started'))}>
                          {task.status || 'Not Started'}
                        </Badge>
                        <span className="text-sm text-gray-500">{task.progress || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {view === 'calendar' && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Calendar view coming soon!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center text-sm">
                    <span>By Status</span>
                  </div>
                  <div className="space-y-2 mt-2">
                    {stats?.tasksByStatus && Object.entries(stats.tasksByStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className="text-sm">{status}</span>
                        <Badge className={cn("text-xs", getStatusColor(status))}>
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-sm">
                    <span>By Priority</span>
                  </div>
                  <div className="space-y-2 mt-2">
                    {stats?.tasksByPriority && Object.entries(stats.tasksByPriority).map(([priority, count]) => (
                      <div key={priority} className="flex justify-between items-center">
                        <span className="text-sm">{priority}</span>
                        <Badge className={cn("text-xs", getPriorityColor(priority))}>
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recentActivity?.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.userName}</span>{' '}
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.taskName} • {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                  <div className="text-center py-4 text-gray-500">
                    <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <TaskDetailSidebarEnhanced
          task={selectedTask}
          members={project?.members}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={handleTaskUpdate}
        />
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <AddTaskModal
          projectId={projectId}
          members={project?.members}
          onClose={() => setShowAddTaskModal(false)}
          onTaskCreated={handleTaskUpdate}
        />
      )}
    </div>
  );
}
