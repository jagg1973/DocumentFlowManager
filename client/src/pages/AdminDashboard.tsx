import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Users, 
  FolderOpen, 
  Upload, 
  BarChart3, 
  Settings,
  Shield,
  Activity,
  Database,
  Download
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminDashboard() {
  const { user } = useAuth();
  
  // Fetch admin statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/admin/activity"],
  });

  const { data: documents } = useQuery({
    queryKey: ["/api/admin/documents/recent"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  // Allow access for admin, manager, or users without a role set (default to admin access)
  const hasAdminAccess = !user?.userRole || user?.userRole === 'admin' || user?.userRole === 'manager';
  
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have permission to access the admin area.</p>
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
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold specular-highlight">DMS Admin</h1>
                <p className="text-sm text-gray-600">Document Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" className="glass-button">
                  <Activity className="w-4 h-4 mr-2" />
                  SEO Timeline
                </Button>
              </Link>
              <Badge variant="outline" className="glass-badge">
                {user?.firstName} {user?.lastName}
              </Badge>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold specular-highlight">{stats?.totalDocuments || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                +{stats?.newDocumentsThisWeek || 0} this week
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold specular-highlight">{stats?.activeUsers || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {stats?.newUsersThisWeek || 0} new this week
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Storage Used</p>
                  <p className="text-2xl font-bold specular-highlight">{stats?.storageUsed || "0 MB"}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {stats?.storagePercentage || 0}% of limit
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Downloads</p>
                  <p className="text-2xl font-bold specular-highlight">{stats?.totalDownloads || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                  <Download className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                +{stats?.downloadsThisWeek || 0} this week
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="glass-tabs">
            <TabsTrigger value="overview" className="glass-tab">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" className="glass-tab">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="users" className="glass-tab">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="glass-tab">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="specular-highlight">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivity?.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-white/30">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="specular-highlight">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/admin/documents">
                    <Button className="w-full glass-button justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Manage Documents
                    </Button>
                  </Link>
                  <Button className="w-full glass-button justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Documents
                  </Button>
                  <Button className="w-full glass-button justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button className="w-full glass-button justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Reports
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="specular-highlight">Document Management</CardTitle>
                <Link href="/admin/documents">
                  <Button className="glass-button">
                    <FileText className="w-4 h-4 mr-2" />
                    Full Document Library
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents?.map((doc: any) => (
                    <div key={doc.id} className="p-4 rounded-lg bg-white/30 border border-white/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm">{doc.title}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                      <p className="text-xs text-gray-500 mt-2">{doc.uploadedAt}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="specular-highlight">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users?.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-4 rounded-lg bg-white/30">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      <Badge variant={user.userRole === "admin" ? "default" : "secondary"}>
                        {user.userRole}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="specular-highlight">System Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="glass-button h-20 flex-col">
                    <Upload className="w-6 h-6 mb-2" />
                    Upload Settings
                  </Button>
                  <Button variant="outline" className="glass-button h-20 flex-col">
                    <Shield className="w-6 h-6 mb-2" />
                    Security Settings
                  </Button>
                  <Button variant="outline" className="glass-button h-20 flex-col">
                    <Database className="w-6 h-6 mb-2" />
                    Database Backup
                  </Button>
                  <Button variant="outline" className="glass-button h-20 flex-col">
                    <BarChart3 className="w-6 h-6 mb-2" />
                    Analytics Setup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}