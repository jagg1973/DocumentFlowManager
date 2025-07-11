import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Heart, 
  MessageCircle, 
  Reply, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  ThumbsUp,
  ThumbsDown,
  Smile,
  MoreHorizontal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TaskComment {
  id: number;
  taskId: number;
  userId: string;
  parentId: number | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
  reactions: Array<{
    id: number;
    userId: string;
    type: 'like' | 'dislike' | 'heart' | 'laugh';
    user: {
      firstName: string | null;
      lastName: string | null;
    };
  }>;
  replies?: TaskComment[];
  _count?: {
    replies: number;
  };
}

interface TaskCommentsProps {
  taskId: number;
  currentUserId: string;
}

const reactionIcons = {
  like: ThumbsUp,
  dislike: ThumbsDown,
  heart: Heart,
  laugh: Smile,
};

const reactionColors = {
  like: "text-blue-500",
  dislike: "text-red-500", 
  heart: "text-red-500",
  laugh: "text-yellow-500",
};

export default function TaskComments({ taskId, currentUserId }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery<TaskComment[]>({
    queryKey: [`/api/tasks/${taskId}/comments`],
    queryFn: async () => {
      return await apiRequest(`/api/tasks/${taskId}/comments`, "GET");
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: number }) => {
      return await apiRequest(`/api/tasks/${taskId}/comments`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      setNewComment("");
      setReplyTo(null);
      setReplyContent("");
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async (data: { commentId: number; content: string }) => {
      return await apiRequest(`/api/tasks/${taskId}/comments/${data.commentId}`, "PUT", {
        content: data.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      setEditingComment(null);
      setEditContent("");
      toast({
        title: "Success",
        description: "Comment updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      return await apiRequest(`/api/tasks/${taskId}/comments/${commentId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async (data: { commentId: number; type: string }) => {
      return await apiRequest(`/api/tasks/${taskId}/comments/${data.commentId}/reactions`, "POST", {
        type: data.type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment });
  };

  const handleReply = (commentId: number) => {
    if (!replyContent.trim()) return;
    addCommentMutation.mutate({ 
      content: replyContent, 
      parentId: commentId 
    });
  };

  const handleEdit = (commentId: number) => {
    if (!editContent.trim()) return;
    updateCommentMutation.mutate({ 
      commentId, 
      content: editContent 
    });
  };

  const handleDelete = (commentId: number) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleReaction = (commentId: number, type: keyof typeof reactionIcons) => {
    reactionMutation.mutate({ commentId, type });
  };

  const startEdit = (comment: TaskComment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditContent("");
  };

  const toggleExpanded = (commentId: number) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const renderComment = (comment: TaskComment, isReply = false) => {
    const isEditing = editingComment === comment.id;
    const isOwner = comment.userId === currentUserId;
    const hasReplies = comment._count?.replies && comment._count.replies > 0;
    const isExpanded = expandedComments.has(comment.id);

    return (
      <div key={comment.id} className={cn("space-y-3", isReply && "ml-8 border-l-2 border-gray-200 pl-4")}>
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.user.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {comment.user.firstName?.[0]}{comment.user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {comment.user.firstName} {comment.user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    {comment.updatedAt !== comment.createdAt && " (edited)"}
                  </p>
                </div>
              </div>
              
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEdit(comment)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(comment.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleEdit(comment.id)}
                    disabled={updateCommentMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={cancelEdit}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                
                {/* Reactions */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {Object.entries(reactionIcons).map(([type, Icon]) => {
                      const userReaction = comment.reactions.find(r => r.userId === currentUserId && r.type === type);
                      const count = comment.reactions.filter(r => r.type === type).length;
                      
                      return (
                        <Button
                          key={type}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "p-1 h-auto",
                            userReaction && reactionColors[type as keyof typeof reactionColors]
                          )}
                          onClick={() => handleReaction(comment.id, type as keyof typeof reactionIcons)}
                        >
                          <Icon className="w-4 h-4" />
                          {count > 0 && <span className="ml-1 text-xs">{count}</span>}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Reply className="w-4 h-4 mr-1" />
                    Reply
                  </Button>
                </div>

                {/* Reply form */}
                {replyTo === comment.id && (
                  <div className="space-y-3 pt-3 border-t">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="min-h-[80px]"
                    />
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleReply(comment.id)}
                        disabled={addCommentMutation.isPending}
                      >
                        Reply
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setReplyTo(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Replies */}
        {hasReplies && (
          <div className="ml-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(comment.id)}
              className="text-gray-500 hover:text-gray-700"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              {isExpanded ? 'Hide' : 'Show'} {comment._count?.replies} replies
            </Button>
            
            {isExpanded && comment.replies?.map((reply) => (
              <div key={reply.id} className="mt-3">
                {renderComment(reply, true)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-20 bg-gray-200 rounded mb-4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const topLevelComments = comments?.filter(c => !c.parentId) || [];

  return (
    <div className="space-y-6">
      {/* Add new comment */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleAddComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
              >
                Add Comment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments list */}
      <div className="space-y-4">
        {topLevelComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          topLevelComments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
}
