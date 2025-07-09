import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Link, Unlink, Eye, Download, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Document {
  id: number;
  title: string;
  description: string;
  originalFilename: string;
  fileExtension: string;
  fileSize: number;
  category: string;
  subcategory?: string;
  tags: string[];
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  uploader: {
    firstName: string;
    lastName: string;
  };
}

interface TaskDocumentLink {
  id: number;
  taskId: number;
  documentId: number;
  linkedAt: string;
  document: Document;
}

interface DocumentLinkingModalProps {
  taskId: number;
  taskName?: string;
  open: boolean;
  onClose: () => void;
  linkedDocuments?: TaskDocumentLink[];
  onDocumentsLinked?: () => void;
}

export default function DocumentLinkingModal({
  taskId,
  taskName,
  open,
  onClose,
  linkedDocuments: initialLinkedDocuments,
  onDocumentsLinked,
}: DocumentLinkingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"available" | "linked">("available");

  // Fetch available documents
  const { data: availableDocuments = [], isLoading: loadingAvailable } = useQuery({
    queryKey: ["/api/documents", searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
      const response = await apiRequest(`/api/documents?${params}`, "GET");
      return response.data || response || [];
    },
    enabled: open,
  });

  // Fetch linked documents for this task (use prop if available, otherwise fetch)
  const { data: fetchedLinkedDocuments = [], isLoading: loadingLinked } = useQuery({
    queryKey: [`/api/tasks/${taskId}/documents`],
    queryFn: async () => {
      const response = await apiRequest(`/api/tasks/${taskId}/documents`, "GET");
      return response || [];
    },
    enabled: open && taskId > 0 && !initialLinkedDocuments,
  });

  const linkedDocuments = initialLinkedDocuments || fetchedLinkedDocuments;

  // Link document to task
  const linkMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest(`/api/tasks/${taskId}/documents`, "POST", { documentId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document linked to task successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/documents`] });
      onDocumentsLinked?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to link document to task",
        variant: "destructive",
      });
    },
  });

  // Unlink document from task
  const unlinkMutation = useMutation({
    mutationFn: async (linkId: number) => {
      return apiRequest(`/api/task-document-links/${linkId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document unlinked from task successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/documents`] });
      onDocumentsLinked?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unlink document from task",
        variant: "destructive",
      });
    },
  });

  const getFileIcon = (extension: string) => {
    const iconMap: Record<string, string> = {
      pdf: "from-red-500 to-red-600",
      doc: "from-blue-500 to-blue-600",
      docx: "from-blue-500 to-blue-600",
      xls: "from-green-500 to-green-600",
      xlsx: "from-green-500 to-green-600",
      ppt: "from-orange-500 to-orange-600",
      pptx: "from-orange-500 to-orange-600",
      txt: "from-gray-500 to-gray-600",
    };
    return iconMap[extension.toLowerCase()] || "from-purple-500 to-purple-600";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const documentCategories = [
    "Executive Summary",
    "Strategic Implementation",
    "Expert Guidelines",
    "Essential Considerations",
    "Ongoing Management",
    "SEO Email Synergy",
    "SEO Social Media Synergy",
    "SEO Press Release Synergy",
    "SEO PPC Synergy",
    "Templates",
    "Checklists"
  ];

  // Filter available documents to exclude already linked ones
  const linkedDocumentIds = linkedDocuments.map((link: TaskDocumentLink) => link.document.id);
  const filteredAvailableDocuments = availableDocuments.filter(
    (doc: Document) => !linkedDocumentIds.includes(doc.id)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-modal max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Link className="w-5 h-5" />
            <span>Link Documents to Task</span>
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Managing documents for: <span className="font-medium">{taskName}</span>
          </p>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveTab("available")}
            className={cn(
              "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
              activeTab === "available"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Available Documents ({filteredAvailableDocuments.length})
          </button>
          <button
            onClick={() => setActiveTab("linked")}
            className={cn(
              "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
              activeTab === "linked"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Linked Documents ({linkedDocuments.length})
          </button>
        </div>

        {/* Search and Filters */}
        {activeTab === "available" && (
          <div className="flex space-x-4 py-4 border-b border-gray-200">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass-input"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 glass-input">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {documentCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "available" ? (
            <div className="space-y-4 p-1">
              {loadingAvailable ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredAvailableDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents available</h3>
                  <p className="text-gray-600">All documents are already linked to this task.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAvailableDocuments.map((doc: Document) => (
                    <Card key={doc.id} className="glass-card hover:shadow-lg transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className={cn(
                            "p-2 rounded-lg bg-gradient-to-r shadow-sm",
                            getFileIcon(doc.fileExtension)
                          )}>
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{doc.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{doc.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {doc.category}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(doc.fileSize)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/api/documents/${doc.id}/view`, '_blank')}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/api/documents/${doc.id}/download`, '_blank')}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => linkMutation.mutate(doc.id)}
                            disabled={linkMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Link className="w-3 h-3 mr-1" />
                            Link
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 p-1">
              {loadingLinked ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : linkedDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No linked documents</h3>
                  <p className="text-gray-600">Link documents from the Available Documents tab.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {linkedDocuments.map((link: TaskDocumentLink) => (
                    <Card key={link.id} className="glass-card hover:shadow-lg transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className={cn(
                            "p-2 rounded-lg bg-gradient-to-r shadow-sm",
                            getFileIcon(link.document.fileExtension)
                          )}>
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{link.document.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{link.document.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {link.document.category}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                Linked {new Date(link.linkedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/api/documents/${link.document.id}/view`, '_blank')}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/api/documents/${link.document.id}/download`, '_blank')}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => unlinkMutation.mutate(link.id)}
                            disabled={unlinkMutation.isPending}
                          >
                            <Unlink className="w-3 h-3 mr-1" />
                            Unlink
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
