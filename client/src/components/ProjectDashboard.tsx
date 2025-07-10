import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Zap,
  Activity,
  Star,
  Award,
  FileText,
  MessageSquare,
  Settings,
  Download,
  Filter,
  Search,
  Grid3X3,
  List,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  ArrowRight,
  Lightbulb,
  TrendingUp as Growth,
  Shield,
  Globe
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import ProjectGrid from "./ProjectGrid";
import ProjectKanban from "./ProjectKanban";
import CreateProjectModal from "./CreateProjectModal";
import { ProjectWithStats } from "@/lib/types";

interface ProjectDashboardProps {
  userId?: string;
}

const SEO_PILLARS = [
  {
    name: "Technical SEO",
    color: "bg-blue-500",
    icon: Settings,
    description: "Site structure, performance, and crawlability",
    progress: 75,
    tasks: { completed: 12, total: 16 }
  },
  {
    name: "On-Page & Content",
    color: "bg-green-500", 
    icon: FileText,
    description: "Content optimization and keyword strategy",
    progress: 82,
    tasks: { completed: 18, total: 22 }
  },
  {
    name: "Off-Page SEO",
    color: "bg-purple-500",
    icon: Globe,
    description: "Link building and external authority",
    progress: 65,
    tasks: { completed: 13, total: 20 }
  },
  {
    name: "Analytics & Tracking",
    color: "bg-orange-500",
    icon: BarChart3,
    description: "Performance monitoring and reporting",
    progress: 90,
    tasks: { completed: 9, total: 10 }
  }
];

const PHASES = [
  {
    name: "Foundation",
    color: "bg-slate-500",
    description: "Technical foundation and setup",
    projects: 3,
    completion: 85
  },
  {
    name: "Growth",
    color: "bg-emerald-500", 
    description: "Content and authority building",
    projects: 5,
    completion: 72
  },
  {
    name: "Authority",
    color: "bg-violet-500",
    description: "Advanced optimization and scaling",
    projects: 2,
    completion: 45
  }
];

const performanceData = [
  { month: 'Jan', organic: 1200, keywords: 45, conversions: 28 },
  { month: 'Feb', organic: 1450, keywords: 52, conversions: 35 },
  { month: 'Mar', organic: 1680, keywords: 61, conversions: 42 },
  { month: 'Apr', organic: 1920, keywords: 68, conversions: 48 },
  { month: 'May', organic: 2150, keywords: 75, conversions: 56 },
  { month: 'Jun', organic: 2380, keywords: 82, conversions: 63 }
];

const pillarData = [
  { name: 'Technical', value: 25, color: '#3B82F6' },
  { name: 'Content', value: 35, color: '#10B981' },
  { name: 'Off-Page', value: 20, color: '#8B5CF6' },
  { name: 'Analytics', value: 20, color: '#F59E0B' }
];

