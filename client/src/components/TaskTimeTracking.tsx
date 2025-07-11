import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Edit2, 
  Trash2,
  Save,
  X,
  Timer,
  Calendar,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeLog {
  id: number;
  taskId: number;
  userId: string;
  hours: number;
  description: string;
  logDate: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

interface TimeTrackingProps {
  taskId: number;
  currentUserId: string;
}

export default function TimeTracking({ taskId, currentUserId }: TimeTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLog, setEditingLog] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    hours: '',
    description: '',
    logDate: format(new Date(), 'yyyy-MM-dd'),
  });
  
  const [editData, setEditData] = useState({
    hours: '',
    description: '',
    logDate: '',
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: timeLogs, isLoading } = useQuery<TimeLog[]>({
    queryKey: [`/api/tasks/${taskId}/time-logs`],
    queryFn: async () => {
      return await apiRequest(`/api/tasks/${taskId}/time-logs`, "GET");
    },
  });

  const addTimeLogMutation = useMutation({
    mutationFn: async (data: { hours: number; description: string; logDate: string }) => {
      return await apiRequest(`/api/tasks/${taskId}/time-logs`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/time-logs`] });
      setShowAddForm(false);
      setFormData({
        hours: '',
        description: '',
        logDate: format(new Date(), 'yyyy-MM-dd'),
      });
      toast({
        title: "Success",
        description: "Time log added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add time log",
        variant: "destructive",
      });
    },
  });

  const updateTimeLogMutation = useMutation({
    mutationFn: async (data: { id: number; hours: number; description: string; logDate: string }) => {
      return await apiRequest(`/api/tasks/${taskId}/time-logs/${data.id}`, "PUT", {
        hours: data.hours,
        description: data.description,
        logDate: data.logDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/time-logs`] });
      setEditingLog(null);
      toast({
        title: "Success",
        description: "Time log updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update time log",
        variant: "destructive",
      });
    },
  });

  const deleteTimeLogMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/tasks/${taskId}/time-logs/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/time-logs`] });
      toast({
        title: "Success",
        description: "Time log deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete time log",
        variant: "destructive",
      });
    },
  });

  // Timer functionality
  const handleStartTracking = () => {
    setIsTracking(true);
    setStartTime(new Date());
    
    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Store interval ID for cleanup
    (window as any).timeTrackingInterval = interval;
  };

  const handleStopTracking = () => {
    if (!startTime) return;
    
    setIsTracking(false);
    const endTime = new Date();
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    // Clear interval
    if ((window as any).timeTrackingInterval) {
      clearInterval((window as any).timeTrackingInterval);
    }
    
    // Auto-fill form with tracked time
    setFormData({
      hours: hours.toFixed(2),
      description: '',
      logDate: format(new Date(), 'yyyy-MM-dd'),
    });
    setShowAddForm(true);
    setStartTime(null);
  };

  const handlePauseTracking = () => {
    if (!startTime) return;
    
    setIsTracking(false);
    const pausedTime = new Date();
    const hours = (pausedTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    // Clear interval
    if ((window as any).timeTrackingInterval) {
      clearInterval((window as any).timeTrackingInterval);
    }
    
    // Update form data with accumulated time
    setFormData(prev => ({
      ...prev,
      hours: (parseFloat(prev.hours) + hours).toFixed(2),
    }));
    setStartTime(null);
  };

  const handleAddTimeLog = () => {
    if (!formData.hours || !formData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    const hours = parseFloat(formData.hours);
    if (isNaN(hours) || hours <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of hours",
        variant: "destructive",
      });
      return;
    }
    
    addTimeLogMutation.mutate({
      hours,
      description: formData.description,
      logDate: formData.logDate,
    });
  };

  const handleEditTimeLog = (log: TimeLog) => {
    setEditingLog(log.id);
    setEditData({
      hours: log.hours.toString(),
      description: log.description,
      logDate: log.logDate,
    });
  };

  const handleUpdateTimeLog = () => {
    if (!editData.hours || !editData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    const hours = parseFloat(editData.hours);
    if (isNaN(hours) || hours <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of hours",
        variant: "destructive",
      });
      return;
    }
    
    updateTimeLogMutation.mutate({
      id: editingLog!,
      hours,
      description: editData.description,
      logDate: editData.logDate,
    });
  };

  const handleDeleteTimeLog = (id: number) => {
    if (window.confirm('Are you sure you want to delete this time log?')) {
      deleteTimeLogMutation.mutate(id);
    }
  };

  const getTrackedTime = () => {
    if (!startTime) return 0;
    return (currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const totalHours = timeLogs?.reduce((sum, log) => sum + log.hours, 0) || 0;

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
      {/* Timer */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Time Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-3xl font-mono font-bold text-blue-600">
              {formatTime(getTrackedTime())}
            </div>
            
            <div className="flex justify-center space-x-2">
              {!isTracking ? (
                <Button onClick={handleStartTracking} className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start
                </Button>
              ) : (
                <>
                  <Button onClick={handlePauseTracking} variant="outline" className="flex items-center gap-2">
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                  <Button onClick={handleStopTracking} variant="destructive" className="flex items-center gap-2">
                    <Square className="w-4 h-4" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Time Log Form */}
      {showAddForm && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Time Log
              </span>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.25"
                    min="0"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    placeholder="2.5"
                  />
                </div>
                <div>
                  <Label htmlFor="logDate">Date</Label>
                  <Input
                    id="logDate"
                    type="date"
                    value={formData.logDate}
                    onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What did you work on?"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddTimeLog}
                  disabled={addTimeLogMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Time Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(totalHours)}
              </div>
              <div className="text-sm text-gray-500">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {timeLogs?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Log Entries</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Button */}
      {!showAddForm && (
        <Button 
          onClick={() => setShowAddForm(true)}
          className="w-full"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Time Log
        </Button>
      )}

      {/* Time Logs List */}
      {timeLogs && timeLogs.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Time Logs ({timeLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {editingLog === log.id ? (
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`edit-hours-${log.id}`}>Hours</Label>
                          <Input
                            id={`edit-hours-${log.id}`}
                            type="number"
                            step="0.25"
                            min="0"
                            value={editData.hours}
                            onChange={(e) => setEditData({ ...editData, hours: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-date-${log.id}`}>Date</Label>
                          <Input
                            id={`edit-date-${log.id}`}
                            type="date"
                            value={editData.logDate}
                            onChange={(e) => setEditData({ ...editData, logDate: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor={`edit-description-${log.id}`}>Description</Label>
                        <Textarea
                          id={`edit-description-${log.id}`}
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                          rows={2}
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingLog(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleUpdateTimeLog}
                          disabled={updateTimeLogMutation.isPending}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Update
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={log.user.profileImageUrl || undefined} />
                          <AvatarFallback>
                            {log.user.firstName?.[0]}{log.user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-sm">
                              {formatTime(log.hours)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {log.user.firstName} {log.user.lastName}
                            </span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">
                              {format(new Date(log.logDate), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Logged {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      
                      {log.userId === currentUserId && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTimeLog(log)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTimeLog(log.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!timeLogs || timeLogs.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No time logged yet</p>
          <p className="text-sm">Start tracking your time to see your progress!</p>
        </div>
      )}
    </div>
  );
}
