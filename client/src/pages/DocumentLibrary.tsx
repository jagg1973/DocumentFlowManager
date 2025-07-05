import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Edit2, 
  Trash2, 
  Eye,
  FolderOpen,
  ArrowLeft,
  Tag,
  Calendar,
  User,
  FileIcon,
  Plus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: number;
  title: string;
  description?: string;
  originalFilename: string;
  fileExtension: string;
  mimeType: string;
  fileSize: number;
  category: string;
  subcategory?: string;
  tags: string[];
  uploadedBy: string;
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  uploader: {
    firstName: string;
    lastName: string;
  };
}

export default function DocumentLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Handle document viewing
  const handleViewDocument = (doc: Document) => {
    window.open(`/api/documents/${doc.id}/view`, '_blank');
  };

  // Handle document download
  const handleDownloadDocument = (doc: Document) => {
    try {
      console.log('DocumentLibrary: Download function called with doc:', doc);
      console.log('DocumentLibrary: Type of window.document:', typeof window.document);
      
      const link = window.document.createElement('a');
      console.log('DocumentLibrary: Successfully created link element:', link);
      
      link.href = `/api/documents/${doc.id}/download`;
      link.download = doc.originalFilename;
      link.style.display = 'none';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      console.log('DocumentLibrary: Download completed successfully');
    } catch (error) {
      console.error('DocumentLibrary: Download failed:', error);
      console.error('DocumentLibrary: Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    }
  };

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/documents", searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
      const response = await fetch(`/api/documents?${params}`).then(res => res.json());
      // Extract data from API response wrapper
      return response.data || response || [];
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error('Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all document queries regardless of search/category params
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setShowUploadModal(false);
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error('Delete failed');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all document queries regardless of search/category params
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
  });

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (extension: string) => {
    const iconMap: { [key: string]: string } = {
      pdf: "text-red-500",
      doc: "text-blue-500",
      docx: "text-blue-500",
      xls: "text-green-500",
      xlsx: "text-green-500",
      ppt: "text-orange-500",
      pptx: "text-orange-500",
      txt: "text-gray-500",
    };
    return iconMap[extension.toLowerCase()] || "text-gray-500";
  };

  const categories = [
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

  // Allow access for admin, manager, or users without a role set (default to admin access)
  const hasAdminAccess = !user?.userRole || user?.userRole === 'admin' || user?.userRole === 'manager';
  
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have permission to access the document library.</p>
            <Link href="/">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Premium Glass Navigation */}
      <nav className="glass-navbar sticky top-0 z-50 border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="glass-button">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold specular-highlight">Document Library</h1>
                <p className="text-sm text-gray-600">Manage all documents and files</p>
              </div>
            </div>
            <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
              <DialogTrigger asChild>
                <Button className="glass-button">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-modal max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload New Document</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="file">Select File</Label>
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      required
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Document Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Enter document title"
                      required
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Brief description of the document"
                      rows={3}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" required>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subcategory">Subcategory (Optional)</Label>
                    <Input
                      id="subcategory"
                      name="subcategory"
                      placeholder="e.g., Technical SEO, Content Planning"
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      name="tags"
                      placeholder="seo, technical, guidelines, checklist"
                      className="glass-input"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      name="isPublic"
                      className="w-4 h-4"
                    />
                    <Label htmlFor="isPublic">Make this document public to all users</Label>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      type="submit" 
                      disabled={uploadMutation.isPending}
                      className="flex-1"
                    >
                      {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowUploadModal(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Search and Filters */}
        <Card className="glass-card mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search documents by title, description, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass-input"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48 glass-input">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                  className="glass-button"
                >
                  {viewMode === "grid" ? <FolderOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{documents.length}</p>
              <p className="text-sm text-gray-600">Total Documents</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <Download className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{documents.reduce((sum: number, doc: Document) => sum + doc.downloadCount, 0)}</p>
              <p className="text-sm text-gray-600">Total Downloads</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{new Set(documents.map((doc: Document) => doc.category)).size}</p>
              <p className="text-sm text-gray-600">Categories</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{formatFileSize(documents.reduce((sum: number, doc: Document) => sum + doc.fileSize, 0))}</p>
              <p className="text-sm text-gray-600">Storage Used</p>
            </CardContent>
          </Card>
        </div>

        {/* Documents Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className={viewMode === "grid" ? 
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : 
            "space-y-4"
          }>
            {documents.map((document: Document) => (
              <Card key={document.id} className="glass-card liquid-border group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className={viewMode === "grid" ? "space-y-4" : "flex items-center space-x-4"}>
                    <div className={viewMode === "grid" ? "text-center" : "flex items-center space-x-3"}>
                      <div className={`p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg ${viewMode === "list" ? "w-12 h-12" : "w-16 h-16 mx-auto"}`}>
                        <FileIcon className={`text-white ${viewMode === "list" ? "w-6 h-6" : "w-10 h-10"}`} />
                      </div>
                      {viewMode === "list" && (
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg specular-highlight truncate">{document.title}</h3>
                          <p className="text-sm text-gray-600 truncate">{document.description}</p>
                        </div>
                      )}
                    </div>
                    
                    {viewMode === "grid" && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg specular-highlight text-center truncate">{document.title}</h3>
                        <p className="text-sm text-gray-600 text-center line-clamp-2">{document.description}</p>
                      </div>
                    )}
                    
                    <div className={viewMode === "grid" ? "space-y-2" : "flex items-center space-x-4"}>
                      <Badge variant="outline" className="glass-badge">
                        {document.category}
                      </Badge>
                      {viewMode === "list" && (
                        <>
                          <span className="text-sm text-gray-500">{formatFileSize(document.fileSize)}</span>
                          <span className="text-sm text-gray-500">{document.downloadCount} downloads</span>
                        </>
                      )}
                    </div>
                    
                    {viewMode === "grid" && (
                      <div className="text-center space-y-1">
                        <p className="text-xs text-gray-500">
                          {formatFileSize(document.fileSize)} • {document.downloadCount} downloads
                        </p>
                        <p className="text-xs text-gray-500">
                          By {document.uploader.firstName} {document.uploader.lastName}
                        </p>
                      </div>
                    )}
                    
                    <div className={`flex gap-2 ${viewMode === "grid" ? "justify-center" : "ml-auto"}`}>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="glass-button"
                        onClick={() => handleViewDocument(document)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="glass-button"
                        onClick={() => handleDownloadDocument(document)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="glass-button">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="glass-button text-red-600 hover:text-red-700"
                        onClick={() => deleteMutation.mutate(document.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}