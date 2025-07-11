import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity,
  User,
  Edit,
  MessageSquare,
  Paperclip,
  UserPlus,
  UserMinus,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Trash2,
  Plus,
  RotateCcw,
  AlertCircle,
  FileText,
  Link,
  Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskActivity {
  id: number;
  taskId: number;
  userId: string;
  type: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

interface TaskActivityLogProps {
  taskId: number;
}

const activityIcons = {
  // Task actions
  'task_created': Plus,
  'task_updated': Edit,
  'task_deleted': Trash2,
  'task_status_changed': CheckCircle,
  'task_assigned': User,
  'task_unassigned': UserMinus,
  'task_priority_changed': AlertCircle,
  'task_due_date_changed': Calendar,
  'task_progress_updated': RotateCcw,
  
  // Comments
  'comment_added': MessageSquare,
  'comment_updated': Edit,
  'comment_deleted': Trash2,
  
  // Attachments
  'attachment_added': Paperclip,
  'attachment_deleted': Trash2,
  
  // Followers
  'follower_added': UserPlus,
  'follower_removed': UserMinus,
  
  // Dependencies
  'dependency_added': Link,
  'dependency_removed': Link,
  
  // Time tracking
  'time_logged': Clock,
  'time_updated': Edit,
  'time_deleted': Trash2,
  
  // General
  'task_viewed': FileText,
  'task_restored': RotateCcw,
  'settings_changed': Settings,
  
  // Default
  'default': Activity,
};

const activityColors = {
  'task_created': 'text-green-500',
  'task_updated': 'text-blue-500',
  'task_deleted': 'text-red-500',
  'task_status_changed': 'text-purple-500',
  'task_assigned': 'text-indigo-500',
  'task_unassigned': 'text-gray-500',
  'task_priority_changed': 'text-orange-500',
  'task_due_date_changed': 'text-yellow-500',
  'task_progress_updated': 'text-teal-500',
  
  'comment_added': 'text-blue-500',
  'comment_updated': 'text-blue-400',
  'comment_deleted': 'text-red-500',
  
  'attachment_added': 'text-green-500',
  'attachment_deleted': 'text-red-500',
  
  'follower_added': 'text-green-500',
  'follower_removed': 'text-gray-500',
  
  'dependency_added': 'text-purple-500',
  'dependency_removed': 'text-gray-500',
  
  'time_logged': 'text-blue-500',
  'time_updated': 'text-blue-400',
  'time_deleted': 'text-red-500',
  
  'task_viewed': 'text-gray-400',
  'task_restored': 'text-green-500',
  'settings_changed': 'text-gray-500',
  
  'default': 'text-gray-500',
};

const getActivityIcon = (type: string) => {
  return activityIcons[type as keyof typeof activityIcons] || activityIcons.default;
};

const getActivityColor = (type: string) => {
  return activityColors[type as keyof typeof activityColors] || activityColors.default;
};

const formatActivityDescription = (activity: TaskActivity) => {
  const { type, description, metadata } = activity;
  
  switch (type) {
    case 'task_status_changed':
      return `changed status from "${metadata.oldStatus}" to "${metadata.newStatus}"`;
    case 'task_assigned':
      return `assigned task to ${metadata.assigneeName}`;
    case 'task_unassigned':
      return `unassigned task`;
    case 'task_priority_changed':
      return `changed priority from ${metadata.oldPriority} to ${metadata.newPriority}`;
    case 'task_due_date_changed':
      return `changed due date ${metadata.oldDate ? `from ${metadata.oldDate} ` : ''}to ${metadata.newDate}`;
    case 'task_progress_updated':
      return `updated progress from ${metadata.oldProgress}% to ${metadata.newProgress}%`;
    case 'comment_added':
      return `added a comment`;
    case 'comment_updated':
      return `updated a comment`;
    case 'comment_deleted':
      return `deleted a comment`;
    case 'attachment_added':
      return `attached file "${metadata.fileName}"`;
    case 'attachment_deleted':
      return `removed file "${metadata.fileName}"`;
    case 'follower_added':
      return `added ${metadata.followerName} as a follower`;
    case 'follower_removed':
      return `removed ${metadata.followerName} as a follower`;
    case 'dependency_added':
      return `added dependency on task "${metadata.dependencyName}"`;
    case 'dependency_removed':
      return `removed dependency on task "${metadata.dependencyName}"`;
    case 'time_logged':
      return `logged ${metadata.hours} hours`;
    case 'time_updated':
      return `updated time log`;
    case 'time_deleted':
      return `deleted time log`;
    default:
      return description;
  }
};

const isImportantActivity = (type: string) => {
  return [
    'task_created',
    'task_deleted',
    'task_status_changed',
    'task_assigned',
    'task_unassigned',
    'task_priority_changed',
    'task_due_date_changed',
    'comment_added',
    'attachment_added',
    'dependency_added',
    'dependency_removed',
  ].includes(type);
};

export default function TaskActivityLog({ taskId }: TaskActivityLogProps) {
  const { data: activities, isLoading } = useQuery<TaskActivity[]>({
    queryKey: [`/api/tasks/${taskId}/activities`],
    queryFn: async () => {
      return await apiRequest(`/api/tasks/${taskId}/activities`, "GET");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No activity recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, TaskActivity[]>);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Log ({activities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, dayActivities]) => (
            <div key={date} className="space-y-3">
              {/* Date header */}
              <div className="flex items-center space-x-2">
                <div className="h-px bg-gray-300 flex-1"></div>
                <Badge variant="outline" className="text-xs">
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Badge>
                <div className="h-px bg-gray-300 flex-1"></div>
              </div>
              
              {/* Activities for this date */}
              <div className="space-y-2">
                {dayActivities.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.type);
                  const color = getActivityColor(activity.type);
                  const isImportant = isImportantActivity(activity.type);
                  
                  return (
                    <div
                      key={activity.id}
                      className={cn(
                        "flex items-start space-x-3 p-3 rounded-lg transition-colors",
                        isImportant ? "bg-gray-50 border border-gray-200" : "hover:bg-gray-50"
                      )}
                    >
                      <div className={cn("flex-shrink-0 p-1.5 rounded-full", color)}>
                        <ActivityIcon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={activity.user.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {activity.user.firstName?.[0]}{activity.user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {activity.user.firstName} {activity.user.lastName}
                          </span>
                          <span className="text-sm text-gray-600">
                            {formatActivityDescription(activity)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </span>
                          {isImportant && (
                            <Badge variant="secondary" className="text-xs">
                              Important
                            </Badge>
                          )}
                        </div>
                        
                        {/* Additional metadata */}
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                            {activity.type === 'task_updated' && activity.metadata.changes && (
                              <div>
                                <span className="font-medium">Changes:</span>
                                <ul className="mt-1 space-y-1">
                                  {Object.entries(activity.metadata.changes).map(([field, change]: [string, any]) => (
                                    <li key={field} className="flex items-center space-x-2">
                                      <span className="capitalize">{field}:</span>
                                      <span>
                                        {change.from && <span className="line-through text-red-500">{change.from}</span>}
                                        {change.from && change.to && <span className="mx-1">→</span>}
                                        {change.to && <span className="text-green-600">{change.to}</span>}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {activity.type === 'comment_added' && activity.metadata.excerpt && (
                              <div>
                                <span className="font-medium">Comment:</span>
                                <p className="mt-1 italic">"{activity.metadata.excerpt}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
