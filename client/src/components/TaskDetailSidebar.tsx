import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Save, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Task } from "@shared/schema";
import { getPillarColor, getStatusColor } from "@/lib/utils";
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
    startDate: task.startDate || '',
    endDate: task.endDate || '',
    progress: task.progress || 0,
    status: task.status || 'Not Started',
    description: task.description || '',
    guidelineDocLink: task.guidelineDocLink || '',
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: Partial<typeof formData>) => {
      await apiRequest("PUT", `/api/tasks/${task.id}`, data);
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
      await apiRequest("DELETE", `/api/tasks/${task.id}`);
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

  return (
    <div className="w-96 glass-sidebar border-l border-white/20 flex-shrink-0 slide-in-right">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 specular-highlight">Task Details</h3>
            <Button variant="ghost" size="sm" className="glass-button hover:bg-white/20" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="details" className="h-full">
            <TabsList className="glass-modal border-white/20 mb-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="items">Task Items</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details">
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

                {/* SEO Pillar */}
                <div>
                  <Label>SEO Pillar</Label>
                  <Select 
                    value={formData.pillar || ""} 
                    onValueChange={(value) => setFormData({ ...formData, pillar: value })}
                  >
                    <SelectTrigger className="mt-2 frosted-input">
                      <SelectValue placeholder="Select a pillar" />
                    </SelectTrigger>
                    <SelectContent className="glass-modal">
                      <SelectItem value="Technical">Technical SEO</SelectItem>
                      <SelectItem value="On-Page & Content">On-Page & Content</SelectItem>
                      <SelectItem value="Off-Page">Off-Page SEO</SelectItem>
                      <SelectItem value="Analytics">Analytics & Tracking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SEO Phase */}
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
                      onValueChange={(value) => setFormData({ ...formData, assignedToId: value === "unassigned" ? null : value })}
                    >
                      <SelectTrigger className="flex-1 frosted-input">
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent className="glass-modal">
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
                  className="mt-2 frosted-input"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-2 frosted-input"
                />
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Progress</Label>
                <span className="text-sm font-medium text-gray-700">{formData.progress}%</span>
              </div>
              <Slider
                value={[formData.progress]}
                onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
                max={100}
                step={5}
                className="mt-2"
              />
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getPillarColor(formData.pillar)}`}
                  style={{ width: `${formData.progress}%` }}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="mt-2 frosted-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-modal">
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Guideline Document Link */}
            <div>
              <Label htmlFor="guidelineDocLink">Guideline Document</Label>
              <div className="space-y-3 mt-2">
                <Input
                  id="guidelineDocLink"
                  value={formData.guidelineDocLink}
                  onChange={(e) => setFormData({ ...formData, guidelineDocLink: e.target.value })}
                  placeholder="Enter document URL or select from DMS"
                />
                {formData.guidelineDocLink && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(formData.guidelineDocLink, '_blank')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Guideline Document
                  </Button>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add task description..."
                rows={4}
                className="mt-2"
                />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="items">
              <TaskItemsManager 
                taskId={task.id}
                assignedUser={assignedMember?.user || null}
                members={members}
                currentUser={currentUser}
                onProgressUpdate={onTaskUpdate}
              />
            </TabsContent>
          </Tabs>
        </div>

    {/* Footer */}
    <div className="border-t border-white/20 px-6 py-4">
      <div className="flex space-x-3">
        <Button 
          className="flex-1 glass-button bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-400/30 text-white hover:from-blue-600 hover:to-indigo-700"
          onClick={handleSave}
          disabled={updateTaskMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
        <Button 
          variant="destructive"
          className="glass-button bg-gradient-to-r from-red-500 to-red-600 border-red-400/30 hover:from-red-600 hover:to-red-700"
          onClick={handleDelete}
          disabled={deleteTaskMutation.isPending}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {deleteTaskMutation.isPending ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  </div>
</div>
);
}
