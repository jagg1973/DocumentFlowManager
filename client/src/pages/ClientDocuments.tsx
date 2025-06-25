import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Search, 
  Download, 
  Eye,
  FolderOpen,
  ArrowLeft,
  Calendar,
  User,
  FileIcon,
  Star,
  Bookmark
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

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

export default function ClientDocuments() {
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  // Handle document viewing
  const handleViewDocument = (document: Document) => {
    // Open document in new tab for viewing
    window.open(`/api/documents/${document.id}/view`, '_blank');
  };

  // Handle document download
  const handleDownloadDocument = async (document: Document) => {
    try {
      // Create a direct link to trigger download
      const link = document.createElement('a');
      link.href = `/api/documents/${document.id}/download`;
      link.download = document.originalFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Fetch documents available to client
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/documents", searchQuery, selectedCategory, activeTab],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
      if (activeTab !== "all") params.append("filter", activeTab);
      return fetch(`/api/documents?${params}`).then(res => res.json());
    },
  });

  // Fetch user's project documents (from SEO Timeline)
  const { data: projectDocuments = [] } = useQuery({
    queryKey: ["/api/my-project-documents"],
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (extension: string) => {
    const iconMap: { [key: string]: string } = {
      pdf: "from-red-500 to-red-600",
      doc: "from-blue-500 to-blue-600", 
      docx: "from-blue-500 to-blue-600",
      xls: "from-green-500 to-green-600",
      xlsx: "from-green-500 to-green-600",
      ppt: "from-orange-500 to-orange-600",
      pptx: "from-orange-500 to-orange-600",
      txt: "from-gray-500 to-gray-600",
    };
    return iconMap[extension.toLowerCase()] || "from-gray-500 to-gray-600";
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

  const filteredDocuments = Array.isArray(documents) ? documents.filter((doc: Document) => {
    if (activeTab === "recent") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(doc.createdAt) > weekAgo;
    }
    if (activeTab === "popular") {
      return doc.downloadCount > 5;
    }
    return true;
  }) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Premium Glass Navigation */}
      <nav className="glass-navbar sticky top-0 z-50 border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="glass-button">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Timeline
                </Button>
              </Link>
              <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold specular-highlight">Document Center</h1>
                <p className="text-sm text-gray-600">Access your SEO resources and project documents</p>
              </div>
            </div>
            <Badge variant="outline" className="glass-badge">
              {user?.firstName} {user?.lastName}
            </Badge>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Search and Filters */}
        <Card className="glass-card mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search SEO documents, templates, and guidelines..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass-input"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-64 glass-input">
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
            </div>
            
            {/* Filter Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="glass-tabs">
                <TabsTrigger value="all" className="glass-tab">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  All Documents
                </TabsTrigger>
                <TabsTrigger value="recent" className="glass-tab">
                  <Calendar className="w-4 h-4 mr-2" />
                  Recent
                </TabsTrigger>
                <TabsTrigger value="popular" className="glass-tab">
                  <Star className="w-4 h-4 mr-2" />
                  Popular
                </TabsTrigger>
                <TabsTrigger value="project" className="glass-tab">
                  <Bookmark className="w-4 h-4 mr-2" />
                  My Projects
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Document Stats for User */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{filteredDocuments.length}</p>
              <p className="text-sm text-gray-600">Available Documents</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <Bookmark className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{projectDocuments.length}</p>
              <p className="text-sm text-gray-600">Project Documents</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{new Set(filteredDocuments.map((doc: Document) => doc.category)).size}</p>
              <p className="text-sm text-gray-600">Categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Documents Display */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : activeTab === "project" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold specular-highlight mb-4">Documents from Your SEO Projects</h2>
            {projectDocuments.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <Bookmark className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Project Documents</h3>
                  <p className="text-gray-600 mb-4">Documents linked to your SEO timeline tasks will appear here.</p>
                  <Link href="/">
                    <Button className="glass-button">
                      Go to SEO Timeline
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectDocuments.map((document: any) => (
                  <Card key={document.id} className="glass-card liquid-border group hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className={cn(
                            "p-4 rounded-xl bg-gradient-to-r shadow-lg w-16 h-16 mx-auto",
                            getFileIcon(document.fileExtension)
                          )}>
                            <FileIcon className="text-white w-8 h-8" />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg specular-highlight text-center">{document.title}</h3>
                          <Badge variant="outline" className="glass-badge w-full text-center">
                            Project: {document.projectName}
                          </Badge>
                          <Badge variant="secondary" className="w-full text-center">
                            Task: {document.taskName}
                          </Badge>
                        </div>
                        
                        <div className="text-center space-y-1">
                          <p className="text-xs text-gray-500">
                            {formatFileSize(document.fileSize)}
                          </p>
                        </div>
                        
                        <div className="flex gap-2 justify-center">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="glass-button"
                            onClick={() => handleViewDocument(document)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="glass-button"
                            onClick={() => handleDownloadDocument(document)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocuments.map((document: Document) => (
              <Card key={document.id} className="glass-card liquid-border group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className={cn(
                        "p-4 rounded-xl bg-gradient-to-r shadow-lg w-16 h-16 mx-auto",
                        getFileIcon(document.fileExtension)
                      )}>
                        <FileIcon className="text-white w-8 h-8" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg specular-highlight text-center line-clamp-2">{document.title}</h3>
                      <p className="text-sm text-gray-600 text-center line-clamp-2">{document.description}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Badge variant="outline" className="glass-badge w-full text-center">
                        {document.category}
                      </Badge>
                      {document.subcategory && (
                        <Badge variant="secondary" className="w-full text-center text-xs">
                          {document.subcategory}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-center space-y-1">
                      <p className="text-xs text-gray-500">
                        {formatFileSize(document.fileSize)} • {document.downloadCount} downloads
                      </p>
                      <p className="text-xs text-gray-500">
                        By {document.uploader.firstName} {document.uploader.lastName}
                      </p>
                    </div>
                    
                    {document.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {document.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {document.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{document.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2 justify-center">
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredDocuments.length === 0 && !isLoading && activeTab !== "project" && (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Documents Found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}