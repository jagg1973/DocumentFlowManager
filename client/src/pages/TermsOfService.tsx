import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, FileText, Scale, AlertTriangle, Crown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="glass-button mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Terms of Service
            </h1>
            <p className="text-gray-600 text-lg">
              Professional terms for our premium SEO timeline and document management platform.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="glass-card liquid-border">
            <CardHeader className="flex flex-row items-center space-y-0 pb-4">
              <FileText className="w-6 h-6 text-blue-600 mr-3" />
              <CardTitle className="text-xl">Service Agreement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                By accessing and using our SEO Timeline and Document Management System ("Service"), you agree to be bound by these Terms of Service ("Terms"). This agreement governs your use of our premium SAAS platform designed for professional SEO project management.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-blue-800 font-medium">
                  Professional Platform: This service is designed for businesses and professionals managing SEO projects and related documentation.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader className="flex flex-row items-center space-y-0 pb-4">
              <Crown className="w-6 h-6 text-purple-600 mr-3" />
              <CardTitle className="text-xl">Service Features & Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Core Platform Features</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>SEO project timeline creation and management with four-pillar framework</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Comprehensive document management system with version control</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Member authority system with peer review and social validation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Advanced analytics and reporting capabilities</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Multi-tenant collaboration with role-based permissions</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Account Types</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="font-medium text-green-800">Client Access</div>
                    <div className="text-sm text-green-600">Project management and document access</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-800">Admin Access</div>
                    <div className="text-sm text-blue-600">Full platform administration and user management</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader className="flex flex-row items-center space-y-0 pb-4">
              <AlertTriangle className="w-6 h-6 text-orange-600 mr-3" />
              <CardTitle className="text-xl">User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Account Security</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Maintain the confidentiality of your login credentials</li>
                  <li>• Use strong, unique passwords for your account</li>
                  <li>• Notify us immediately of any unauthorized access</li>
                  <li>• Accept responsibility for all activities under your account</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Content Guidelines</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Ensure all uploaded documents comply with copyright laws</li>
                  <li>• Do not upload malicious files or content that violates laws</li>
                  <li>• Respect intellectual property rights of third parties</li>
                  <li>• Use the platform only for legitimate business purposes</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Professional Conduct</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Maintain professional standards in all platform interactions</li>
                  <li>• Provide accurate information in peer reviews and assessments</li>
                  <li>• Respect other users' work and contributions</li>
                  <li>• Follow the Member Authority system guidelines fairly</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="text-xl">Data Ownership & Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Your Content</h3>
                <p className="text-gray-600">
                  You retain full ownership of all content, documents, and data you upload to the platform. We do not claim any ownership rights to your intellectual property.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Platform License</h3>
                <p className="text-gray-600">
                  By uploading content, you grant us a limited license to store, process, and display your content solely for the purpose of providing our services to you.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Our Intellectual Property</h3>
                <p className="text-gray-600">
                  The platform software, interface, algorithms, and methodologies remain our exclusive property and are protected by intellectual property laws.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="text-xl">Service Availability & Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Uptime Commitment</h3>
                  <p className="text-gray-600 text-sm">
                    We strive for 99.9% uptime with scheduled maintenance windows communicated in advance.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Data Backup</h3>
                  <p className="text-gray-600 text-sm">
                    Automated daily backups with point-in-time recovery capabilities.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Technical Support</h3>
                  <p className="text-gray-600 text-sm">
                    Professional support available during business hours with emergency escalation.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Performance Monitoring</h3>
                  <p className="text-gray-600 text-sm">
                    Continuous monitoring with automated alerts and performance optimization.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="text-xl">Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
                <p className="text-amber-800 font-medium mb-2">Important Legal Notice</p>
                <p className="text-amber-700 text-sm">
                  Our liability is limited to the amount paid for the service in the preceding 12 months. We are not liable for indirect, incidental, or consequential damages.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Service Disclaimer</h3>
                <p className="text-gray-600 text-sm">
                  The service is provided "as is" without warranties of any kind. While we strive for accuracy and reliability, we cannot guarantee uninterrupted or error-free operation.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="text-xl">Termination & Account Closure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Voluntary Termination</h3>
                <p className="text-gray-600">
                  You may terminate your account at any time. Upon termination, you have 30 days to export your data before permanent deletion.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Termination for Cause</h3>
                <p className="text-gray-600">
                  We may terminate accounts that violate these terms, engage in abusive behavior, or pose security risks to the platform.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Data Retention</h3>
                <p className="text-gray-600">
                  After account closure, data is securely deleted according to our data retention policy and applicable legal requirements.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="text-xl">Contact & Legal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  For questions about these Terms of Service or legal matters, please contact our legal team:
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
                  <div className="space-y-2">
                    <div><strong>Legal Email:</strong> legal@seo-timeline.com</div>
                    <div><strong>Business Address:</strong> 123 Business Plaza, Corporate City, CC 12345</div>
                    <div><strong>Phone:</strong> +1 (555) 987-6543</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>These Terms of Service are governed by the laws of [Your Jurisdiction].</p>
                  <p>Any disputes will be resolved through binding arbitration in [Your Jurisdiction].</p>
                  <p>We reserve the right to update these terms with 30 days notice to users.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}