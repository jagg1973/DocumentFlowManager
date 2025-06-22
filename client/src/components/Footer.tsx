import { Link } from "wouter";
import { Database, Mail, Shield, FileText, Calendar } from "lucide-react";

export default function Footer() {
  return (
    <footer className="glass-card border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold specular-highlight">SEO Timeline DMS</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Premium document management with advanced SEO project integration. 
              Secure, scalable, and intuitive.
            </p>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/documents" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Document Library
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  SEO Timeline
                </Link>
              </li>
              <li>
                <span className="text-gray-600 dark:text-gray-300 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Security & Privacy
                </span>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Features</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li>Enterprise-grade Security</li>
              <li>AI-powered Organization</li>
              <li>Real-time Collaboration</li>
              <li>Version Control</li>
              <li>Task Integration</li>
              <li>Advanced Analytics</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Contact</h3>
            <div className="space-y-2 text-sm">
              <a 
                href="mailto:support@seotimeline.com" 
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center"
              >
                <Mail className="w-4 h-4 mr-2" />
                support@seotimeline.com
              </a>
              <p className="text-gray-600 dark:text-gray-300">
                Need help? Our support team is available 24/7.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            © 2025 SEO Timeline DMS. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}