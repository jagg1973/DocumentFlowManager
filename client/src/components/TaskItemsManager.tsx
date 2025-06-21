import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit2, Trash2, Clock, User, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import type { TaskItem, TaskSubItem, User as UserType, TaskReview } from "@shared/schema";

interface TaskItemsManagerProps {
  taskId: number;
  assignedUser: UserType | null;
  members: Array<{
    id: number;
    userId: string;
    user: UserType;
  }> | undefined;
  currentUser: UserType | undefined;
  onProgressUpdate: () => void;
}

interface TaskItemWithSubItems extends TaskItem {
  subItems?: TaskSubItem[];
}

export default function TaskItemsManager({ 
  taskId, 
  assignedUser, 
  members, 
  currentUser,
  onProgressUpdate 
}: TaskItemsManagerProps) {
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TaskItem | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedItemForReview, setSelectedItemForReview] = useState<TaskItem | null>(null);
  const queryClient = useQueryClient();

  // Fetch task items
  const { data: taskItems = [], isLoading } = useQuery({
    queryKey: [`/api/tasks/${taskId}/items`],
  });

  // Fetch task reviews
  const { data: taskReviews = [] } = useQuery({
    queryKey: [`/api/tasks/${taskId}/reviews`],
  });

  // Calculate overall progress based on completed items
  const calculateProgress = () => {
    if (taskItems.length === 0) return 0;
    const completedItems = taskItems.filter((item: TaskItem) => item.status === "completed");
    return Math.round((completedItems.length / taskItems.length) * 100);
  };

  // Create task item mutation
  const createItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      return apiRequest(`/api/tasks/${taskId}/items`, "POST", itemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/items`] });
      setShowAddItemModal(false);
      onProgressUpdate();
    },
  });

  // Update task item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/task-items/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/items`] });
      setEditingItem(null);
      onProgressUpdate();
    },
  });

  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      return apiRequest(`/api/tasks/${taskId}/reviews`, "POST", reviewData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/reviews`] });
      setShowReviewModal(false);
      setSelectedItemForReview(null);
    },
  });

  const handleStatusChange = (item: TaskItem, newStatus: string) => {
    const updateData = { 
      status: newStatus,
      completedAt: newStatus === "completed" ? new Date().toISOString() : null
    };
    updateItemMutation.mutate({ id: item.id, data: updateData });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const itemData = {
      itemName: formData.get("itemName") as string,
      description: formData.get("description") as string,
      assignedToId: formData.get("assignedToId") as string || null,
      priority: parseInt(formData.get("priority") as string) || 1,
      estimatedHours: parseFloat(formData.get("estimatedHours") as string) || null,
    };

    createItemMutation.mutate(itemData);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForReview || !assignedUser) return;

    const formData = new FormData(e.target as HTMLFormElement);
    
    const reviewData = {
      revieweeId: assignedUser.id,
      reviewType: formData.get("reviewType") as string,
      rating: parseInt(formData.get("rating") as string) || null,
      feedback: formData.get("feedback") as string,
      isPublic: formData.get("isPublic") === "on",
    };

    createReviewMutation.mutate(reviewData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "rejected": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return "bg-red-500";
      case 4: return "bg-orange-500";
      case 3: return "bg-yellow-500";
      case 2: return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading task items...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="glass-card liquid-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="specular-highlight">Task Progress</span>
            <Badge variant="outline" className="glass-button">
              {calculateProgress()}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={calculateProgress()} className="h-3" />
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>{taskItems.filter((item: TaskItem) => item.status === "completed").length} completed</span>
            <span>{taskItems.length} total items</span>
          </div>
        </CardContent>
      </Card>

      {/* Task Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 specular-highlight">Task Items</h3>
          <Button 
            onClick={() => setShowAddItemModal(true)}
            className="glass-button bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {taskItems.map((item: TaskItem) => {
          const assignedMember = members?.find(m => m.userId === item.assignedToId);
          const itemReviews = taskReviews.filter((review: TaskReview) => review.taskId === taskId);
          
          return (
            <Card key={item.id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{item.itemName}</h4>
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`} />
                      <Badge className={getStatusColor(item.status)}>
                        {item.status.replace("_", " ")}
                      </Badge>
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {assignedMember && (
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{assignedMember.user.firstName} {assignedMember.user.lastName}</span>
                        </div>
                      )}
                      
                      {item.estimatedHours && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{item.estimatedHours}h estimated</span>
                        </div>
                      )}
                      
                      {item.completedAt && (
                        <div className="text-green-600">
                          Completed {new Date(item.completedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={item.status} 
                      onValueChange={(value) => handleStatusChange(item, value)}
                    >
                      <SelectTrigger className="w-32 frosted-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-modal">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {currentUser && assignedUser && currentUser.id !== assignedUser.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="glass-button"
                        onClick={() => {
                          setSelectedItemForReview(item);
                          setShowReviewModal(true);
                        }}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Social Validation - Reviews */}
      {reviews.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="specular-highlight">Task Reviews & Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {taskReviews.map((review: TaskReview & { reviewer: UserType; reviewee: UserType }) => (
              <div key={review.id} className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">
                      {review.reviewer.firstName} {review.reviewer.lastName}
                    </span>
                    {review.reviewType === "thumbs_up" && <ThumbsUp className="w-4 h-4 text-green-600" />}
                    {review.reviewType === "thumbs_down" && <ThumbsDown className="w-4 h-4 text-red-600" />}
                    {review.rating && (
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < review.rating! ? "text-yellow-500 fill-current" : "text-gray-300"}`} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {review.feedback && (
                    <p className="text-sm text-gray-600">{review.feedback}</p>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Item Modal */}
      <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
        <DialogContent className="glass-modal">
          <DialogHeader>
            <DialogTitle className="specular-highlight">Add Task Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <Label htmlFor="itemName">Item Name</Label>
              <Input 
                id="itemName" 
                name="itemName" 
                required 
                className="frosted-input mt-1"
                placeholder="Enter item name..."
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                className="frosted-input mt-1"
                placeholder="Optional description..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignedToId">Assign To</Label>
                <Select name="assignedToId">
                  <SelectTrigger className="frosted-input mt-1">
                    <SelectValue placeholder="Select member" />
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
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue="1">
                  <SelectTrigger className="frosted-input mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-modal">
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">High</SelectItem>
                    <SelectItem value="4">Urgent</SelectItem>
                    <SelectItem value="5">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input 
                id="estimatedHours" 
                name="estimatedHours" 
                type="number" 
                step="0.5"
                className="frosted-input mt-1"
                placeholder="0.0"
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1 glass-button bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                disabled={createItemMutation.isPending}
              >
                {createItemMutation.isPending ? "Creating..." : "Create Item"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="glass-button"
                onClick={() => setShowAddItemModal(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="glass-modal">
          <DialogHeader>
            <DialogTitle className="specular-highlight">Review Task Performance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div>
              <Label>Review Type</Label>
              <Select name="reviewType" required>
                <SelectTrigger className="frosted-input mt-1">
                  <SelectValue placeholder="Select review type" />
                </SelectTrigger>
                <SelectContent className="glass-modal">
                  <SelectItem value="thumbs_up">👍 Thumbs Up</SelectItem>
                  <SelectItem value="thumbs_down">👎 Thumbs Down</SelectItem>
                  <SelectItem value="star_rating">⭐ Star Rating</SelectItem>
                  <SelectItem value="detailed_review">📝 Detailed Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="rating">Rating (1-5 stars)</Label>
              <Select name="rating">
                <SelectTrigger className="frosted-input mt-1">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent className="glass-modal">
                  <SelectItem value="1">⭐ 1 Star</SelectItem>
                  <SelectItem value="2">⭐⭐ 2 Stars</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ 3 Stars</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ 4 Stars</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea 
                id="feedback" 
                name="feedback" 
                className="frosted-input mt-1"
                placeholder="Provide detailed feedback..."
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="isPublic" name="isPublic" defaultChecked />
              <Label htmlFor="isPublic">Make review public</Label>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1 glass-button bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                disabled={createReviewMutation.isPending}
              >
                {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="glass-button"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}