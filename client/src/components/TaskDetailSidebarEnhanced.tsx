import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X, 
  Save, 
  Trash2, 
  FileText, 
  MessageSquare,
  Paperclip,
  Users,
  Activity,
  Timer,
  Network,
  Calendar,
  User,
  Target,
  Flag,
  Star,
  BarChart3,
  AlertCircle,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Task } from "@shared/schema";
import { getPillarColor, getStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Import user type
import type { User as UserType } from "@shared/schema";

// Import new components
import TaskComments from "./TaskComments";
import TaskAttachments from "./TaskAttachments";
import TaskFollowers from "./TaskFollowers";
import TaskActivityLog from "./TaskActivityLog";
import TaskTimeTracking from "./TaskTimeTracking";
import TaskDependencies from "./TaskDependencies";
import TaskItemsManager from "./TaskItemsManager";
import MemberAuthorityDisplay from "./MemberAuthorityDisplay";

interface TaskDetailSidebarProps {
  task: Task;
  members: Array<{
    id: number;
    userId: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
    };
  }> | undefined;
  currentUser: UserType | undefined;
  onClose: () => void;
  onTaskUpdate: () => void;
}

interface TaskStats {
  commentCount: number;
  attachmentCount: number;
  followerCount: number;
  totalTimeLogged: number;
  dependencyCount: number;
}

