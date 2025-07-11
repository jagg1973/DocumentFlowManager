import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  BellRing, 
  Check, 
  X, 
  Eye, 
  EyeOff,
  Settings,
  MessageSquare,
  UserPlus,
  FileText,
  Calendar,
  Clock,
  Target,
  Link,
  Paperclip,
  Flag,
  CheckCircle,
  AlertCircle,
  Trash2,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface TaskNotification {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata: {
    taskId?: number;
    taskName?: string;
    actorId?: string;
    actorName?: string;
    projectId?: number;
    projectName?: string;
    url?: string;
  };
}

interface TaskNotificationsProps {
  currentUserId: string;
}

const notificationIcons = {
  'task_assigned': Target,
  'task_unassigned': Target,
  'task_status_changed': CheckCircle,
  'task_due_soon': AlertCircle,
  'task_overdue': AlertCircle,
  'task_completed': CheckCircle,
  'comment_added': MessageSquare,
  'comment_mention': MessageSquare,
  'follower_added': UserPlus,
  'attachment_added': Paperclip,
  'dependency_added': Link,
  'dependency_resolved': Link,
  'task_created': FileText,
  'task_updated': FileText,
  'time_logged': Clock,
  'priority_changed': Flag,
  'deadline_changed': Calendar,
  'default': Bell,
};

const notificationColors = {
  'task_assigned': 'text-blue-500',
  'task_unassigned': 'text-gray-500',
  'task_status_changed': 'text-green-500',
  'task_due_soon': 'text-orange-500',
  'task_overdue': 'text-red-500',
  'task_completed': 'text-green-500',
  'comment_added': 'text-blue-500',
  'comment_mention': 'text-purple-500',
  'follower_added': 'text-indigo-500',
  'attachment_added': 'text-teal-500',
  'dependency_added': 'text-purple-500',
  'dependency_resolved': 'text-green-500',
  'task_created': 'text-blue-500',
  'task_updated': 'text-blue-500',
  'time_logged': 'text-orange-500',
  'priority_changed': 'text-red-500',
  'deadline_changed': 'text-yellow-500',
  'default': 'text-gray-500',
};

export default function TaskNotifications({ currentUserId }: TaskNotificationsProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [isOpen, setIsOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<TaskNotification[]>({
    queryKey: [`/api/users/${currentUserId}/notifications`],
    queryFn: async () => {
      return await apiRequest(`/api/users/${currentUserId}/notifications`, "GET");
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/${notificationId}/read`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications`] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/users/${currentUserId}/notifications/mark-all-read`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications`] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/${notificationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications`] });
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    },
  });

  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/users/${currentUserId}/notifications/clear-all`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications`] });
      toast({
        title: "Success",
        description: "All notifications cleared",
      });
    },
  });

  const handleNotificationClick = (notification: TaskNotification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Navigate to the relevant page if URL is provided
    if (notification.metadata.url) {
      window.location.href = notification.metadata.url;
    } else if (notification.metadata.taskId) {
      // Default navigation to task
      window.location.href = `/projects/${notification.metadata.projectId}?task=${notification.metadata.taskId}`;
    }
  };

  const handleMarkAsRead = (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleDelete = (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    return notificationIcons[type as keyof typeof notificationIcons] || notificationIcons.default;
  };

  const getNotificationColor = (type: string) => {
    return notificationColors[type as keyof typeof notificationColors] || notificationColors.default;
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'read':
        return notification.isRead;
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BellRing className="w-5 h-5" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} new</Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Filter className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilter('all')}>
                    All notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('unread')}>
                    Unread only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('read')}>
                    Read only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={unreadCount === 0}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark all as read
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => clearAllNotificationsMutation.mutate()}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear all
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>
                {filter === 'unread' ? 'No unread notifications' : 
                 filter === 'read' ? 'No read notifications' : 
                 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => {
                const NotificationIcon = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);
                
                return (
                  <Card 
                    key={notification.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      !notification.isRead && "bg-blue-50 border-blue-200"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={cn("p-2 rounded-full bg-gray-100", iconColor)}>
                          <NotificationIcon className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{notification.title}</p>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              
                              {notification.metadata.actorName && (
                                <div className="flex items-center space-x-2 mt-2">
                                  <Avatar className="w-5 h-5">
                                    <AvatarFallback className="text-xs">
                                      {notification.metadata.actorName.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-gray-500">
                                    {notification.metadata.actorName}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </span>
                                {notification.metadata.projectName && (
                                  <>
                                    <span className="text-xs text-gray-400">•</span>
                                    <Badge variant="outline" className="text-xs">
                                      {notification.metadata.projectName}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleMarkAsRead(notification.id, e)}
                                  title="Mark as read"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDelete(notification.id, e)}
                                title="Delete notification"
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
