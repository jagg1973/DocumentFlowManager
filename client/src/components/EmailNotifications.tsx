import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  TrendingUp,
  Settings,
  Bell
} from "lucide-react";

interface EmailPreferences {
  taskAssignments: boolean;
  taskCompletions: boolean;
  projectInvitations: boolean;
  weeklyReports: boolean;
  achievements: boolean;
  documentSharing: boolean;
  deadlineReminders: boolean;
  teamUpdates: boolean;
}

export default function EmailNotifications() {
  const [preferences, setPreferences] = useState<EmailPreferences>({
    taskAssignments: true,
    taskCompletions: true,
    projectInvitations: true,
    weeklyReports: true,
    achievements: false,
    documentSharing: true,
    deadlineReminders: true,
    teamUpdates: false,
  });

  const { toast } = useToast();

  const testEmailMutation = useMutation({
    mutationFn: () => apiRequest("/api/email/test", "POST"),
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "Check your inbox for the test email.",
      });
    },
    onError: () => {
      toast({
        title: "Email Test Failed",
        description: "Unable to send test email. Please check your email configuration.",
        variant: "destructive",
      });
    }
  });

  const weeklyReportMutation = useMutation({
    mutationFn: () => apiRequest("/api/email/weekly-report", "POST"),
    onSuccess: () => {
      toast({
        title: "Weekly Report Sent",
        description: "Your weekly progress report has been sent to your email.",
      });
    },
    onError: () => {
      toast({
        title: "Report Failed",
        description: "Unable to send weekly report. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handlePreferenceChange = (key: keyof EmailPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    // Here you would typically save to backend
    toast({
      title: "Preferences Updated",
      description: `${key} notifications ${value ? 'enabled' : 'disabled'}.`,
    });
  };

  const emailTypes = [
    {
      key: 'taskAssignments' as keyof EmailPreferences,
      title: 'Task Assignments',
      description: 'Get notified when you are assigned new tasks',
      icon: CheckCircle2,
      color: 'text-blue-600'
    },
    {
      key: 'taskCompletions' as keyof EmailPreferences,
      title: 'Task Completions',
      description: 'Receive updates when team members complete tasks',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      key: 'projectInvitations' as keyof EmailPreferences,
      title: 'Project Invitations',
      description: 'Get invited to new projects and collaborations',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      key: 'weeklyReports' as keyof EmailPreferences,
      title: 'Weekly Progress Reports',
      description: 'Comprehensive weekly summary of your activities',
      icon: FileText,
      color: 'text-orange-600'
    },
    {
      key: 'achievements' as keyof EmailPreferences,
      title: 'Achievement Notifications',
      description: 'Celebrate your achievements and level progress',
      icon: Badge,
      color: 'text-yellow-600'
    },
    {
      key: 'documentSharing' as keyof EmailPreferences,
      title: 'Document Sharing',
      description: 'Notifications when documents are shared with you',
      icon: FileText,
      color: 'text-indigo-600'
    },
    {
      key: 'deadlineReminders' as keyof EmailPreferences,
      title: 'Deadline Reminders',
      description: 'Get reminded about upcoming task deadlines',
      icon: Clock,
      color: 'text-red-600'
    },
    {
      key: 'teamUpdates' as keyof EmailPreferences,
      title: 'Team Updates',
      description: 'Stay informed about team activities and changes',
      icon: Bell,
      color: 'text-gray-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Email Status */}
      <Card className="glass-card liquid-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Email System Status</CardTitle>
                <p className="text-sm text-gray-600">SendGrid integration active</p>
              </div>
            </div>
            <Badge variant="outline" className="border-green-500 text-green-700">
              ✓ Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => testEmailMutation.mutate()}
              disabled={testEmailMutation.isPending}
              variant="outline"
              className="glass-button"
            >
              <Send className="w-4 h-4 mr-2" />
              {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
            </Button>
            
            <Button
              onClick={() => weeklyReportMutation.mutate()}
              disabled={weeklyReportMutation.isPending}
              variant="outline"
              className="glass-button"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {weeklyReportMutation.isPending ? "Sending..." : "Send Weekly Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Preferences */}
      <Card className="glass-card liquid-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Email Preferences</CardTitle>
              <p className="text-sm text-gray-600">Choose which email notifications you want to receive</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emailTypes.map((emailType) => {
              const IconComponent = emailType.icon;
              return (
                <div key={emailType.key} className="flex items-center justify-between p-4 border rounded-lg bg-white/50 hover:bg-white/70 transition-colors">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <IconComponent className={`w-4 h-4 ${emailType.color}`} />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={emailType.key} className="font-medium cursor-pointer">
                        {emailType.title}
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">{emailType.description}</p>
                    </div>
                  </div>
                  <Switch
                    id={emailType.key}
                    checked={preferences[emailType.key]}
                    onCheckedChange={(checked) => handlePreferenceChange(emailType.key, checked)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Email Templates Info */}
      <Card className="glass-card liquid-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Available Email Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Welcome Email", description: "Sent to new users when they join", status: "Active" },
              { name: "Password Reset", description: "Secure password reset with time-limited links", status: "Active" },
              { name: "Task Assignment", description: "Notify users of new task assignments", status: "Active" },
              { name: "Task Completion", description: "Celebrate completed tasks and milestones", status: "Active" },
              { name: "Project Invitation", description: "Invite team members to join projects", status: "Active" },
              { name: "Weekly Report", description: "Comprehensive weekly progress summary", status: "Active" }
            ].map((template, index) => (
              <div key={index} className="p-3 border rounded-lg bg-white/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{template.name}</h4>
                  <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                    {template.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">{template.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}