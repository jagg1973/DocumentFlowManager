import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Project, User } from "@shared/schema";

interface ManageMembersModalProps {
  project: Project;
  members: Array<{
    id: number;
    projectId: number;
    userId: string;
    permissionLevel: 'edit' | 'view';
    user: User;
  }> | undefined;
  currentUser: User | undefined;
  onClose: () => void;
  onMembersUpdated: () => void;
}

export default function ManageMembersModal({ 
  project, 
  members, 
  currentUser, 
  onClose, 
  onMembersUpdated 
}: ManageMembersModalProps) {
  const { toast } = useToast();
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isOwner = currentUser?.id === project.ownerId;

  const addMemberMutation = useMutation({
    mutationFn: async (data: { userId: string; permissionLevel: 'edit' | 'view' }) => {
      await apiRequest("POST", `/api/projects/${project.id}/members`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member added successfully",
      });
      onMembersUpdated();
      setNewMemberEmail("");
      setSearchResults([]);
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
        description: "Failed to add member",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      await apiRequest("DELETE", `/api/projects/${project.id}/members/${memberId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
      onMembersUpdated();
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
        description: "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (data: { memberId: number; permissionLevel: 'edit' | 'view' }) => {
      await apiRequest("PUT", `/api/projects/${project.id}/members/${data.memberId}`, {
        permissionLevel: data.permissionLevel,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Permission updated successfully",
      });
      onMembersUpdated();
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
        description: "Failed to update permission",
        variant: "destructive",
      });
    },
  });

  const searchUsers = async (email: string) => {
    if (email.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(email)}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const users = await response.json();
        // Filter out users who are already members
        const existingUserIds = new Set(members?.map(m => m.userId) || []);
        const filteredUsers = users.filter((user: User) => !existingUserIds.has(user.id));
        setSearchResults(filteredUsers);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEmailChange = (email: string) => {
    setNewMemberEmail(email);
    searchUsers(email);
  };

  const handleAddMember = (userId: string) => {
    addMemberMutation.mutate({ userId, permissionLevel: 'view' });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg glass-modal">
        <DialogHeader>
          <DialogTitle className="specular-highlight">Manage Project Members</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Members */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Members</h3>
            <div className="space-y-3">
              {members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.user.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.user.firstName} {member.user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{member.user.email}</p>
                    </div>
                    {member.userId === project.ownerId && (
                      <Badge variant="secondary" className="text-xs">Owner</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isOwner && member.userId !== project.ownerId && (
                      <>
                        <Select
                          value={member.permissionLevel}
                          onValueChange={(value: 'edit' | 'view') => 
                            updatePermissionMutation.mutate({ 
                              memberId: member.id, 
                              permissionLevel: value 
                            })
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">View</SelectItem>
                            <SelectItem value="edit">Edit</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMemberMutation.mutate(member.id)}
                          disabled={removeMemberMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </>
                    )}
                    
                    {!isOwner && (
                      <Badge variant="outline" className="text-xs">
                        {member.permissionLevel}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Member */}
          {isOwner && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Member</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="memberEmail">Search by email</Label>
                  <Input
                    id="memberEmail"
                    type="email"
                    placeholder="Enter email address..."
                    value={newMemberEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="border rounded-lg p-2">
                    <p className="text-xs text-gray-500 mb-2">Search Results:</p>
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddMember(user.id)}
                          disabled={addMemberMutation.isPending}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {isSearching && (
                  <p className="text-sm text-gray-500">Searching...</p>
                )}
                
                {newMemberEmail && !isSearching && searchResults.length === 0 && newMemberEmail.length >= 2 && (
                  <p className="text-sm text-gray-500">No users found with that email.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
