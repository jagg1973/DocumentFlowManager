import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, FileText } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Project {
  id: number;
  projectName: string;
  ownerId: string;
  createdAt: string;
}

interface Task {
  id: number;
  taskName: string;
  status: string;
  pillar: string;
  phase: string;
  startDate: string;
  endDate: string;
  progress: number;
}

export default function ProjectPage() {
  const { id } = useParams();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${id}`],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: [`/api/projects/${id}/tasks`],
  });

  if (projectLoading || tasksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="glass-card p-8 rounded-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading project...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Project Not Found</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
                <Link href="/">
                  <Button className="glass-button-primary">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="glass-button mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold specular-highlight mb-2">{project.projectName}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Owner ID: {project.ownerId}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button className="glass-button-primary">
                  <FileText className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="grid gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="specular-highlight">Project Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks && tasks.length > 0 ? (
                <div className="grid gap-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="glass-card p-4 rounded-lg shadow-card">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{task.taskName}</h3>
                        <Badge variant={
                          task.status === 'Completed' ? 'default' :
                          task.status === 'In Progress' ? 'secondary' :
                          'outline'
                        }>
                          {task.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                        <Badge variant="outline">{task.pillar}</Badge>
                        <Badge variant="outline">{task.phase}</Badge>
                        {task.progress && (
                          <span>{task.progress}% complete</span>
                        )}
                      </div>
                      {task.startDate && task.endDate && (
                        <div className="mt-2 text-sm text-gray-500">
                          {new Date(task.startDate).toLocaleDateString()} - {new Date(task.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tasks yet</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">Get started by creating your first task for this project.</p>
                  <Button className="glass-button-primary">
                    <FileText className="w-4 h-4 mr-2" />
                    Create First Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}