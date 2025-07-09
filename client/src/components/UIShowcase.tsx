import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Star, 
  Heart, 
  Download, 
  Upload, 
  Settings, 
  User, 
  Shield, 
  Trophy,
  Zap,
  Sparkles
} from "lucide-react";

export default function UIShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold heading-premium text-gradient mb-2">
            Premium UI Showcase
          </h1>
          <p className="text-lg body-premium max-w-2xl mx-auto">
            Experience our enhanced design system with premium typography, sophisticated interactions, and glass morphism effects.
          </p>
        </div>

        {/* Button Variants */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="heading-premium">Enhanced Button System</CardTitle>
            <CardDescription className="body-premium">
              Premium button variants with micro-interactions and sophisticated hover states
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="default" className="premium-button">
                <Star className="w-4 h-4 mr-2" />
                Default
              </Button>
              <Button variant="premium" className="shimmer-effect">
                <Sparkles className="w-4 h-4 mr-2" />
                Premium
              </Button>
              <Button variant="glass" className="micro-interaction">
                <Zap className="w-4 h-4 mr-2" />
                Glass
              </Button>
              <Button variant="outline" className="premium-button focus-premium">
                <Shield className="w-4 h-4 mr-2" />
                Outline
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="destructive" className="premium-button">
                <Download className="w-4 h-4 mr-2" />
                Destructive
              </Button>
              <Button variant="secondary" className="premium-button">
                <Upload className="w-4 h-4 mr-2" />
                Secondary
              </Button>
              <Button variant="ghost" className="premium-button">
                <User className="w-4 h-4 mr-2" />
                Ghost
              </Button>
            </div>

            {/* Button Sizes */}
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm" variant="default" className="premium-button">Small</Button>
              <Button size="default" variant="default" className="premium-button">Default</Button>
              <Button size="lg" variant="default" className="premium-button">Large</Button>
              <Button size="xl" variant="premium" className="shimmer-effect">Extra Large</Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="premium-card floating-animation">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="heading-premium">Premium Card</CardTitle>
                <Badge className="glass-morphism">New</Badge>
              </div>
              <CardDescription className="body-premium">
                Enhanced card with premium shadows and micro-interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="w-full h-32 bg-gradient-to-r from-brand-400 to-brand-600 rounded-xl flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <Button variant="default" className="w-full premium-button">
                  Explore Features
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card glass-morphism">
            <CardHeader>
              <CardTitle className="heading-premium">Glass Morphism</CardTitle>
              <CardDescription className="body-premium">
                Sophisticated glass effect with backdrop blur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input 
                  placeholder="Enter your text..." 
                  className="glass-morphism focus-premium"
                />
                <Button variant="glass" className="w-full micro-interaction">
                  <Heart className="w-4 h-4 mr-2" />
                  Glass Button
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="heading-premium text-gradient">Gradient Text</CardTitle>
              <CardDescription className="body-premium">
                Beautiful gradient text effects with proper contrast
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Badge variant="default" className="justify-center">Success</Badge>
                  <Badge variant="secondary" className="justify-center">Warning</Badge>
                  <Badge variant="destructive" className="justify-center">Error</Badge>
                  <Badge variant="outline" className="justify-center">Info</Badge>
                </div>
                <Button variant="outline" className="w-full premium-button">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Typography Examples */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="heading-premium">Enhanced Typography</CardTitle>
            <CardDescription className="body-premium">
              Professional font stack with optimized spacing and contrast
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold heading-premium">Heading 1</h1>
                <h2 className="text-3xl font-bold heading-premium">Heading 2</h2>
                <h3 className="text-2xl font-bold heading-premium">Heading 3</h3>
                <h4 className="text-xl font-semibold heading-premium">Heading 4</h4>
              </div>
              <div className="space-y-4">
                <p className="text-lg body-premium">
                  Large body text with optimal line height and letter spacing for enhanced readability.
                </p>
                <p className="text-base body-premium">
                  Regular body text that maintains excellent readability across all devices and screen sizes.
                </p>
                <p className="text-sm caption-premium">
                  Small caption text with increased letter spacing for professional appearance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Elements */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="heading-premium">Interactive Elements</CardTitle>
            <CardDescription className="body-premium">
              Hover and focus states with smooth transitions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="p-6 premium-card micro-interaction cursor-pointer group"
                >
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto premium-gradient rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold heading-premium">Feature {item}</h4>
                    <p className="text-sm body-premium">Interactive card</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-4 py-8">
          <p className="body-premium">
            Premium UI system designed for professional applications
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="premium" className="shimmer-effect">
              <Download className="w-4 h-4 mr-2" />
              Export Theme
            </Button>
            <Button variant="outline" className="premium-button">
              View Documentation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
