import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, CheckCircle, AlertCircle } from "lucide-react";
import { ProjectWithStats } from "@/lib/types";
import { Link } from "wouter";

interface ProjectCardProps {
  project: ProjectWithStats;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const progressPercent = project.averageProgress;
  const circumference = 2 * Math.PI * 14;
  const strokeDashoffset = circumference - (circumference * progressPercent / 100);

  return (
    <Card className="glass-card hover:shadow-2xl transition-all duration-300 specular-highlight group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
              {project.name || project.projectName}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="relative ml-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-green-400/20 to-emerald-400/20 blur-lg group-hover:blur-xl transition-all"></div>
            <svg className="w-12 h-12 progress-ring relative z-10" viewBox="0 0 32 32">
              <circle 
                cx="16" 
                cy="16" 
                r="14" 
                stroke="rgba(229, 231, 235, 0.3)" 
                strokeWidth="2" 
                fill="none"
              />
              <circle 
                cx="16" 
                cy="16" 
                r="14" 
                stroke="url(#progressGradient)" 
                strokeWidth="2" 
                fill="none" 
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-700 group-hover:text-green-700 transition-colors">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Project Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-gray-600">Completed:</span>
            <span className="font-medium">{project.completedTasks}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-gray-600">In Progress:</span>
            <span className="font-medium">{project.inProgressTasks}</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-gray-600">Overdue:</span>
            <span className="font-medium text-red-600">{project.overdueTasks}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Total:</span>
            <span className="font-medium">{project.totalTasks}</span>
          </div>
        </div>

        {/* Team Members */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Team:</span>
            <div className="flex -space-x-2">
              {project.members.slice(0, 4).map((member, index) => (
                <Avatar key={member.id} className="w-6 h-6 border-2 border-white">
                  <AvatarImage src={member.user.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.members.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
          </div>
          
          {project.overdueTasks > 0 && (
            <Badge variant="destructive" className="text-xs">
              {project.overdueTasks} Overdue
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Link href={`/project/${project.id}`} className="flex-1">
            <Button className="w-full glass-button bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-400/30 text-white hover:from-blue-600 hover:to-indigo-700" size="sm">
              View Timeline
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="flex-1 glass-button border-white/30 hover:border-white/50 hover:bg-white/10">
            Manage Members
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
