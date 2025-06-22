import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Shield, Eye, Lock, Database } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPolicy() {
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
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Privacy Policy
            </h1>
            <p className="text-gray-600 text-lg">
              Your privacy is our priority. Learn how we protect and manage your data.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="glass-card liquid-border">
            <CardHeader className="flex flex-row items-center space-y-0 pb-4">
              <Eye className="w-6 h-6 text-blue-600 mr-3" />
              <CardTitle className="text-xl">Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Account Information</h3>
                <p className="text-gray-600">
                  We collect information you provide when creating an account, including your name, email address, and authentication credentials.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Project Data</h3>
                <p className="text-gray-600">
                  We store your SEO project timelines, tasks, documents, and related metadata to provide our document management services.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Usage Analytics</h3>
                <p className="text-gray-600">
                  We collect anonymized usage data to improve our platform performance and user experience.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader className="flex flex-row items-center space-y-0 pb-4">
              <Lock className="w-6 h-6 text-green-600 mr-3" />
              <CardTitle className="text-xl">How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Provide and maintain our SEO timeline and document management services</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Process and store your project data and documents securely</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Send important service notifications and updates</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Analyze usage patterns to improve platform functionality</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Provide customer support and technical assistance</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader className="flex flex-row items-center space-y-0 pb-4">
              <Database className="w-6 h-6 text-purple-600 mr-3" />
              <CardTitle className="text-xl">Data Security & Storage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Encryption</h3>
                <p className="text-gray-600">
                  All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption standards.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Data Centers</h3>
                <p className="text-gray-600">
                  Your data is stored in secure, SOC 2 compliant data centers with multiple layers of physical and digital security.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Access Controls</h3>
                <p className="text-gray-600">
                  We implement strict access controls and authentication mechanisms to protect your information from unauthorized access.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="text-xl">Your Rights & Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Data Access</h3>
                  <p className="text-gray-600 text-sm">
                    Request a copy of all personal data we have about you.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Data Correction</h3>
                  <p className="text-gray-600 text-sm">
                    Update or correct any inaccurate personal information.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Data Deletion</h3>
                  <p className="text-gray-600 text-sm">
                    Request deletion of your personal data and account.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Data Portability</h3>
                  <p className="text-gray-600 text-sm">
                    Export your data in a machine-readable format.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="text-xl">Compliance & Standards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <div className="font-semibold text-blue-800 mb-2">GDPR Compliant</div>
                  <div className="text-sm text-blue-600">European data protection standards</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <div className="font-semibold text-green-800 mb-2">CCPA Compliant</div>
                  <div className="text-sm text-green-600">California privacy regulations</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <div className="font-semibold text-purple-800 mb-2">SOC 2 Type II</div>
                  <div className="text-sm text-purple-600">Security and availability controls</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="text-xl">Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
                  <div className="space-y-2">
                    <div><strong>Email:</strong> privacy@seo-timeline.com</div>
                    <div><strong>Address:</strong> 123 Privacy Street, Data City, DC 12345</div>
                    <div><strong>Phone:</strong> +1 (555) 123-4567</div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  We will respond to all inquiries within 30 days as required by applicable privacy laws.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}