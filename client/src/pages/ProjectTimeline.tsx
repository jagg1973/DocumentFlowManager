import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Plus, Users } from "lucide-react";
import { Link } from "wouter";
import FilterSidebar from "@/components/FilterSidebar";
import GanttChart from "@/components/GanttChart";
import TaskDetailSidebar from "@/components/TaskDetailSidebar";
import AddTaskModal from "@/components/AddTaskModal";
import ManageMembersModal from "@/components/ManageMembersModal";
import { TaskWithUser, FilterState } from "@/lib/types";
import { Project, Task } from "@shared/schema";

export default function ProjectTimeline() {
  const params = useParams();
  const projectId = parseInt(params.id as string);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedTask, setSelectedTask] = useState<TaskWithUser | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    pillars: new Set(['Technical', 'On-Page & Content', 'Off-Page', 'Analytics']),
    phases: new Set(['1: Foundation', '2: Growth', '3: Authority']),
    assignees: new Set(),
    showCompleted: true,
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: project, isLoading: projectLoading, error: projectError } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: isAuthenticated && !isNaN(projectId),
  });

  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: [`/api/projects/${projectId}/tasks`],
    enabled: isAuthenticated && !isNaN(projectId),
  });

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: [`/api/projects/${projectId}/members`],
    enabled: isAuthenticated && !isNaN(projectId),
  });

  // Filter tasks based on current filters
  const filteredTasks = tasks?.filter(task => {
    if (task.pillar && !filters.pillars.has(task.pillar)) return false;
    if (task.phase && !filters.phases.has(task.phase)) return false;
    if (filters.assignees.size > 0 && task.assignedToId && !filters.assignees.has(task.assignedToId)) return false;
    if (!filters.showCompleted && task.status === 'Completed') return false;
    return true;
  }) || [];

  // Calculate project stats
  const projectStats = tasks ? {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'Completed').length,
    inProgressTasks: tasks.filter(t => t.status === 'In Progress').length,
    overdueTasks: tasks.filter(t => {
      if (!t.endDate) return false;
      const endDate = new Date(t.endDate);
      const today = new Date();
      return endDate < today && t.status !== 'Completed';
    }).length,
    averageProgress: tasks.length > 0 
      ? Math.round(tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / tasks.length)
      : 0,
  } : null;

  const handleExportExcel = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/export`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${project?.projectName || 'SEO-Timeline'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Excel file exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export Excel file",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated || isLoading) {
    return null;
  }

  if (isNaN(projectId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Project</h1>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">SEO Timeline Dashboard</h1>
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
              <span>Projects</span>
              <span>›</span>
              <span className="text-primary font-medium">{project?.projectName}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user?.profileImageUrl && (
              <img 
                className="w-8 h-8 rounded-full object-cover" 
                src={user.profileImageUrl} 
                alt="User avatar" 
              />
            )}
            <span className="text-sm font-medium text-gray-700">
              {user?.firstName} {user?.lastName}
            </span>
          </div>
        </div>
      </nav>

      {/* Timeline Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {project?.projectName || 'Loading...'}
            </h2>
            {projectStats && (
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <svg className="w-8 h-8 progress-ring" viewBox="0 0 32 32">
                    <circle 
                      cx="16" 
                      cy="16" 
                      r="14" 
                      stroke="#e5e7eb" 
                      strokeWidth="2" 
                      fill="none"
                    />
                    <circle 
                      cx="16" 
                      cy="16" 
                      r="14" 
                      stroke="#10b981" 
                      strokeWidth="2" 
                      fill="none" 
                      strokeDasharray="87.96" 
                      strokeDashoffset={87.96 - (87.96 * projectStats.averageProgress / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-700">
                      {projectStats.averageProgress}%
                    </span>
                  </div>
                </div>
                <span className="text-sm text-gray-600">Overall Progress</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportExcel}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowMembersModal(true)}
              className="flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Manage Members</span>
            </Button>
            <Button 
              size="sm"
              onClick={() => setShowAddTaskModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <FilterSidebar 
          filters={filters}
          onFiltersChange={setFilters}
          projectStats={projectStats}
          members={members}
        />
        
        <div className="flex-1 flex">
          <GanttChart 
            tasks={filteredTasks}
            onTaskSelect={setSelectedTask}
            selectedTask={selectedTask}
          />
          
          {selectedTask && (
            <TaskDetailSidebar
              task={selectedTask}
              members={members}
              onClose={() => setSelectedTask(null)}
              onTaskUpdate={() => {
                refetchTasks();
                setSelectedTask(null);
              }}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddTaskModal && (
        <AddTaskModal
          projectId={projectId}
          members={members}
          onClose={() => setShowAddTaskModal(false)}
          onTaskCreated={() => {
            refetchTasks();
            setShowAddTaskModal(false);
          }}
        />
      )}

      {showMembersModal && project && (
        <ManageMembersModal
          project={project}
          members={members}
          currentUser={user}
          onClose={() => setShowMembersModal(false)}
          onMembersUpdated={() => {
            refetchMembers();
          }}
        />
      )}
    </div>
  );
}
