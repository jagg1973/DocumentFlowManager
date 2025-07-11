import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Link, 
  Unlink, 
  Plus, 
  Trash2,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Network
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface TaskDependency {
  id: number;
  taskId: number;
  dependsOnTaskId: number;
  type: 'blocks' | 'blocked_by';
  createdAt: string;
  dependsOnTask: {
    id: number;
    taskName: string;
    status: string;
    progress: number;
    pillar: string;
  };
}

interface Task {
  id: number;
  taskName: string;
  status: string;
  progress: number;
  pillar: string;
}

interface TaskDependenciesProps {
  taskId: number;
  projectId: number;
  currentTaskStatus: string;
}

const dependencyTypeLabels = {
  'blocks': 'Blocks',
  'blocked_by': 'Blocked by',
};

const dependencyTypeColors = {
  'blocks': 'bg-red-100 text-red-800',
  'blocked_by': 'bg-yellow-100 text-yellow-800',
};

const statusColors = {
  'Not Started': 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Review': 'bg-purple-100 text-purple-800',
  'Completed': 'bg-green-100 text-green-800',
  'On Hold': 'bg-orange-100 text-orange-800',
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Completed':
      return CheckCircle;
    case 'In Progress':
      return Clock;
    case 'Review':
      return AlertTriangle;
    default:
      return Clock;
  }
};

export default function TaskDependencies({ taskId, projectId, currentTaskStatus }: TaskDependenciesProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [dependencyType, setDependencyType] = useState<'blocks' | 'blocked_by'>('blocked_by');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dependencies, isLoading: dependenciesLoading } = useQuery<TaskDependency[]>({
    queryKey: [`/api/tasks/${taskId}/dependencies`],
    queryFn: async () => {
      return await apiRequest(`/api/tasks/${taskId}/dependencies`, "GET");
    },
  });

  const { data: availableTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: [`/api/projects/${projectId}/tasks`],
    queryFn: async () => {
      return await apiRequest(`/api/projects/${projectId}/tasks`, "GET");
    },
  });

  const addDependencyMutation = useMutation({
    mutationFn: async (data: { dependsOnTaskId: number; type: 'blocks' | 'blocked_by' }) => {
      return await apiRequest(`/api/tasks/${taskId}/dependencies`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/dependencies`] });
      setSelectedTaskId("");
      toast({
        title: "Success",
        description: "Dependency added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add dependency",
        variant: "destructive",
      });
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: async (dependencyId: number) => {
      return await apiRequest(`/api/tasks/${taskId}/dependencies/${dependencyId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/dependencies`] });
      toast({
        title: "Success",
        description: "Dependency removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove dependency",
        variant: "destructive",
      });
    },
  });

  const handleAddDependency = () => {
    if (!selectedTaskId) return;
    
    const dependsOnTaskId = parseInt(selectedTaskId);
    addDependencyMutation.mutate({ dependsOnTaskId, type: dependencyType });
  };

  const handleRemoveDependency = (dependencyId: number) => {
    if (window.confirm('Are you sure you want to remove this dependency?')) {
      removeDependencyMutation.mutate(dependencyId);
    }
  };

  // Filter out current task and tasks that already have dependencies
  const filteredTasks = availableTasks?.filter(task => {
    if (task.id === taskId) return false;
    
    const existingDependency = dependencies?.find(dep => 
      dep.dependsOnTaskId === task.id || 
      (dep.type === 'blocks' && task.id === dep.taskId)
    );
    
    return !existingDependency;
  }) || [];

  const blockedByTasks = dependencies?.filter(dep => dep.type === 'blocked_by') || [];
  const blockingTasks = dependencies?.filter(dep => dep.type === 'blocks') || [];

  // Check if task is blocked
  const isBlocked = blockedByTasks.some(dep => dep.dependsOnTask.status !== 'Completed');

  if (dependenciesLoading || tasksLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Blocking Status Alert */}
      {isBlocked && (
        <Card className="glass-card border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                This task is blocked by {blockedByTasks.filter(dep => dep.dependsOnTask.status !== 'Completed').length} incomplete dependencies
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Dependency */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Dependency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Dependency Type</label>
                <Select value={dependencyType} onValueChange={(value: 'blocks' | 'blocked_by') => setDependencyType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blocked_by">This task is blocked by</SelectItem>
                    <SelectItem value="blocks">This task blocks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Task</label>
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {task.pillar}
                          </Badge>
                          <span className="truncate">{task.taskName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleAddDependency}
                disabled={!selectedTaskId || addDependencyMutation.isPending}
              >
                <Link className="w-4 h-4 mr-2" />
                Add Dependency
              </Button>
            </div>
            
            {filteredTasks.length === 0 && (
              <p className="text-sm text-gray-500">
                No available tasks to create dependencies with
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blocked By Dependencies */}
      {blockedByTasks.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Blocked By ({blockedByTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blockedByTasks.map((dependency) => {
                const task = dependency.dependsOnTask;
                const StatusIcon = getStatusIcon(task.status);
                const isCompleted = task.status === 'Completed';
                
                return (
                  <div
                    key={dependency.id}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-lg transition-colors",
                      isCompleted ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <StatusIcon className={cn(
                        "w-5 h-5",
                        isCompleted ? "text-green-600" : "text-red-600"
                      )} />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{task.taskName}</span>
                          <Badge variant="outline" className="text-xs">
                            {task.pillar}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={cn("text-xs", statusColors[task.status as keyof typeof statusColors])}>
                            {task.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {task.progress}% complete
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDependency(dependency.id)}
                        disabled={removeDependencyMutation.isPending}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocking Dependencies */}
      {blockingTasks.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-orange-500" />
              Blocking ({blockingTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blockingTasks.map((dependency) => {
                const task = dependency.dependsOnTask;
                const StatusIcon = getStatusIcon(task.status);
                const isCurrentTaskCompleted = currentTaskStatus === 'Completed';
                
                return (
                  <div
                    key={dependency.id}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-lg transition-colors",
                      isCurrentTaskCompleted ? "bg-gray-50 border-gray-200" : "bg-orange-50 border-orange-200"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <StatusIcon className={cn(
                        "w-5 h-5",
                        isCurrentTaskCompleted ? "text-gray-600" : "text-orange-600"
                      )} />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{task.taskName}</span>
                          <Badge variant="outline" className="text-xs">
                            {task.pillar}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={cn("text-xs", statusColors[task.status as keyof typeof statusColors])}>
                            {task.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {task.progress}% complete
                          </span>
                          {!isCurrentTaskCompleted && (
                            <span className="text-xs text-orange-600">
                              Waiting for this task
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDependency(dependency.id)}
                        disabled={removeDependencyMutation.isPending}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!dependencies || dependencies.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No dependencies set up yet</p>
          <p className="text-sm">Add dependencies to define task relationships</p>
        </div>
      )}
    </div>
  );
}
