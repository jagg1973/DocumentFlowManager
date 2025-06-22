import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const addTaskSchema = z.object({
  taskName: z.string().min(1, "Task name is required"),
  pillar: z.string().optional(),
  phase: z.string().optional(),
  assignedToId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  guidelineDocLink: z.string().optional(),
});

interface AddTaskModalProps {
  projectId: number;
  members: Array<{
    id: number;
    userId: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
    };
  }> | undefined;
  onClose: () => void;
  onTaskCreated: () => void;
}

export default function AddTaskModal({ 
  projectId, 
  members, 
  onClose, 
  onTaskCreated 
}: AddTaskModalProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof addTaskSchema>>({
    resolver: zodResolver(addTaskSchema),
    defaultValues: {
      taskName: "",
      pillar: "Technical SEO",
      phase: "Foundation", 
      assignedToId: "unassigned",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: "",
      guidelineDocLink: "",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addTaskSchema>) => {
      return apiRequest(`/api/projects/${projectId}/tasks`, "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      form.reset();
      onTaskCreated();
      onClose();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1000);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof addTaskSchema>) => {
    createTaskMutation.mutate(data);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md glass-modal">
        <DialogHeader>
          <DialogTitle className="specular-highlight">Add New Task</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="taskName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task name..." className="glass-input" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pillar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO Pillar</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || "Technical SEO"}>
                    <FormControl>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select SEO pillar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Technical SEO">Technical SEO</SelectItem>
                      <SelectItem value="On-Page & Content">On-Page & Content</SelectItem>
                      <SelectItem value="Off-Page SEO">Off-Page SEO</SelectItem>
                      <SelectItem value="Analytics & Tracking">Analytics & Tracking</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO Phase</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="frosted-input">
                        <SelectValue placeholder="Select a phase" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-modal">
                      <SelectItem value="Foundation">Foundation</SelectItem>
                      <SelectItem value="Growth">Growth</SelectItem>
                      <SelectItem value="Authority">Authority</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="frosted-input">
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-modal">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members?.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.user.firstName} {member.user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add task description..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guidelineDocLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guideline Document Link</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter document URL..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTaskMutation.isPending || !form.watch("taskName")?.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
