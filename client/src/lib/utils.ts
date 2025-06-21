import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPillarColor(pillar: string | null): string {
  switch (pillar) {
    case 'Technical':
      return 'pillar-technical';
    case 'On-Page & Content':
      return 'pillar-onpage';
    case 'Off-Page':
      return 'pillar-offpage';
    case 'Analytics':
      return 'pillar-analytics';
    default:
      return 'bg-gray-500';
  }
}

export function getStatusColor(status: string | null): string {
  switch (status) {
    case 'Completed':
      return 'status-completed';
    case 'Overdue':
      return 'status-overdue';
    case 'In Progress':
      return 'status-progress';
    case 'Not Started':
      return 'status-notstarted';
    default:
      return 'text-gray-500';
  }
}

export function getPhaseColor(phase: string | null): string {
  switch (phase) {
    case '1: Foundation':
      return 'bg-blue-100 text-blue-800';
    case '2: Growth':
      return 'bg-green-100 text-green-800';
    case '3: Authority':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function calculateDatePosition(startDate: string, endDate: string, timelineStart: Date, timelineEnd: Date): { left: number; width: number } {
  const taskStart = new Date(startDate);
  const taskEnd = new Date(endDate);
  
  const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
  const taskStartOffset = taskStart.getTime() - timelineStart.getTime();
  const taskDuration = taskEnd.getTime() - taskStart.getTime();
  
  const left = (taskStartOffset / totalDuration) * 100;
  const width = (taskDuration / totalDuration) * 100;
  
  return { left: Math.max(0, left), width: Math.max(5, width) };
}

export function generateTimelineWeeks(startDate: Date, endDate: Date): Date[] {
  const weeks: Date[] = [];
  const current = new Date(startDate);
  
  // Start from the beginning of the week (Sunday)
  current.setDate(current.getDate() - current.getDay());
  
  while (current <= endDate) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  
  return weeks;
}
