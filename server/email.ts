import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not found - email functionality will be disabled");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailTemplate {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static readonly FROM_EMAIL = "noreply@seo-timeline.com";
  private static readonly FROM_NAME = "SEO Timeline DMS";

  static async sendEmail(template: EmailTemplate): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.log("Email sending skipped - no SendGrid API key configured");
      return false;
    }

    try {
      const msg = {
        to: template.to,
        from: {
          email: template.from,
          name: this.FROM_NAME
        },
        subject: template.subject,
        html: template.html,
        text: template.text || this.stripHtml(template.html)
      };

      await sgMail.send(msg);
      console.log(`Email sent successfully to ${template.to}`);
      return true;
    } catch (error) {
      console.error('SendGrid email error:', error);
      return false;
    }
  }

  static async sendWelcomeEmail(userEmail: string, userName: string, organizationName: string): Promise<boolean> {
    const template: EmailTemplate = {
      to: userEmail,
      from: this.FROM_EMAIL,
      subject: `Welcome to ${organizationName} - SEO Timeline DMS`,
      html: this.getWelcomeEmailTemplate(userName, organizationName),
    };

    return this.sendEmail(template);
  }

  static async sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    
    const template: EmailTemplate = {
      to: userEmail,
      from: this.FROM_EMAIL,
      subject: "Reset Your Password - SEO Timeline DMS",
      html: this.getPasswordResetEmailTemplate(userName, resetUrl),
    };

    return this.sendEmail(template);
  }

  static async sendProjectInvitationEmail(
    userEmail: string, 
    userName: string, 
    projectName: string, 
    inviterName: string,
    organizationName: string
  ): Promise<boolean> {
    const template: EmailTemplate = {
      to: userEmail,
      from: this.FROM_EMAIL,
      subject: `You've been invited to join ${projectName}`,
      html: this.getProjectInvitationEmailTemplate(userName, projectName, inviterName, organizationName),
    };

    return this.sendEmail(template);
  }

  static async sendTaskAssignmentEmail(
    userEmail: string,
    userName: string,
    taskTitle: string,
    projectName: string,
    dueDate?: string
  ): Promise<boolean> {
    const template: EmailTemplate = {
      to: userEmail,
      from: this.FROM_EMAIL,
      subject: `New Task Assigned: ${taskTitle}`,
      html: this.getTaskAssignmentEmailTemplate(userName, taskTitle, projectName, dueDate),
    };

    return this.sendEmail(template);
  }

  static async sendTaskCompletionEmail(
    userEmail: string,
    userName: string,
    taskTitle: string,
    projectName: string,
    completedBy: string
  ): Promise<boolean> {
    const template: EmailTemplate = {
      to: userEmail,
      from: this.FROM_EMAIL,
      subject: `Task Completed: ${taskTitle}`,
      html: this.getTaskCompletionEmailTemplate(userName, taskTitle, projectName, completedBy),
    };

    return this.sendEmail(template);
  }

  static async sendWeeklyProgressReport(
    userEmail: string,
    userName: string,
    organizationName: string,
    weeklyStats: {
      completedTasks: number;
      newProjects: number;
      teamActivity: number;
      achievements: string[];
    }
  ): Promise<boolean> {
    const template: EmailTemplate = {
      to: userEmail,
      from: this.FROM_EMAIL,
      subject: `Weekly Progress Report - ${organizationName}`,
      html: this.getWeeklyReportEmailTemplate(userName, organizationName, weeklyStats),
    };

    return this.sendEmail(template);
  }

  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private static getEmailHeader(): string {
    return `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">SEO Timeline DMS</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">Professional SEO Project Management</p>
      </div>
    `;
  }

  private static getEmailFooter(): string {
    return `
      <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; margin-top: 40px;">
        <p style="color: #6c757d; margin: 0; font-size: 14px;">
          This email was sent by SEO Timeline DMS. If you no longer wish to receive these emails, 
          you can update your preferences in your account settings.
        </p>
        <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">
          © 2025 SEO Timeline DMS. All rights reserved.
        </p>
      </div>
    `;
  }

  private static getWelcomeEmailTemplate(userName: string, organizationName: string): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        ${this.getEmailHeader()}
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #343a40; margin-bottom: 20px;">Welcome to ${organizationName}!</h2>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${userName},
          </p>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Welcome to your organization's SEO Timeline DMS! You now have access to a comprehensive 
            project management platform designed specifically for SEO teams and agencies.
          </p>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #495057; margin-top: 0; margin-bottom: 15px;">What you can do:</h3>
            <ul style="color: #6c757d; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Manage SEO projects with our four-pillar framework</li>
              <li style="margin-bottom: 8px;">Collaborate with your team on tasks and documents</li>
              <li style="margin-bottom: 8px;">Track progress with advanced analytics and reporting</li>
              <li style="margin-bottom: 8px;">Earn achievements and level up through gamification</li>
              <li style="margin-bottom: 8px;">Access comprehensive document management system</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Get Started
            </a>
          </div>

          <p style="color: #6c757d; font-size: 14px; line-height: 1.6;">
            If you have any questions, feel free to reach out to your organization administrator or 
            check our help documentation.
          </p>
        </div>

        ${this.getEmailFooter()}
      </div>
    `;
  }

  private static getPasswordResetEmailTemplate(userName: string, resetUrl: string): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        ${this.getEmailHeader()}
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #343a40; margin-bottom: 20px;">Reset Your Password</h2>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${userName},
          </p>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            We received a request to reset your password for your SEO Timeline DMS account. 
            Click the button below to create a new password.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>

          <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">
            This link will expire in 1 hour for security reasons.
          </p>

          <p style="color: #6c757d; font-size: 14px; line-height: 1.6;">
            If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>

        ${this.getEmailFooter()}
      </div>
    `;
  }

  private static getProjectInvitationEmailTemplate(
    userName: string, 
    projectName: string, 
    inviterName: string,
    organizationName: string
  ): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        ${this.getEmailHeader()}
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #343a40; margin-bottom: 20px;">Project Invitation</h2>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${userName},
          </p>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            ${inviterName} has invited you to join the project <strong>"${projectName}"</strong> 
            in ${organizationName}.
          </p>

          <div style="background: #e3f2fd; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2196f3;">
            <h3 style="color: #1976d2; margin-top: 0; margin-bottom: 10px;">Project: ${projectName}</h3>
            <p style="color: #0d47a1; margin: 0; font-size: 14px;">
              Join your team to collaborate on SEO tasks, track progress, and achieve project goals together.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/projects" 
               style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Project
            </a>
          </div>
        </div>

        ${this.getEmailFooter()}
      </div>
    `;
  }

  private static getTaskAssignmentEmailTemplate(
    userName: string,
    taskTitle: string,
    projectName: string,
    dueDate?: string
  ): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        ${this.getEmailHeader()}
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #343a40; margin-bottom: 20px;">New Task Assignment</h2>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${userName},
          </p>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            You have been assigned a new task in the project <strong>"${projectName}"</strong>.
          </p>

          <div style="background: #fff3cd; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0; margin-bottom: 10px;">Task: ${taskTitle}</h3>
            <p style="color: #856404; margin: 0; font-size: 14px;">
              Project: ${projectName}
              ${dueDate ? `<br>Due Date: ${new Date(dueDate).toLocaleDateString()}` : ''}
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/projects" 
               style="background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); color: #212529; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Task
            </a>
          </div>
        </div>

        ${this.getEmailFooter()}
      </div>
    `;
  }

  private static getTaskCompletionEmailTemplate(
    userName: string,
    taskTitle: string,
    projectName: string,
    completedBy: string
  ): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        ${this.getEmailHeader()}
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #343a40; margin-bottom: 20px;">Task Completed</h2>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${userName},
          </p>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Great news! A task in your project <strong>"${projectName}"</strong> has been completed.
          </p>

          <div style="background: #d4edda; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin-top: 0; margin-bottom: 10px;">✓ ${taskTitle}</h3>
            <p style="color: #155724; margin: 0; font-size: 14px;">
              Completed by: ${completedBy}<br>
              Project: ${projectName}
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/projects" 
               style="background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Project
            </a>
          </div>
        </div>

        ${this.getEmailFooter()}
      </div>
    `;
  }

  private static getWeeklyReportEmailTemplate(
    userName: string,
    organizationName: string,
    weeklyStats: {
      completedTasks: number;
      newProjects: number;
      teamActivity: number;
      achievements: string[];
    }
  ): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        ${this.getEmailHeader()}
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #343a40; margin-bottom: 20px;">Weekly Progress Report</h2>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${userName},
          </p>
          
          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Here's your weekly progress summary for ${organizationName}:
          </p>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #495057; margin-top: 0; margin-bottom: 20px;">This Week's Highlights</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div style="text-align: center; padding: 15px; background: white; border-radius: 6px;">
                <div style="font-size: 28px; font-weight: bold; color: #28a745;">${weeklyStats.completedTasks}</div>
                <div style="color: #6c757d; font-size: 14px;">Tasks Completed</div>
              </div>
              <div style="text-align: center; padding: 15px; background: white; border-radius: 6px;">
                <div style="font-size: 28px; font-weight: bold; color: #007bff;">${weeklyStats.newProjects}</div>
                <div style="color: #6c757d; font-size: 14px;">New Projects</div>
              </div>
            </div>

            ${weeklyStats.achievements.length > 0 ? `
              <div style="margin-top: 20px;">
                <h4 style="color: #495057; margin-bottom: 10px;">🏆 New Achievements</h4>
                <ul style="color: #6c757d; margin: 0; padding-left: 20px;">
                  ${weeklyStats.achievements.map(achievement => `<li style="margin-bottom: 5px;">${achievement}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Dashboard
            </a>
          </div>
        </div>

        ${this.getEmailFooter()}
      </div>
    `;
  }
}

export default EmailService;