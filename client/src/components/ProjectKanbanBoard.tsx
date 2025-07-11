import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  Clock, 
  User, 
  MessageSquare, 
  Paperclip, 
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Task {
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

interface KanbanColumn {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
  limit?: number;
}

interface ProjectKanbanBoardProps {
  projectId: number;
  onTaskSelect: (task: Task) => void;
  onAddTask: (status: string) => void;
}

const statusColumns: Omit<KanbanColumn, 'tasks'>[] = [
  {
    id: 'not-started',
    title: 'Not Started',
    color: 'bg-gray-100 border-gray-300',
    limit: 10
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    color: 'bg-blue-100 border-blue-300',
    limit: 5
  },
  {
    id: 'review',
    title: 'Review',
    color: 'bg-purple-100 border-purple-300',
    limit: 3
  },
  {
    id: 'completed',
    title: 'Completed',
    color: 'bg-green-100 border-green-300'
  },
  {
    id: 'on-hold',
    title: 'On Hold',
    color: 'bg-orange-100 border-orange-300'
  },
];

const priorityColors = {
  'Low': 'bg-green-100 text-green-800',
  'Medium': 'bg-yellow-100 text-yellow-800',
  'High': 'bg-orange-100 text-orange-800',
  'Critical': 'bg-red-100 text-red-800',
};

const pillarColors = {
  'Technical': 'bg-blue-100 text-blue-800',
  'On-Page & Content': 'bg-green-100 text-green-800',
  'Off-Page': 'bg-purple-100 text-purple-800',
  'Analytics': 'bg-orange-100 text-orange-800',
};

export default function ProjectKanbanBoard({ projectId, onTaskSelect, onAddTask }: ProjectKanbanBoardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: tasks = [], isLoading, error } = useQuery<Task[]>({
    queryKey: [`/api/projects/${projectId}/tasks`],
    queryFn: async () => {
      return await apiRequest(`/api/projects/${projectId}/tasks`, "GET");
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      return await apiRequest(`/api/tasks/${taskId}`, "PUT", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      toast({
        title: "Task updated",
        description: "Task status has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    const task = tasks.find(t => t.id.toString() === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setActiveTask(null);
      return;
    }

    const taskId = parseInt(active.id as string);
    const newStatus = over.id as string;
    
    // Convert column ID to status
    const statusMap: Record<string, string> = {
      'not-started': 'Not Started',
      'in-progress': 'In Progress',
      'review': 'Review',
      'completed': 'Completed',
      'on-hold': 'On Hold',
    };

    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== statusMap[newStatus]) {
      updateTaskStatusMutation.mutate({ 
        taskId, 
        status: statusMap[newStatus] 
      });
    }

    setActiveId(null);
    setActiveTask(null);
  };

  const getColumnId = (status: string): string => {
    const statusMap: Record<string, string> = {
      'Not Started': 'not-started',
      'In Progress': 'in-progress',
      'Review': 'review',
      'Completed': 'completed',
      'On Hold': 'on-hold',
    };
    return statusMap[status] || 'not-started';
  };

  // Group tasks by status
  const columns: KanbanColumn[] = statusColumns.map(column => ({
    ...column,
    tasks: tasks.filter(task => getColumnId(task.status) === column.id)
  }));

  // Create sortable task item component
  const SortableTaskItem = ({ task }: { task: Task }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: task.id.toString() });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onTaskSelect(task)}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm line-clamp-2">{task.taskName}</h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTaskSelect(task)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <Badge className={cn("text-xs", priorityColors[task.priority as keyof typeof priorityColors])}>
              {task.priority}
            </Badge>
            <Badge className={cn("text-xs", pillarColors[task.pillar as keyof typeof pillarColors])}>
              {task.pillar}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              {task.assignedToId && (
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>Assigned</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{task.progress}%</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {task._count && (
                <>
                  {task._count.comments > 0 && (
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{task._count.comments}</span>
                    </div>
                  )}
                  {task._count.attachments > 0 && (
                    <div className="flex items-center space-x-1">
                      <Paperclip className="w-3 h-3" />
                      <span>{task._count.attachments}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Progress value={task.progress} className="h-1" />
        </div>
      </div>
    );
  };

  const TaskOverlay = ({ task }: { task: Task | null }) => {
    if (!task) return null;

    return (
      <div className="bg-white border rounded-lg p-3 shadow-lg rotate-3 opacity-90">
        <h4 className="font-medium text-sm">{task.taskName}</h4>
        <div className="flex items-center space-x-2 mt-2">
          <Badge className={cn("text-xs", priorityColors[task.priority as keyof typeof priorityColors])}>
            {task.priority}
          </Badge>
          <span className="text-xs text-gray-500">{task.progress}%</span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600">Failed to load tasks</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-80">
            <Card className={cn("h-full", column.color)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {column.title}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {column.tasks.length}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onAddTask(column.title)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <SortableContext
                  items={column.tasks.map(task => task.id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  {column.tasks.map((task) => (
                    <SortableTaskItem key={task.id} task={task} />
                  ))}
                </SortableContext>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
      <DragOverlay>
        <TaskOverlay task={activeTask} />
      </DragOverlay>
    </DndContext>
  );
}
