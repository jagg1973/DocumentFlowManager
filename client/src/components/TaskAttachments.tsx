import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Download, 
  Trash2, 
  File, 
  FileText, 
  Image, 
  Video, 
  Music,
  Archive,
  Eye,
  ExternalLink,
  Paperclip
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskAttachment {
  id: number;
  taskId: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface TaskAttachmentsProps {
  taskId: number;
  currentUserId: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  error?: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return Archive;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const isPreviewable = (mimeType: string): boolean => {
  return mimeType.startsWith('image/') || 
         mimeType.includes('pdf') || 
         mimeType.startsWith('text/') ||
         mimeType.includes('json') ||
         mimeType.includes('xml');
};

export default function TaskAttachments({ taskId, currentUserId }: TaskAttachmentsProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attachments, isLoading } = useQuery<TaskAttachment[]>({
    queryKey: [`/api/tasks/${taskId}/attachments`],
    queryFn: async () => {
      return await apiRequest(`/api/tasks/${taskId}/attachments`, "GET");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Track upload progress
      const fileName = file.name;
      setUploadProgress(prev => [...prev, { fileName, progress: 0 }]);
      
      try {
        const response = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        return await response.json();
      } catch (error) {
        setUploadProgress(prev => 
          prev.map(p => 
            p.fileName === fileName 
              ? { ...p, error: 'Upload failed' }
              : p
          )
        );
        throw error;
      }
    },
    onSuccess: (data, file) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/attachments`] });
      setUploadProgress(prev => prev.filter(p => p.fileName !== file.name));
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: (error, file) => {
      setUploadProgress(prev => prev.filter(p => p.fileName !== file.name));
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      return await apiRequest(`/api/tasks/${taskId}/attachments/${attachmentId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/attachments`] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: `File ${file.name} is too large. Maximum size is 10MB.`,
          variant: "destructive",
        });
        return;
      }
      
      uploadMutation.mutate(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDownload = (attachment: TaskAttachment) => {
    const link = document.createElement('a');
    link.href = `/api/tasks/${taskId}/attachments/${attachment.id}/download`;
    link.download = attachment.originalName;
    link.click();
  };

  const handlePreview = (attachment: TaskAttachment) => {
    const url = `/api/tasks/${taskId}/attachments/${attachment.id}/preview`;
    window.open(url, '_blank');
  };

  const handleDelete = (attachmentId: number) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(attachmentId);
    }
  };

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
      {/* Upload Area */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600 mb-2">
              Drag files here or{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Uploading Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadProgress.map((progress, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{progress.fileName}</span>
                    <span className="text-sm text-gray-500">
                      {progress.error ? 'Failed' : `${progress.progress}%`}
                    </span>
                  </div>
                  <Progress 
                    value={progress.progress} 
                    className={cn(
                      "h-2",
                      progress.error && "bg-red-200"
                    )}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments List */}
      {attachments && attachments.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Files ({attachments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attachments.map((attachment) => {
                const FileIcon = getFileIcon(attachment.mimeType);
                const canPreview = isPreviewable(attachment.mimeType);
                const isOwner = attachment.uploadedBy === currentUserId;
                
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <FileIcon className="w-6 h-6 text-gray-500" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{attachment.originalName}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatFileSize(attachment.fileSize)}</span>
                          <span>•</span>
                          <span>
                            {attachment.user.firstName} {attachment.user.lastName}
                          </span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(attachment.uploadedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {canPreview && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(attachment)}
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(attachment.id)}
                          title="Delete"
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!attachments || attachments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No attachments yet. Upload files to get started!</p>
        </div>
      )}
    </div>
  );
}
