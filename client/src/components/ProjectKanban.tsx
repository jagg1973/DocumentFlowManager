import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Calendar,
  Users,
  Target,
  CheckCircle2,
  AlertTriangle,
  Plus,
  MoreHorizontal,
  Star,
  MessageSquare,
  Paperclip,
  TrendingUp,
  Settings,
  FileText,
  Globe,
  BarChart3
} from "lucide-react";
import { ProjectWithStats } from "@/lib/types";

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  projects: ProjectWithStats[];
  limit?: number;
}

interface ProjectKanbanProps {
  projects: ProjectWithStats[];
  onProjectUpdate?: (projectId: number, updates: Partial<ProjectWithStats>) => void;
}

const INITIAL_COLUMNS: Omit<KanbanColumn, 'projects'>[] = [
  { id: 'planning', title: 'Planning', color: 'bg-blue-500', limit: 5 },
  { id: 'active', title: 'In Progress', color: 'bg-yellow-500' },
  { id: 'review', title: 'Review', color: 'bg-purple-500', limit: 3 },
  { id: 'completed', title: 'Completed', color: 'bg-green-500' }
];

const PILLAR_ICONS = {
  'Technical SEO': Settings,
  'On-Page & Content': FileText,
  'Off-Page SEO': Globe,
  'Analytics & Tracking': BarChart3
};

const PRIORITY_COLORS = {
  high: 'border-l-red-500 bg-red-50',
  medium: 'border-l-yellow-500 bg-yellow-50',
  low: 'border-l-green-500 bg-green-50'
};

const ProjectKanbanCard = ({ project, index }: { project: ProjectWithStats; index: number }) => {
  const completionRate = project.totalTasks > 0 ? (project.completedTasks / project.totalTasks * 100) : 0;
  const daysRemaining = project.endDate ? Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  
  const PillarIcon = PILLAR_ICONS[project.pillar as keyof typeof PILLAR_ICONS] || Target;
  const priorityStyle = PRIORITY_COLORS[project.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium;

  return (
    <Draggable draggableId={project.id.toString()} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-3 cursor-grab active:cursor-grabbing transition-all duration-200 ${
            snapshot.isDragging 
              ? 'shadow-2xl rotate-2 bg-white border-blue-500' 
              : 'hover:shadow-lg glass-card'
          } border-l-4 ${priorityStyle.split(' ')[0]}`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                  {project.name}
                </CardTitle>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <PillarIcon className="w-3 h-3 text-gray-600" />
                    <span className="text-xs text-gray-600">{project.pillar}</span>
                  </div>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {project.phase}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{Math.round(completionRate)}%</span>
                </div>
                <Progress value={completionRate} className="h-1" />
              </div>

              {/* Tasks and Due Date */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-gray-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{project.completedTasks}/{project.totalTasks}</span>
                </div>
                {daysRemaining !== null && (
                  <div className={`flex items-center gap-1 ${
                    daysRemaining < 0 ? 'text-red-600' : 
                    daysRemaining <= 3 ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    <Calendar className="w-3 h-3" />
                    <span>
                      {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` :
                       daysRemaining === 0 ? 'Due today' :
                       `${daysRemaining}d left`}
                    </span>
                  </div>
                )}
              </div>

              {/* Team and Priority */}
              <div className="flex items-center justify-between">
                <div className="flex -space-x-1">
                  {[1, 2, 3].map((_, i) => (
                    <Avatar key={i} className="w-5 h-5 border border-white">
                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        U{i + 1}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-1 py-0 ${
                      project.priority === 'high' ? 'border-red-500 text-red-700' :
                      project.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                      'border-green-500 text-green-700'
                    }`}
                  >
                    {project.priority}
                  </Badge>
                </div>
              </div>

              {/* Meta information */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>3</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    <span>2</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-green-600">+12%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
};

const KanbanColumn = ({ column, projects }: { column: Omit<KanbanColumn, 'projects'>; projects: ProjectWithStats[] }) => {
  const isOverLimit = column.limit && projects.length > column.limit;
  
  return (
    <div className="flex-1 min-w-80">
      <div className="glass-card p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
            <Badge variant="secondary" className="text-xs">
              {projects.length}
            </Badge>
            {isOverLimit && (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100">
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-32 transition-colors duration-200 rounded-lg p-2 ${
                snapshot.isDraggingOver 
                  ? 'bg-blue-50 border-2 border-dashed border-blue-300' 
                  : 'bg-transparent'
              }`}
            >
              {projects.map((project, index) => (
                <ProjectKanbanCard key={project.id} project={project} index={index} />
              ))}
              {provided.placeholder}
              
              {projects.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Target className="w-6 h-6" />
                  </div>
                  <p className="text-sm">No projects here</p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
};

export default function ProjectKanban({ projects, onProjectUpdate }: ProjectKanbanProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(() => {
    return INITIAL_COLUMNS.map(col => ({
      ...col,
      projects: projects.filter(p => p.status === col.id)
    }));
  });

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);
    
    if (!sourceColumn || !destColumn) return;

    const projectId = parseInt(draggableId);
    const movingProject = sourceColumn.projects.find(p => p.id === projectId);
    
    if (!movingProject) return;

    // Update project status
    const updatedProject = { ...movingProject, status: destination.droppableId };
    
    // Update columns
    const newColumns = columns.map(col => {
      if (col.id === source.droppableId) {
        const newProjects = [...col.projects];
        newProjects.splice(source.index, 1);
        return { ...col, projects: newProjects };
      }
      if (col.id === destination.droppableId) {
        const newProjects = [...col.projects];
        newProjects.splice(destination.index, 0, updatedProject);
        return { ...col, projects: newProjects };
      }
      return col;
    });

    setColumns(newColumns);
    
    // Call update callback
    onProjectUpdate?.(projectId, { status: destination.droppableId });
  }, [columns, onProjectUpdate]);

  return (
    <div className="w-full">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {columns.map(column => (
            <KanbanColumn 
              key={column.id} 
              column={column} 
              projects={column.projects}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}