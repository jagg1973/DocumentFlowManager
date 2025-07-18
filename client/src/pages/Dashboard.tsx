import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Plus, Bell, FileText, Shield, Database, BarChart3, CheckCircle2, Clock, Calendar, Users, LogOut, Trophy } from "lucide-react";
import ProjectDashboard from "@/components/ProjectDashboard";
import { ProjectWithStats } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Footer from "@/components/Footer";
import ProjectCard from "@/components/ProjectCard";

function LogoutButton() {
  const { logoutMutation } = useAuth();
  
  return (
    <Button
      variant="outline"
      size="sm"
      className="glass-button btn-text text-crisp"
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
    >
      <LogOut className="w-4 h-4 mr-2" />
      {logoutMutation.isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}

const createProjectSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
});

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("Dashboard - User state:", user);
    console.log("Dashboard - User exists:", !!user);
    console.log("Dashboard - Auth loading:", authLoading);
  }, [user, authLoading]);

  const { data: projects = [], isLoading: projectsLoading, error, refetch: refetchProjects } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      console.log("Projects query executing...");
      return await apiRequest("/api/projects", "GET");
    },
    enabled: !!user && !authLoading, // Wait for auth to complete and user to exist
    retry: (failureCount, error) => {
      console.log("Projects query failed:", error);
      return failureCount < 2;
    },
  });

  // Debug logging for projects
  useEffect(() => {
    console.log("Dashboard - Projects data:", projects);
    console.log("Dashboard - Projects loading:", projectsLoading);
    console.log("Dashboard - Projects error:", error);
    console.log("Dashboard - Query enabled:", !!user && !authLoading);
  }, [projects, projectsLoading, error, user, authLoading]);

  // Calculate stats
  const totalTasks = projects?.reduce((sum, project) => sum + (project.totalTasks || 0), 0) || 0;
  const completedTasks = projects?.reduce((sum, project) => sum + (project.completedTasks || 0), 0) || 0;
  const activeTasks = totalTasks - completedTasks;
  const teamMembers = 0; // Temporarily disabled

  const form = useForm<z.infer<typeof createProjectSchema>>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      projectName: "",
    },
  });

  const { toast } = useToast();

  const createProjectMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createProjectSchema>) => {
      return apiRequest("/api/projects", "POST", data);
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create project",
        variant: "destructive",
      });
    },
    onSuccess: async (newProject) => {
      console.log("Project created successfully:", newProject);
      
      toast({
        title: "Success",
        description: `Project "${newProject.projectName}" created successfully`,
      });
      
      // Refetch the current query to get updated data immediately
      refetchProjects();
      
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      setCreateProjectOpen(false);
      form.reset();
    },
  });

  const onSubmit = (data: z.infer<typeof createProjectSchema>) => {
    createProjectMutation.mutate(data);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Premium Glass Navigation */}
      <nav className="glass-navbar sticky top-0 z-50 border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold specular-highlight heading-text text-crisp">SEO Timeline DMS</h1>
                <p className="text-sm text-gray-600 text-crisp">Project Management & Document System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/documents">
                <Button variant="outline" className="glass-button btn-text text-crisp">
                  <FileText className="w-4 h-4 mr-2" />
                  Documents
                </Button>
              </Link>
              {user?.isAdmin && (
                <Link href="/admin">
                  <Button variant="outline" className="glass-button btn-text text-crisp">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold specular-highlight mb-2 heading-text text-crisp">SEO Project Timeline</h1>
            <p className="text-gray-600 text-crisp">Welcome back, {user?.firstName}! Manage your SEO projects with integrated document management.</p>
          </div>
          <div className="flex space-x-3">
            <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-modal">
                <DialogHeader>
                  <DialogTitle>Create New SEO Project</DialogTitle>
                  <DialogDescription>
                    Create a new SEO project to organize and track your optimization tasks.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter project name..." 
                              {...field} 
                              className="glass-input"
                              required
                              minLength={1}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setCreateProjectOpen(false);
                          form.reset();
                        }}
                        className="glass-button"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createProjectMutation.isPending || !form.watch("projectName")?.trim()}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium"
                      >
                        {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Actions for DMS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/documents">
            <Card className="glass-card liquid-border group hover:shadow-xl transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg specular-highlight">Document Center</h3>
                    <p className="text-sm text-gray-600">Access SEO resources and project files</p>
                    <Badge variant="outline" className="mt-2 text-xs">Client Area</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {user?.isAdmin && (
            <Link href="/admin">
              <Card className="glass-card liquid-border group hover:shadow-xl transition-all duration-300 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg specular-highlight">Admin Dashboard</h3>
                      <p className="text-sm text-gray-600">Manage users and documents</p>
                      <Badge variant="outline" className="mt-2 text-xs">Admin Area</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          <Link href="/admin/documents">
            <Card className="glass-card liquid-border group hover:shadow-xl transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 shadow-lg">
                    <Database className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg specular-highlight">Document Library</h3>
                    <p className="text-sm text-gray-600">Browse and manage all documents</p>
                    <Badge variant="outline" className="mt-2 text-xs">Full Library</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Projects</p>
                  <p className="text-2xl font-bold specular-highlight">{projects?.length || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">SEO Timeline Projects</div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed Tasks</p>
                  <p className="text-2xl font-bold specular-highlight">{completedTasks}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">Tasks Finished</div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Tasks</p>
                  <p className="text-2xl font-bold specular-highlight">{activeTasks}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">In Progress</div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Team Members</p>
                  <p className="text-2xl font-bold specular-highlight">{teamMembers}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">Across Projects</div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="specular-highlight">SEO Timeline Projects</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchProjects()}
                disabled={projectsLoading}
                className="glass-button"
              >
                {projectsLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Projects Grid */}
        {projectsLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="glass-card animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-white/20 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-white/20 rounded w-3/4"></div>
                    <div className="h-4 bg-white/20 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onRefetch={refetchProjects} />
            ))}
          </div>
        ) : (
          <Card className="glass-card text-center py-12 liquid-border">
            <CardContent>
              <div className="text-gray-600 mb-4">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold specular-highlight mb-2">No Projects Yet</h3>
                <p className="text-gray-600 mb-6">Get started by creating your first SEO project timeline with integrated document management.</p>
              </div>
              <Button 
                onClick={() => setCreateProjectOpen(true)} 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
