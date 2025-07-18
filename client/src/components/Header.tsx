import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileText, Shield, Database, Menu, X, LogOut, Settings, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

function LogoutButton() {
  const { logoutMutation } = useAuth();
  
  return (
    <Button
      variant="outline"
      size="sm"
      className="premium-button text-error-600 hover:text-error-700 border-error-200 hover:border-error-300 hover:bg-error-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-950"
      onClick={() => {
        // Clear local storage and redirect immediately
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/auth";
      }}
      disabled={logoutMutation.isPending}
    >
      <LogOut className="w-4 h-4 mr-2" />
      {logoutMutation.isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}

export default function Header() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="glass-navbar sticky top-0 z-50 border-b border-white/10 backdrop-blur-3xl bg-white/5">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">{/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-premium group-hover:shadow-premium-lg transition-all duration-300 group-hover:scale-105">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white text-gradient">SEO Timeline DMS</h1>
                <p className="text-xs text-white/70">Document Management & SEO</p>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/documents">
              <Button variant="outline" className="glass-button">
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </Button>
            </Link>
            {user?.isAdmin && (
              <Link href="/admin">
                <Button variant="outline" className="glass-button">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
            <Link href="/gamification">
              <Button variant="outline" className="glass-button">
                <Trophy className="w-4 h-4 mr-2" />
                Achievements
              </Button>
            </Link>
            <Link href="/ui-showcase">
              <Button variant="ghost" size="sm" className="glass-button">
                <Settings className="w-4 h-4 mr-2" />
                UI Showcase
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="glass-button">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
            <LogoutButton />
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

          {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 pt-4 pb-4 bg-white/5 backdrop-blur-xl rounded-b-2xl mt-4">
            <nav className="flex flex-col space-y-2">{/* Mobile menu items */}
              <Link href="/documents">
                <Button variant="outline" className="w-full glass-button justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Documents
                </Button>
              </Link>
              {user?.isAdmin && (
                <Link href="/admin">
                  <Button variant="outline" className="w-full glass-button justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              <Link href="/settings">
                <Button variant="outline" className="w-full glass-button justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <LogoutButton />
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}