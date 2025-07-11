import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UserPlus, 
  UserMinus, 
  Eye, 
  Users,
  Bell,
  BellOff,
  Crown,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface TaskFollower {
  id: number;
  taskId: number;
  userId: string;
  addedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

interface ProjectMember {
  id: number;
  userId: string;
  role: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

interface TaskFollowersProps {
  taskId: number;
  currentUserId: string;
  projectMembers: ProjectMember[];
  taskOwnerId?: string;
  taskAssigneeId?: string;
}

export default function TaskFollowers({ 
  taskId, 
  currentUserId, 
  projectMembers,
  taskOwnerId,
  taskAssigneeId 
}: TaskFollowersProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: followers, isLoading } = useQuery<TaskFollower[]>({
    queryKey: [`/api/tasks/${taskId}/followers`],
    queryFn: async () => {
      return await apiRequest(`/api/tasks/${taskId}/followers`, "GET");
    },
  });

  const addFollowerMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/tasks/${taskId}/followers`, "POST", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/followers`] });
      setSelectedUserId("");
      toast({
        title: "Success",
        description: "Follower added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add follower",
        variant: "destructive",
      });
    },
  });

  const removeFollowerMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/tasks/${taskId}/followers/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/followers`] });
      toast({
        title: "Success",
        description: "Follower removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove follower",
        variant: "destructive",
      });
    },
  });

  const handleAddFollower = () => {
    if (!selectedUserId) return;
    addFollowerMutation.mutate(selectedUserId);
  };

  const handleRemoveFollower = (userId: string) => {
    if (window.confirm('Are you sure you want to remove this follower?')) {
      removeFollowerMutation.mutate(userId);
    }
  };

  const handleToggleFollow = () => {
    const isFollowing = followers?.some(f => f.userId === currentUserId);
    if (isFollowing) {
      removeFollowerMutation.mutate(currentUserId);
    } else {
      addFollowerMutation.mutate(currentUserId);
    }
  };

  const getSpecialRole = (userId: string) => {
    if (userId === taskOwnerId) return 'owner';
    if (userId === taskAssigneeId) return 'assignee';
    return null;
  };

  const getSpecialRoleIcon = (role: string | null) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'assignee':
        return <Star className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const getSpecialRoleLabel = (role: string | null) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'assignee':
        return 'Assignee';
      default:
        return null;
    }
  };

  // Filter out users who are already following
  const availableMembers = projectMembers.filter(member => 
    !followers?.some(follower => follower.userId === member.userId)
  );

  const isCurrentUserFollowing = followers?.some(f => f.userId === currentUserId);

  if (isLoading) {
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
      {/* Follow/Unfollow Button for Current User */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="font-medium">
                {isCurrentUserFollowing ? "You're following this task" : "Follow this task"}
              </span>
            </div>
            <Button
              variant={isCurrentUserFollowing ? "outline" : "default"}
              size="sm"
              onClick={handleToggleFollow}
              disabled={addFollowerMutation.isPending || removeFollowerMutation.isPending}
            >
              {isCurrentUserFollowing ? (
                <>
                  <BellOff className="w-4 h-4 mr-2" />
                  Unfollow
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
          </div>
          {isCurrentUserFollowing && (
            <p className="text-sm text-gray-500 mt-2">
              You'll receive notifications about updates to this task
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Followers */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Followers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={member.user.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {member.user.firstName} {member.user.lastName}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddFollower}
              disabled={!selectedUserId || addFollowerMutation.isPending}
            >
              Add
            </Button>
          </div>
          {availableMembers.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              All team members are already following this task
            </p>
          )}
        </CardContent>
      </Card>

      {/* Followers List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Followers ({followers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {followers && followers.length > 0 ? (
            <div className="space-y-3">
              {followers.map((follower) => {
                const specialRole = getSpecialRole(follower.userId);
                const isCurrentUser = follower.userId === currentUserId;
                
                return (
                  <div
                    key={follower.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={follower.user.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {follower.user.firstName?.[0]}{follower.user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">
                            {follower.user.firstName} {follower.user.lastName}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">
                              You
                            </Badge>
                          )}
                          {specialRole && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              {getSpecialRoleIcon(specialRole)}
                              {getSpecialRoleLabel(specialRole)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Following since {new Date(follower.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFollower(follower.userId)}
                        disabled={removeFollowerMutation.isPending}
                        title="Remove follower"
                        className="text-red-600 hover:text-red-800"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No followers yet. Add team members to keep them updated!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
