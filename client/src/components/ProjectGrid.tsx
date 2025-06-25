import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Target,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  Search,
  Grid3X3,
  List,
  Star,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Activity,
  Zap,
  Trophy,
  Shield
} from "lucide-react";
import { Link } from "wouter";
import { ProjectWithStats } from "@/lib/types";

interface ProjectGridProps {
  projects: ProjectWithStats[];
  isLoading?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onProjectSelect?: (project: ProjectWithStats) => void;
}

const ProjectStatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    'active': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    'planning': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
    'on-hold': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
    'completed': { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Trophy },
    'archived': { color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Shield }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['planning'];
  const IconComponent = config.icon;
  
  return (
    <Badge className={`${config.color} border flex items-center gap-1 px-2 py-1`}>
      <IconComponent className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const ProjectPriorityIndicator = ({ priority }: { priority: string }) => {
  const priorityConfig = {
    'high': { color: 'border-l-red-500 bg-red-50', dot: 'bg-red-500' },
    'medium': { color: 'border-l-yellow-500 bg-yellow-50', dot: 'bg-yellow-500' },
    'low': { color: 'border-l-green-500 bg-green-50', dot: 'bg-green-500' }
  };
  
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig['medium'];
  
  return (
    <div className={`w-1 h-full absolute left-0 top-0 ${config.color.split(' ')[0]} rounded-l-lg`}></div>
  );
};

const ProjectMetrics = ({ project }: { project: ProjectWithStats }) => {
  const completionRate = project.totalTasks > 0 ? (project.completedTasks / project.totalTasks * 100) : 0;
  const daysRemaining = project.endDate ? Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  
  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">{Math.round(completionRate)}%</span>
        </div>
        <Progress value={completionRate} className="h-2" />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Tasks</span>
          <span className="font-medium">{project.completedTasks}/{project.totalTasks}</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-xs text-gray-500">{project.completedTasks} completed</span>
        </div>
      </div>
      
      {daysRemaining !== null && (
        <div className="col-span-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-gray-600">
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : 
               daysRemaining === 0 ? 'Due today' : 
               `${Math.abs(daysRemaining)} days overdue`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectTeamAvatars = ({ project }: { project: ProjectWithStats }) => {
  // Mock team data - replace with actual team members
  const teamMembers = [
    { id: '1', name: 'John Doe', avatar: null },
    { id: '2', name: 'Jane Smith', avatar: null },
    { id: '3', name: 'Mike Johnson', avatar: null }
  ];
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-500" />
        <div className="flex -space-x-2">
          {teamMembers.slice(0, 3).map((member, index) => (
            <Tooltip key={member.id}>
              <TooltipTrigger>
                <Avatar className="w-6 h-6 border-2 border-white shadow-sm">
                  <AvatarImage src={member.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{member.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {teamMembers.length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-600">+{teamMembers.length - 3}</span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

const ProjectGridCard = ({ project }: { project: ProjectWithStats }) => {
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  return (
    <Card 
      className="group glass-card liquid-border hover:shadow-xl transition-all duration-300 relative overflow-hidden cursor-pointer"
      onMouseEnter={() => setShowQuickActions(true)}
      onMouseLeave={() => setShowQuickActions(false)}
    >
      <ProjectPriorityIndicator priority={project.priority || 'medium'} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
              {project.name || project.projectName}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {project.description || "SEO optimization project with comprehensive strategy implementation"}
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-2">
            <ProjectStatusBadge status={project.status || 'active'} />
            
            {showQuickActions && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Project Actions</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="outline" className="w-full justify-start">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    <Button variant="outline" className="w-full justify-start">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Project
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <ProjectMetrics project={project} />
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <ProjectTeamAvatars project={project} />
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Activity className="w-4 h-4" />
              <span>24h</span>
            </div>
            
            <Link href={`/projects/${project.id}`}>
              <Button size="sm" className="glass-button">
                <Zap className="w-4 h-4 mr-1" />
                Open
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </Card>
  );
};

const ProjectListItem = ({ project }: { project: ProjectWithStats }) => {
  const completionRate = project.totalTasks > 0 ? (project.completedTasks / project.totalTasks * 100) : 0;
  
  return (
    <Card className="glass-card hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-2 h-12 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{project.name || project.projectName}</h3>
              <p className="text-sm text-gray-600 truncate">
                {project.description || "SEO optimization project"}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <ProjectTeamAvatars project={project} />
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>Due {new Date(project.endDate || new Date()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{Math.round(completionRate)}%</div>
              <div className="text-xs text-gray-500">Complete</div>
              <Progress value={completionRate} className="w-16 h-1 mt-1" />
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{project.completedTasks}/{project.totalTasks}</div>
              <div className="text-xs text-gray-500">Tasks</div>
            </div>
            
            <ProjectStatusBadge status={project.status || 'active'} />
            
            <Link href={`/projects/${project.id}`}>
              <Button variant="outline" size="sm" className="glass-button">
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ProjectGrid({ 
  projects, 
  isLoading = false, 
  viewMode = 'grid',
  onViewModeChange,
  onProjectSelect 
}: ProjectGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  
  const filteredProjects = projects.filter(project => {
    const projectName = project.name || project.projectName || '';
    const matchesSearch = projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || project.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="glass-card animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Filter Bar */}
      <div className="glass-card p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent glass-input"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 glass-input"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 glass-input"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange?.('grid')}
              className="glass-button"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange?.('list')}
              className="glass-button"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
            <div className="text-sm text-gray-600">Total Projects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {projects.filter(p => p.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {projects.filter(p => p.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(projects.reduce((acc, p) => acc + (p.totalTasks > 0 ? (p.completedTasks / p.totalTasks * 100) : 0), 0) / projects.length) || 0}%
            </div>
            <div className="text-sm text-gray-600">Avg Progress</div>
          </div>
        </div>
      </div>

      {/* Projects Display */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your filters or search terms"
              : "Create your first SEO project to get started"}
          </p>
          <Button className="glass-button">
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-4"
        }>
          {filteredProjects.map((project) => (
            viewMode === 'grid' ? (
              <ProjectGridCard key={project.id} project={project} />
            ) : (
              <ProjectListItem key={project.id} project={project} />
            )
          ))}
        </div>
      )}
    </div>
  );
}