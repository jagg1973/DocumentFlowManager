import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Plus, Bell, FileText, Shield, Database, BarChart3, CheckCircle2, Clock, Calendar, Users } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import { ProjectWithStats } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";

const createProjectSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
});

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: projects, isLoading: projectsLoading, error } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Calculate stats
  const totalTasks = projects?.reduce((sum, project) => sum + (project.totalTasks || 0), 0) || 0;
  const completedTasks = projects?.reduce((sum, project) => sum + (project.completedTasks || 0), 0) || 0;
  const activeTasks = totalTasks - completedTasks;
  const teamMembers = projects?.reduce((sum, project) => sum + (project.memberCount || 0), 0) || 0;

  const form = useForm<z.infer<typeof createProjectSchema>>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      projectName: "",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createProjectSchema>) => {
      await apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setCreateProjectOpen(false);
      form.reset();
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
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof createProjectSchema>) => {
    createProjectMutation.mutate(data);
  };

  if (!isAuthenticated || isLoading) {
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
                <h1 className="text-xl font-bold specular-highlight">SEO Timeline DMS</h1>
                <p className="text-sm text-gray-600">Project Management & Document System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/documents">
                <Button variant="outline" className="glass-button">
                  <FileText className="w-4 h-4 mr-2" />
                  Documents
                </Button>
              </Link>
              {(user?.userRole === 'admin' || user?.userRole === 'manager') && (
                <Link href="/admin">
                  <Button variant="outline" className="glass-button">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              <Button 
                variant="ghost" 
                className="glass-button text-red-600 hover:text-red-700"
                onClick={() => window.location.href = '/api/auth/logout'}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold specular-highlight mb-2">SEO Project Timeline</h1>
            <p className="text-gray-600">Welcome back, {user?.firstName}! Manage your SEO projects with integrated document management.</p>
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
                            <Input placeholder="Enter project name..." {...field} className="glass-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setCreateProjectOpen(false)}
                        className="glass-button"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createProjectMutation.isPending}
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

          {(!user?.userRole || user?.userRole === 'admin' || user?.userRole === 'manager') && (
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
            <CardTitle className="specular-highlight">SEO Timeline Projects</CardTitle>
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
              <ProjectCard key={project.id} project={project} />
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
    </div>
  );
}
