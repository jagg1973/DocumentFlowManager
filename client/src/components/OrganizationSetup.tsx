import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Users, Globe, Target, Settings, Check } from "lucide-react";

interface OrganizationSetupProps {
  onComplete?: () => void;
}

export default function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    description: "",
    website: "",
    industry: "",
    size: "",
    plan: "pro"
  });
  const { toast } = useToast();

  const createOrganizationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/organizations", "POST", data),
    onSuccess: () => {
      toast({
        title: "Organization Created",
        description: "Your organization has been set up successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      onComplete?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate domain from name
    if (field === 'name' && !formData.domain) {
      const domain = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 20);
      setFormData(prev => ({ ...prev, domain }));
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.domain) {
      toast({
        title: "Missing Information",
        description: "Please fill in the organization name and domain.",
        variant: "destructive",
      });
      return;
    }

    createOrganizationMutation.mutate(formData);
  };

  const steps = [
    {
      title: "Organization Details",
      description: "Set up your organization's basic information",
      icon: Building2
    },
    {
      title: "Team Configuration", 
      description: "Configure your team structure and roles",
      icon: Users
    },
    {
      title: "Platform Setup",
      description: "Customize your SEO project management settings",
      icon: Settings
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((stepInfo, index) => {
              const stepNumber = index + 1;
              const isActive = step === stepNumber;
              const isCompleted = step > stepNumber;
              const IconComponent = stepInfo.icon;
              
              return (
                <div key={stepNumber} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isActive 
                      ? 'bg-blue-500 border-blue-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <IconComponent className="w-6 h-6" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      {stepInfo.title}
                    </p>
                    <p className="text-sm text-gray-500">{stepInfo.description}</p>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-1 mx-6 rounded ${
                      step > stepNumber ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="glass-card liquid-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Welcome to SEO Timeline DMS
            </CardTitle>
            <p className="text-center text-gray-600">
              Let's set up your organization to get started with multi-tenant SEO project management
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Organization Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Acme Corporation"
                      className="glass-input"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="domain">Domain Identifier *</Label>
                    <Input
                      id="domain"
                      value={formData.domain}
                      onChange={(e) => handleInputChange('domain', e.target.value)}
                      placeholder="acme-corp"
                      className="glass-input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be used for multi-tenant isolation (lowercase, no spaces)
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of your organization..."
                    className="glass-input"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://acme.com"
                      className="glass-input"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="marketing">Marketing & Advertising</SelectItem>
                        <SelectItem value="ecommerce">E-commerce</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="size">Organization Size</Label>
                    <Select value={formData.size} onValueChange={(value) => handleInputChange('size', value)}>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (1-10 employees)</SelectItem>
                        <SelectItem value="medium">Medium (11-50 employees)</SelectItem>
                        <SelectItem value="large">Large (51-200 employees)</SelectItem>
                        <SelectItem value="enterprise">Enterprise (200+ employees)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="plan">Plan</Label>
                    <Select value={formData.plan} onValueChange={(value) => handleInputChange('plan', value)}>
                      <SelectTrigger className="glass-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">Pro (Recommended)</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Team Structure Setup</h3>
                  <p className="text-gray-600 mb-6">
                    Your organization will support these role-based access levels:
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { role: "Organization Admin", level: "Full access to all features", icon: "👑" },
                    { role: "Project Manager", level: "Manage projects and teams", icon: "📊" },
                    { role: "SEO Lead", level: "Lead SEO strategies", icon: "🎯" },
                    { role: "SEO Specialist", level: "Execute SEO tasks", icon: "⚡" },
                    { role: "Client", level: "View project progress", icon: "👀" }
                  ].map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-white/50">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <p className="font-medium">{item.role}</p>
                          <p className="text-sm text-gray-600">{item.level}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Multi-Tenant Isolation:</strong> Each organization maintains complete data separation. 
                    Users can only see projects, tasks, and team members within their organization.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Platform Configuration</h3>
                  <p className="text-gray-600 mb-6">
                    Review your setup and customize your SEO project management platform
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-4">Organization Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Name:</strong> {formData.name}</div>
                    <div><strong>Domain:</strong> {formData.domain}</div>
                    <div><strong>Industry:</strong> {formData.industry}</div>
                    <div><strong>Size:</strong> {formData.size}</div>
                    <div><strong>Plan:</strong> {formData.plan}</div>
                    <div><strong>Website:</strong> {formData.website}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Included Features:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      "Multi-tenant project isolation",
                      "SEO four-pillar framework",
                      "Advanced task management",
                      "Document management system",
                      "Team collaboration tools",
                      "Performance analytics",
                      "Gamification system",
                      "Role-based access control"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="glass-button"
              >
                Previous
              </Button>
              
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && (!formData.name || !formData.domain)}
                  className="glass-button bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={createOrganizationMutation.isPending}
                  className="glass-button bg-gradient-to-r from-green-600 to-blue-600"
                >
                  {createOrganizationMutation.isPending ? "Creating..." : "Complete Setup"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}