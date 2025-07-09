import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Target, Settings, FileText, Globe, BarChart3 } from "lucide-react";

const createProjectSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  pillar: z.string().optional(),
  phase: z.string().optional(),
  priority: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

const SEO_PILLARS = [
  { value: "Technical SEO", label: "Technical SEO", icon: Settings, color: "bg-blue-500" },
  { value: "On-Page & Content", label: "On-Page & Content", icon: FileText, color: "bg-green-500" },
  { value: "Off-Page SEO", label: "Off-Page SEO", icon: Globe, color: "bg-purple-500" },
  { value: "Analytics & Tracking", label: "Analytics & Tracking", icon: BarChart3, color: "bg-orange-500" }
];

const PHASES = [
  { value: "Foundation", label: "Foundation", description: "Technical setup and foundation" },
  { value: "Growth", label: "Growth", description: "Content and authority building" },
  { value: "Authority", label: "Authority", description: "Advanced optimization" }
];

interface CreateProjectModalProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export default function CreateProjectModal({ trigger, onSuccess }: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      projectName: "",
      description: "",
      pillar: "Technical SEO",
      phase: "Foundation",
      priority: "medium",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProjectForm) => {
      console.log("Submitting project data:", data);
      return apiRequest("/api/projects", "POST", data);
    },
    onSuccess: (newProject) => {
      console.log("Project created successfully:", newProject);
      
      // Update the cache with the new project
      queryClient.setQueryData(["/api/projects"], (oldData: any[]) => {
        if (!oldData) return [newProject];
        return [...oldData, newProject];
      });
      
      // Also invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects"] });
      
      toast({
        title: "Project Created",
        description: "Your SEO project has been created successfully!",
      });
      form.reset();
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Project creation failed:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CreateProjectForm) => {
    console.log("Form submitted with data:", data);
    createProjectMutation.mutate(data);
  };

  const selectedPillar = SEO_PILLARS.find(p => p.value === form.watch("pillar"));
  const selectedPhase = PHASES.find(p => p.value === form.watch("phase"));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="glass-button bg-gradient-to-r from-blue-600 to-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            New SEO Project
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Create New SEO Project
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                {...form.register("projectName")}
                placeholder="e.g., E-commerce SEO Optimization"
                className="glass-input"
              />
              {form.formState.errors.projectName && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.projectName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Describe your SEO project goals and objectives..."
                className="glass-input"
              />
            </div>
          </div>

          {/* SEO Framework */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">SEO Framework</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pillar">Primary SEO Pillar</Label>
                <Select value={form.watch("pillar")} onValueChange={(value) => form.setValue("pillar", value)}>
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEO_PILLARS.map((pillar) => {
                      const IconComponent = pillar.icon;
                      return (
                        <SelectItem key={pillar.value} value={pillar.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${pillar.color}`}></div>
                            <IconComponent className="w-4 h-4" />
                            {pillar.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                {selectedPillar && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center gap-2">
                      <selectedPillar.icon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{selectedPillar.label}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="phase">Project Phase</Label>
                <Select value={form.watch("phase")} onValueChange={(value) => form.setValue("phase", value)}>
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHASES.map((phase) => (
                      <SelectItem key={phase.value} value={phase.value}>
                        <div>
                          <div className="font-medium">{phase.label}</div>
                          <div className="text-xs text-gray-600">{phase.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedPhase && (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <div className="text-sm font-medium text-green-900">{selectedPhase.label}</div>
                    <div className="text-xs text-green-700">{selectedPhase.description}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Project Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Project Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={form.watch("priority")} onValueChange={(value) => form.setValue("priority", value)}>
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">
                      <Badge variant="destructive" className="text-xs">High Priority</Badge>
                    </SelectItem>
                    <SelectItem value="medium">
                      <Badge variant="secondary" className="text-xs">Medium Priority</Badge>
                    </SelectItem>
                    <SelectItem value="low">
                      <Badge variant="outline" className="text-xs">Low Priority</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register("startDate")}
                  className="glass-input"
                />
              </div>

              <div>
                <Label htmlFor="endDate">Target End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register("endDate")}
                  className="glass-input"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="glass-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProjectMutation.isPending}
              className="glass-button bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}