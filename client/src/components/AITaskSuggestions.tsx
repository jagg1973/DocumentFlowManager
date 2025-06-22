import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Sparkles, 
  Plus, 
  Brain, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Lightbulb,
  BarChart3
} from "lucide-react";

interface TaskSuggestion {
  taskName: string;
  pillar: string;
  phase: string;
  description: string;
  estimatedHours: number;
  priority: 'High' | 'Medium' | 'Low';
  reasoning: string;
}

interface GapAnalysis {
  gaps: string[];
  recommendations: string[];
  priorityActions: string[];
}

interface AITaskSuggestionsProps {
  projectId: number;
  onTaskCreated: () => void;
}

export default function AITaskSuggestions({ projectId, onTaskCreated }: AITaskSuggestionsProps) {
  const [open, setOpen] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");
  const [websiteType, setWebsiteType] = useState("");
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const { toast } = useToast();

  // Fetch gap analysis
  const { data: gapAnalysis, isLoading: gapLoading } = useQuery<GapAnalysis>({
    queryKey: [`/api/projects/${projectId}/gap-analysis`],
    enabled: open,
  });

  // Generate suggestions mutation
  const generateSuggestionsMutation = useMutation({
    mutationFn: async (data: { targetAudience?: string; websiteType?: string }) => {
      return apiRequest(`/api/projects/${projectId}/ai-suggestions`, "POST", data);
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions);
      toast({
        title: "AI Suggestions Generated",
        description: `Generated ${data.suggestions.length} personalized task suggestions`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (suggestion: TaskSuggestion) => {
      return apiRequest(`/api/projects/${projectId}/tasks`, "POST", {
        taskName: suggestion.taskName,
        pillar: suggestion.pillar,
        phase: suggestion.phase,
        description: suggestion.description,
        assignedToId: "unassigned",
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      toast({
        title: "Task Created",
        description: "AI-suggested task added to your project",
      });
      onTaskCreated();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
    },
  });

  const handleGenerateSuggestions = () => {
    generateSuggestionsMutation.mutate({
      targetAudience: targetAudience.trim() || undefined,
      websiteType: websiteType.trim() || undefined,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPillarColor = (pillar: string) => {
    switch (pillar) {
      case 'Technical SEO': return 'bg-blue-100 text-blue-800';
      case 'On-Page & Content': return 'bg-green-100 text-green-800';
      case 'Off-Page SEO': return 'bg-purple-100 text-purple-800';
      case 'Analytics & Tracking': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="glass-button bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700">
          <Sparkles className="w-4 h-4 mr-2" />
          AI Task Suggestions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl glass-modal max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center specular-highlight">
            <Brain className="w-5 h-5 mr-2" />
            AI-Powered Task Suggestions
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="suggestions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="suggestions">Generate Tasks</TabsTrigger>
            <TabsTrigger value="analysis">Gap Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="space-y-6">
            {/* Input Form */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Project Context (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Small business owners, E-commerce customers, B2B professionals"
                    className="glass-input mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="websiteType">Website Type</Label>
                  <Input
                    id="websiteType"
                    value={websiteType}
                    onChange={(e) => setWebsiteType(e.target.value)}
                    placeholder="e.g., E-commerce, Blog, SaaS, Local business, Portfolio"
                    className="glass-input mt-1"
                  />
                </div>
                <Button 
                  onClick={handleGenerateSuggestions}
                  disabled={generateSuggestionsMutation.isPending}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                >
                  {generateSuggestionsMutation.isPending ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Generating AI Suggestions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Smart Task Suggestions
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Suggestions List */}
            {suggestions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold specular-highlight">
                  AI-Generated Task Suggestions
                </h3>
                {suggestions.map((suggestion, index) => (
                  <Card key={index} className="glass-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base font-medium">
                            {suggestion.taskName}
                          </CardTitle>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className={getPillarColor(suggestion.pillar)}>
                              {suggestion.pillar}
                            </Badge>
                            <Badge variant="outline">{suggestion.phase}</Badge>
                            <Badge className={getPriorityColor(suggestion.priority)}>
                              {suggestion.priority} Priority
                            </Badge>
                            <span className="text-sm text-gray-500">
                              ~{suggestion.estimatedHours}h
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => createTaskMutation.mutate(suggestion)}
                          disabled={createTaskMutation.isPending}
                          className="glass-button bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Task
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-3">{suggestion.description}</p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">AI Insight</p>
                            <p className="text-sm text-blue-700">{suggestion.reasoning}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {gapLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-600">Analyzing your project...</p>
              </div>
            ) : gapAnalysis ? (
              <div className="space-y-6">
                {/* Gaps */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-700">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Identified Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gapAnalysis.gaps.length > 0 ? (
                      <ul className="space-y-2">
                        {gapAnalysis.gaps.map((gap, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-gray-700">{gap}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-600">No significant gaps identified in your current strategy.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center text-blue-700">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Strategic Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {gapAnalysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <BarChart3 className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                          <span className="text-gray-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Priority Actions */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-700">
                      <Target className="w-5 h-5 mr-2" />
                      Priority Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {gapAnalysis.priorityActions.map((action, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Unable to load gap analysis</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}