const priorityOptions = [
  { value: 'Low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'Medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'High', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'Critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

const statusOptions = [
  { value: 'Not Started', label: 'Not Started', color: 'bg-gray-100 text-gray-800' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'Review', label: 'Review', color: 'bg-purple-100 text-purple-800' },
  { value: 'Completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'On Hold', label: 'On Hold', color: 'bg-orange-100 text-orange-800' },
];

export default function TaskDetailSidebar({ 
  task, 
  members, 
  currentUser,
  onClose, 
  onTaskUpdate 
}: TaskDetailSidebarProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    taskName: task.taskName,
    pillar: task.pillar || '',
    phase: task.phase || '',
    assignedToId: task.assignedToId || '',
    startDate: typeof task.startDate === 'string' ? task.startDate : task.startDate?.toISOString().split('T')[0] || '',
    endDate: typeof task.endDate === 'string' ? task.endDate : task.endDate?.toISOString().split('T')[0] || '',
    progress: task.progress || 0,
    status: task.status || 'Not Started',
    priority: (task as any).priority || 'Medium',
    description: task.description || '',
    guidelineDocLink: task.guidelineDocLink || '',
    estimatedHours: (task as any).estimatedHours || '',
    tags: (task as any).tags || '',
  });

  // Fetch task stats
  const { data: taskStats } = useQuery<TaskStats>({
    queryKey: [`/api/tasks/${task.id}/stats`],
    queryFn: async () => {
      return await apiRequest(`/api/tasks/${task.id}/stats`, "GET");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: Partial<typeof formData>) => {
      await apiRequest(`/api/tasks/${task.id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      onTaskUpdate();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/tasks/${task.id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      onTaskUpdate();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const updates = { ...formData };
    if (!updates.assignedToId) {
      updates.assignedToId = null as any;
    }
    updateTaskMutation.mutate(updates);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      deleteTaskMutation.mutate();
    }
  };

  const assignedMember = members?.find(m => m.userId === formData.assignedToId);
  const currentPriority = priorityOptions.find(p => p.value === formData.priority);
  const currentStatus = statusOptions.find(s => s.value === formData.status);

  return (
    <div className="w-[500px] glass-sidebar border-l border-white/20 flex-shrink-0 slide-in-right">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900 specular-highlight">
                Task Details
              </h3>
              {currentPriority && (
                <Badge className={cn("text-xs", currentPriority.color)}>
                  <Flag className="w-3 h-3 mr-1" />
                  {currentPriority.label}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="glass-button hover:bg-white/20" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Task Stats */}
          {taskStats && (
            <div className="grid grid-cols-5 gap-2 mt-4">
              <div className="text-center">
                <div className="text-sm font-medium text-blue-600">{taskStats.commentCount}</div>
                <div className="text-xs text-gray-500">Comments</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-green-600">{taskStats.attachmentCount}</div>
                <div className="text-xs text-gray-500">Files</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-purple-600">{taskStats.followerCount}</div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-orange-600">{taskStats.totalTimeLogged}h</div>
                <div className="text-xs text-gray-500">Logged</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-red-600">{taskStats.dependencyCount}</div>
                <div className="text-xs text-gray-500">Dependencies</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="details" className="h-full">
            <TabsList className="glass-modal border-white/20 mx-6 my-4">
              <TabsTrigger value="details">
                <FileText className="w-4 h-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger value="comments">
                <MessageSquare className="w-4 h-4 mr-2" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="attachments">
                <Paperclip className="w-4 h-4 mr-2" />
                Files
              </TabsTrigger>
              <TabsTrigger value="followers">
                <Users className="w-4 h-4 mr-2" />
                Followers
              </TabsTrigger>
              <TabsTrigger value="time">
                <Timer className="w-4 h-4 mr-2" />
                Time
              </TabsTrigger>
              <TabsTrigger value="dependencies">
                <Network className="w-4 h-4 mr-2" />
                Dependencies
              </TabsTrigger>
              <TabsTrigger value="activity">
                <Activity className="w-4 h-4 mr-2" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="items">
                <BarChart3 className="w-4 h-4 mr-2" />
                Items
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="px-6 pb-6">
              <div className="space-y-6">
                {/* Task Name */}
                <div>
                  <Label htmlFor="taskName">Task Name</Label>
                  <Input
                    id="taskName"
                    value={formData.taskName}
                    onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                    className="mt-2"
                  />
                </div>

                {/* Status and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                              <Badge className={cn("text-xs", option.color)}>
                                {option.label}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Priority</Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                              <Flag className="w-3 h-3" />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* SEO Pillar and Phase */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SEO Pillar</Label>
                    <Select 
                      value={formData.pillar || ""} 
                      onValueChange={(value) => setFormData({ ...formData, pillar: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a pillar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technical">Technical SEO</SelectItem>
                        <SelectItem value="On-Page & Content">On-Page & Content</SelectItem>
                        <SelectItem value="Off-Page">Off-Page SEO</SelectItem>
                        <SelectItem value="Analytics">Analytics & Tracking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>SEO Phase</Label>
                    <Select 
                      value={formData.phase || ""} 
                      onValueChange={(value) => setFormData({ ...formData, phase: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1: Foundation">1: Foundation</SelectItem>
                        <SelectItem value="2: Growth">2: Growth</SelectItem>
                        <SelectItem value="3: Authority">3: Authority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Assigned To */}
                <div>
                  <Label>Assigned To</Label>
                  <div className="flex items-center space-x-3 mt-2">
                    {assignedMember && (
                      <MemberAuthorityDisplay
                        userId={assignedMember.userId}
                        userName={`${assignedMember.user.firstName} ${assignedMember.user.lastName}`}
                        userImage={assignedMember.user.profileImageUrl}
                      />
                    )}
                    <Select 
                      value={formData.assignedToId || ""} 
                      onValueChange={(value) => setFormData({ ...formData, assignedToId: value === "unassigned" ? "" : value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members?.map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            {member.user.firstName} {member.user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Due Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <Label>Progress: {formData.progress}%</Label>
                  <Slider
                    value={[formData.progress]}
                    onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                </div>

                {/* Estimated Hours */}
                <div>
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    className="mt-2"
                    placeholder="8.5"
                  />
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="mt-2"
                    placeholder="urgent, seo, technical"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-2"
                    rows={4}
                    placeholder="Task description..."
                  />
                </div>

                {/* Guideline Document Link */}
                <div>
                  <Label htmlFor="guidelineDocLink">Guideline Document Link</Label>
                  <Input
                    id="guidelineDocLink"
                    value={formData.guidelineDocLink}
                    onChange={(e) => setFormData({ ...formData, guidelineDocLink: e.target.value })}
                    className="mt-2"
                    placeholder="https://..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <Button 
                    onClick={handleDelete}
                    variant="destructive"
                    size="sm"
                    disabled={deleteTaskMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Task
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={updateTaskMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="comments" className="px-6 pb-6">
              <TaskComments taskId={task.id} currentUserId={currentUser?.id || ""} />
            </TabsContent>
            
            <TabsContent value="attachments" className="px-6 pb-6">
              <TaskAttachments taskId={task.id} currentUserId={currentUser?.id || ""} />
            </TabsContent>
            
            <TabsContent value="followers" className="px-6 pb-6">
              <TaskFollowers 
                taskId={task.id} 
                currentUserId={currentUser?.id || ""}
                projectMembers={members?.map(m => ({
                  id: m.id,
                  userId: m.userId,
                  role: 'member', // You might want to fetch actual roles
                  user: m.user
                })) || []}
                taskOwnerId={task.createdBy || undefined}
                taskAssigneeId={task.assignedToId || undefined}
              />
            </TabsContent>
            
            <TabsContent value="time" className="px-6 pb-6">
              <TaskTimeTracking taskId={task.id} currentUserId={currentUser?.id || ""} />
            </TabsContent>
            
            <TabsContent value="dependencies" className="px-6 pb-6">
              <TaskDependencies 
                taskId={task.id} 
                projectId={task.projectId}
                currentTaskStatus={formData.status}
              />
            </TabsContent>
            
            <TabsContent value="activity" className="px-6 pb-6">
              <TaskActivityLog taskId={task.id} />
            </TabsContent>
            
            <TabsContent value="items" className="px-6 pb-6">
              <TaskItemsManager 
                taskId={task.id} 
                assignedUser={assignedMember?.user as UserType || null}
                members={members as any}
                currentUser={currentUser}
                onProgressUpdate={onTaskUpdate}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