export default function ProjectDashboard({ userId }: ProjectDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch projects with enhanced data
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
    select: (data: any[]) => data.map(project => ({
      ...project,
      priority: project.priority || 'medium',
      status: project.status || 'active',
      pillar: project.pillar || 'Technical SEO',
      phase: project.phase || 'Foundation'
    }))
  });

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const avgProgress = totalProjects > 0 ? 
    Math.round(projects.reduce((acc, p) => acc + (p.totalTasks > 0 ? (p.completedTasks / p.totalTasks * 100) : 0), 0) / totalProjects) : 0;

  const priorityDistribution = [
    { priority: 'High', count: projects.filter(p => p.priority === 'high').length, color: '#EF4444' },
    { priority: 'Medium', count: projects.filter(p => p.priority === 'medium').length, color: '#F59E0B' },
    { priority: 'Low', count: projects.filter(p => p.priority === 'low').length, color: '#10B981' }
  ];

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SEO Project Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive SEO project management with the four-pillar framework
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="glass-button">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" className="glass-button">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <CreateProjectModal />
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card liquid-border group hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Projects</p>
                <p className="text-3xl font-bold text-gray-900">{totalProjects}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+12% this month</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg group-hover:shadow-blue-500/25 transition-shadow">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card liquid-border group hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Projects</p>
                <p className="text-3xl font-bold text-gray-900">{activeProjects}</p>
                <div className="flex items-center mt-2">
                  <Activity className="w-4 h-4 text-blue-500 mr-1" />
                  <span className="text-sm text-blue-600">In progress</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg group-hover:shadow-green-500/25 transition-shadow">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card liquid-border group hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{completedProjects}</p>
                <div className="flex items-center mt-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600">Success rate: 94%</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg group-hover:shadow-purple-500/25 transition-shadow">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card liquid-border group hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Progress</p>
                <p className="text-3xl font-bold text-gray-900">{avgProgress}%</p>
                <div className="flex items-center mt-2">
                  <Growth className="w-4 h-4 text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600">On track</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg group-hover:shadow-orange-500/25 transition-shadow">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 glass-card">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="pillars" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            SEO Pillars
          </TabsTrigger>
          <TabsTrigger value="phases" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Phases
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <Card className="glass-card liquid-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  SEO Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" className="text-sm" />
                    <YAxis className="text-sm" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)'
                      }}
                    />
                    <Line type="monotone" dataKey="organic" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6' }} />
                    <Line type="monotone" dataKey="keywords" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
                    <Line type="monotone" dataKey="conversions" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Project Distribution */}
            <Card className="glass-card liquid-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Project Distribution by Pillar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pillarData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {pillarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Recent Project Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: "Technical audit completed", project: "E-commerce SEO", time: "2 hours ago", type: "completion" },
                  { action: "New keyword research task", project: "Local Business SEO", time: "4 hours ago", type: "task" },
                  { action: "Link building campaign started", project: "SaaS Platform SEO", time: "1 day ago", type: "start" },
                  { action: "Analytics setup completed", project: "Blog SEO Optimization", time: "2 days ago", type: "completion" }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'completion' ? 'bg-green-500' :
                        activity.type === 'task' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-600">{activity.project}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Project Management</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="glass-button"
                >
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="glass-button"
                >
                  <List className="w-4 h-4 mr-2" />
                  List
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="glass-button"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Kanban
                </Button>
              </div>
            </div>
            
            <ProjectGrid 
              projects={projects}
              isLoading={isLoading}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </TabsContent>

        <TabsContent value="pillars" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SEO_PILLARS.map((pillar, index) => {
              const IconComponent = pillar.icon;
              return (
                <Card key={index} className="glass-card liquid-border group hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${pillar.color} shadow-lg`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{pillar.name}</CardTitle>
                          <p className="text-sm text-gray-600">{pillar.description}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Progress</span>
                        <span className="text-sm font-medium">{pillar.progress}%</span>
                      </div>
                      <Progress value={pillar.progress} className="h-2" />
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Tasks: {pillar.tasks.completed}/{pillar.tasks.total}</span>
                        <Button size="sm" variant="outline" className="glass-button">
                          <ArrowRight className="w-4 h-4 mr-1" />
                          View Tasks
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="phases" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PHASES.map((phase, index) => (
              <Card key={index} className="glass-card liquid-border group hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${phase.color}`}></div>
                    <div>
                      <CardTitle className="text-lg">{phase.name}</CardTitle>
                      <p className="text-sm text-gray-600">{phase.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{phase.projects}</div>
                      <div className="text-sm text-gray-600">Active Projects</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Completion</span>
                        <span className="font-medium">{phase.completion}%</span>
                      </div>
                      <Progress value={phase.completion} className="h-2" />
                    </div>
                    
                    <Button className="w-full glass-button" variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      View Projects
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 glass-card liquid-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Monthly Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" className="text-sm" />
                    <YAxis className="text-sm" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)'
                      }}
                    />
                    <Bar dataKey="organic" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="keywords" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="conversions" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass-card liquid-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { 
                      insight: "Technical SEO improvements increased organic traffic by 24%",
                      type: "success",
                      icon: TrendingUp
                    },
                    {
                      insight: "Content strategy boosted keyword rankings by 15 positions average",
                      type: "info", 
                      icon: Lightbulb
                    },
                    {
                      insight: "Link building campaign needs attention in Q3",
                      type: "warning",
                      icon: AlertTriangle
                    },
                    {
                      insight: "Analytics tracking shows 89% goal completion rate",
                      type: "success",
                      icon: Target
                    }
                  ].map((item, index) => {
                    const IconComponent = item.icon;
                    return (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        item.type === 'success' ? 'border-l-green-500 bg-green-50' :
                        item.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
                        'border-l-blue-500 bg-blue-50'
                      }`}>
                        <div className="flex items-start gap-2">
                          <IconComponent className={`w-4 h-4 mt-0.5 ${
                            item.type === 'success' ? 'text-green-600' :
                            item.type === 'warning' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                          <p className="text-sm text-gray-800">{item.insight}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}