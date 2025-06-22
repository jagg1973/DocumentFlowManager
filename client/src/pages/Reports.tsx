import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  Users,
  FileText,
  Activity,
  PieChart,
  LineChart
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Reports() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("7d");
  const [reportType, setReportType] = useState("overview");

  // Fetch comprehensive reports data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/api/admin/reports/overview", timeRange, reportType],
    queryFn: () => {
      return fetch(`/api/admin/reports/overview?timeRange=${timeRange}&type=${reportType}`).then(res => res.json());
    },
  });

  const downloadReport = (format: string) => {
    // Generate a mock report download
    const data = {
      reportType,
      timeRange,
      generatedAt: new Date().toISOString(),
      data: reportData
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${timeRange}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Analytics & Reports
            </h1>
            <p className="text-gray-600 mt-2">Comprehensive platform insights and performance metrics</p>
          </div>
          
          <div className="flex space-x-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={() => downloadReport('pdf')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold specular-highlight">{reportData?.totalDocuments || 0}</p>
                  <p className="text-xs text-green-600 mt-1">
                    +{reportData?.newDocumentsThisWeek || 0} this week
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold specular-highlight">{reportData?.totalUsers || 0}</p>
                  <p className="text-xs text-green-600 mt-1">
                    +{reportData?.newUsersThisWeek || 0} new users
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Downloads</p>
                  <p className="text-2xl font-bold specular-highlight">{reportData?.totalDownloads || 0}</p>
                  <p className="text-xs text-green-600 mt-1">
                    +{reportData?.downloadsThisWeek || 0} this week
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                  <Download className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Storage Used</p>
                  <p className="text-2xl font-bold specular-highlight">{reportData?.storageUsed || "0 MB"}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {reportData?.storagePercentage || 0}% of limit
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="glass-tabs">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Analytics</TabsTrigger>
            <TabsTrigger value="documents">Document Analytics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Document Uploads Chart */}
              <Card className="glass-card liquid-border">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <LineChart className="w-5 h-5 mr-2" />
                    Document Uploads (Weekly)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                      <p className="text-gray-600 mb-2">Weekly Upload Trends</p>
                      <div className="flex space-x-2 justify-center">
                        {(reportData?.weeklyDocumentUploads || [12, 15, 8, 22, 18, 25, 30]).map((count: number, index: number) => (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className="w-6 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                              style={{ height: `${(count / 30) * 100}px` }}
                            ></div>
                            <span className="text-xs text-gray-600 mt-1">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card className="glass-card liquid-border">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="w-5 h-5 mr-2" />
                    Document Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(reportData?.categoryDistribution || {
                      "Executive Summary": 15,
                      "Strategic Implementation": 22,
                      "Expert Guidelines": 18,
                      "Templates": 25,
                      "Checklists": 20
                    }).map(([category, count]: [string, any]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3"></div>
                          <span className="text-sm text-gray-700">{category}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-20 h-2 bg-gray-200 rounded-full mr-3">
                            <div 
                              className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                              style={{ width: `${(count / 25) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="glass-card liquid-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Recent Platform Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { action: "Document uploaded", user: "John Doe", item: "SEO Strategy Guide", time: "2 hours ago", type: "upload" },
                    { action: "User registered", user: "Jane Smith", item: "New account created", time: "4 hours ago", type: "user" },
                    { action: "Document downloaded", user: "Mike Johnson", item: "Technical SEO Checklist", time: "6 hours ago", type: "download" },
                    { action: "Project created", user: "Sarah Wilson", item: "E-commerce SEO Timeline", time: "8 hours ago", type: "project" },
                    { action: "Document shared", user: "Alex Brown", item: "Content Strategy Template", time: "1 day ago", type: "share" },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                          activity.type === 'upload' ? 'bg-green-100' :
                          activity.type === 'user' ? 'bg-blue-100' :
                          activity.type === 'download' ? 'bg-purple-100' :
                          activity.type === 'project' ? 'bg-orange-100' : 'bg-gray-100'
                        }`}>
                          {activity.type === 'upload' && <FileText className="w-5 h-5 text-green-600" />}
                          {activity.type === 'user' && <Users className="w-5 h-5 text-blue-600" />}
                          {activity.type === 'download' && <Download className="w-5 h-5 text-purple-600" />}
                          {activity.type === 'project' && <Calendar className="w-5 h-5 text-orange-600" />}
                          {activity.type === 'share' && <Activity className="w-5 h-5 text-gray-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            <span className="text-blue-600">{activity.user}</span> {activity.action.toLowerCase()}
                          </p>
                          <p className="text-xs text-gray-600">{activity.item}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.time}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card liquid-border">
                <CardHeader>
                  <CardTitle>User Growth Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                    <div className="text-center">
                      <TrendingUp className="w-16 h-16 mx-auto mb-4 text-green-500" />
                      <p className="text-gray-600 mb-2">Weekly User Registrations</p>
                      <div className="flex space-x-2 justify-center">
                        {(reportData?.weeklyUserSignups || [3, 5, 2, 8, 6, 10, 12]).map((count: number, index: number) => (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className="w-6 bg-gradient-to-t from-green-500 to-green-300 rounded-t"
                              style={{ height: `${(count / 12) * 100}px` }}
                            ></div>
                            <span className="text-xs text-gray-600 mt-1">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card liquid-border">
                <CardHeader>
                  <CardTitle>User Role Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { role: "Client Users", count: 45, color: "from-blue-500 to-blue-300" },
                      { role: "Manager Users", count: 12, color: "from-green-500 to-green-300" },
                      { role: "Admin Users", count: 3, color: "from-purple-500 to-purple-300" },
                    ].map((item) => (
                      <div key={item.role} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 bg-gradient-to-r ${item.color} rounded-full mr-3`}></div>
                          <span className="text-sm text-gray-700">{item.role}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-20 h-2 bg-gray-200 rounded-full mr-3">
                            <div 
                              className={`h-2 bg-gradient-to-r ${item.color} rounded-full`}
                              style={{ width: `${(item.count / 45) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card className="glass-card liquid-border">
              <CardHeader>
                <CardTitle>Document Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                    <p className="text-2xl font-bold text-gray-900">{reportData?.totalDocuments || 0}</p>
                    <p className="text-sm text-gray-600">Total Documents</p>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                    <Download className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-2xl font-bold text-gray-900">{reportData?.totalDownloads || 0}</p>
                    <p className="text-sm text-gray-600">Total Downloads</p>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-purple-500" />
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round((reportData?.totalDownloads || 0) / (reportData?.totalDocuments || 1) * 100) / 100}
                    </p>
                    <p className="text-sm text-gray-600">Avg Downloads/Doc</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card liquid-border">
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">API Response Time</span>
                      <span className="text-sm font-medium">125ms avg</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-green-500 to-green-300 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Uptime</span>
                      <span className="text-sm font-medium">99.9%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-green-500 to-green-300 h-2 rounded-full" style={{ width: '99%' }}></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Storage Efficiency</span>
                      <span className="text-sm font-medium">{reportData?.storagePercentage || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-300 h-2 rounded-full" style={{ width: `${reportData?.storagePercentage || 0}%` }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card liquid-border">
                <CardHeader>
                  <CardTitle>Export Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { format: "PDF Report", description: "Comprehensive analytics report", icon: FileText },
                      { format: "Excel Export", description: "Raw data for analysis", icon: BarChart3 },
                      { format: "CSV Data", description: "User and document data", icon: Download },
                    ].map((option) => (
                      <Button
                        key={option.format}
                        variant="outline"
                        className="w-full justify-start glass-button"
                        onClick={() => downloadReport(option.format.toLowerCase())}
                      >
                        <option.icon className="w-4 h-4 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">{option.format}</div>
                          <div className="text-xs text-gray-600">{option.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}