import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export interface TaskSuggestion {
  taskName: string;
  pillar: string;
  phase: string;
  description: string;
  estimatedHours: number;
  priority: 'High' | 'Medium' | 'Low';
  reasoning: string;
}

export async function generateTaskSuggestions(
  projectName: string,
  existingTasks: Array<{ taskName: string; pillar: string; phase: string; status: string }>,
  targetAudience?: string,
  websiteType?: string
): Promise<TaskSuggestion[]> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }
  
  try {
    const prompt = `
You are an SEO expert creating task suggestions for a project called "${projectName}".
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${websiteType ? `Website type: ${websiteType}` : ''}

Existing tasks:
${existingTasks.map(task => `- ${task.taskName} (${task.pillar}, ${task.phase}) - ${task.status}`).join('\n')}

Generate 5 strategic SEO task suggestions based on the SEO Masterplan framework:

PILLARS:
- Technical SEO
- On-Page & Content  
- Off-Page SEO
- Analytics & Tracking

PHASES:
- Foundation (basic setup and fundamentals)
- Growth (scaling and optimization)
- Authority (advanced strategies and leadership)

For each suggestion, consider:
1. What's missing from existing tasks
2. Natural progression from current work
3. Industry best practices
4. ROI potential

Respond with JSON in this exact format:
{
  "suggestions": [
    {
      "taskName": "Task name (specific and actionable)",
      "pillar": "One of the four pillars",
      "phase": "Foundation, Growth, or Authority",
      "description": "Detailed explanation of what needs to be done and why",
      "estimatedHours": number,
      "priority": "High, Medium, or Low",
      "reasoning": "Why this task is important for the project"
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an SEO expert who creates actionable, specific task suggestions based on proven SEO methodologies. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }
    
    const result = JSON.parse(content);
    return result.suggestions || [];

  } catch (error) {
    console.error("Error generating AI task suggestions:", error);
    if (error instanceof Error && error.message.includes("API key")) {
      throw new Error("OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.");
    }
    throw new Error("Failed to generate AI task suggestions. Please check your OpenAI configuration.");
  }
}

export async function analyzeProjectGaps(
  projectName: string,
  tasks: Array<{ taskName: string; pillar: string; phase: string; status: string; progress: number }>
): Promise<{
  gaps: string[];
  recommendations: string[];
  priorityActions: string[];
}> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }
  
  try {
    const prompt = `
Analyze this SEO project for gaps and provide recommendations:

Project: ${projectName}
Current tasks:
${tasks.map(task => `- ${task.taskName} (${task.pillar}, ${task.phase}) - ${task.status} (${task.progress}% complete)`).join('\n')}

Analyze across the SEO Masterplan framework:
- Technical SEO (site speed, crawlability, mobile-first, etc.)
- On-Page & Content (keyword optimization, content strategy, etc.)
- Off-Page SEO (link building, brand mentions, etc.)  
- Analytics & Tracking (measurement, reporting, etc.)

And phases:
- Foundation → Growth → Authority

Respond with JSON:
{
  "gaps": ["specific areas missing or underrepresented"],
  "recommendations": ["strategic advice for improvement"],
  "priorityActions": ["immediate next steps to take"]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an SEO strategist who identifies gaps and provides actionable recommendations. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 1500
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }
    
    const result = JSON.parse(content);
    return {
      gaps: result.gaps || [],
      recommendations: result.recommendations || [],
      priorityActions: result.priorityActions || []
    };

  } catch (error) {
    console.error("Error analyzing project gaps:", error);
    if (error instanceof Error && error.message.includes("API key")) {
      throw new Error("OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.");
    }
    throw new Error("Failed to analyze project gaps. Please check your OpenAI configuration.");
  }
}