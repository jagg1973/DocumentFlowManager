import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Star, 
  Heart, 
  Shield, 
  Zap, 
  Crown, 
  Sparkles,
  Download,
  Share,
  Settings,
  Play,
  Pause,
  SkipForward,
} from "lucide-react";

export default function UIShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-background to-brand-100 p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gradient mb-4">Premium UI Showcase</h1>
          <p className="text-xl text-muted-foreground">Experience the enhanced design system</p>
        </div>

        {/* Button Variants */}
        <Card className="card-premium mb-12">
          <CardHeader>
            <CardTitle className="text-premium">Button Variants</CardTitle>
            <CardDescription>Professional button styles with micro-interactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Buttons */}
            <div>
              <Label className="text-sm font-semibold text-muted-foreground mb-3 block">Primary Actions</Label>
              <div className="flex flex-wrap gap-4">
                <Button variant="default" size="sm">
                  <Star className="w-4 h-4 mr-2" />
                  Small
                </Button>
                <Button variant="default">
                  <Heart className="w-4 h-4 mr-2" />
                  Default
                </Button>
                <Button variant="default" size="lg">
                  <Crown className="w-4 h-4 mr-2" />
                  Large
                </Button>
                <Button variant="default" size="xl">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extra Large
                </Button>
              </div>
            </div>

            {/* Premium & Glass Buttons */}
            <div>
              <Label className="text-sm font-semibold text-muted-foreground mb-3 block">Premium Variants</Label>
              <div className="flex flex-wrap gap-4">
                <Button variant="premium">
                  <Zap className="w-4 h-4 mr-2" />
                  Premium
                </Button>
                <Button variant="glass">
                  <Shield className="w-4 h-4 mr-2" />
                  Glass
                </Button>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Outline
                </Button>
                <Button variant="ghost">
                  <Share className="w-4 h-4 mr-2" />
                  Ghost
                </Button>
              </div>
            </div>

            {/* Icon Buttons */}
            <div>
              <Label className="text-sm font-semibold text-muted-foreground mb-3 block">Icon Actions</Label>
              <div className="flex gap-4">
                <Button variant="default" size="icon">
                  <Play className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Pause className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <SkipForward className="w-4 h-4" />
                </Button>
                <Button variant="premium" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="card-premium">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-premium">Glass Card</CardTitle>
                <Badge className="badge-premium badge-success">Active</Badge>
              </div>
              <CardDescription>Enhanced card with glass morphism effects</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                This card demonstrates the premium glass morphism effect with subtle animations and enhanced shadows.
              </p>
              <Button variant="default" className="w-full">
                <Crown className="w-4 h-4 mr-2" />
                Premium Action
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-ultra">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-premium">Ultra Glass</CardTitle>
                <Badge className="badge-premium badge-warning">Featured</Badge>
              </div>
              <CardDescription>Ultra-premium glass effect with enhanced blur</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Maximum glass effect with advanced backdrop filtering and enhanced visual depth.
              </p>
              <Button variant="glass" className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Glass Action
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card animate-float">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-premium">Animated Card</CardTitle>
                <Badge className="badge-premium badge-error">New</Badge>
              </div>
              <CardDescription>Card with floating animation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                This card includes a subtle floating animation for added visual interest.
              </p>
              <Button variant="premium" className="w-full">
                <Star className="w-4 h-4 mr-2" />
                Animated Action
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Form Elements */}
        <Card className="card-premium mb-12">
          <CardHeader>
            <CardTitle className="text-premium">Form Elements</CardTitle>
            <CardDescription>Premium input styling with enhanced focus states</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="premium-input">Premium Input</Label>
                <Input 
                  id="premium-input"
                  className="input-premium focus-premium" 
                  placeholder="Type something premium..." 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="glass-input">Glass Input</Label>
                <Input 
                  id="glass-input"
                  className="glass-input" 
                  placeholder="Type with glass effect..." 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badge Showcase */}
        <Card className="card-premium mb-12">
          <CardHeader>
            <CardTitle className="text-premium">Badge Collection</CardTitle>
            <CardDescription>Status badges with premium styling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge className="badge-premium">Default</Badge>
              <Badge className="badge-premium badge-success">Success</Badge>
              <Badge className="badge-premium badge-warning">Warning</Badge>
              <Badge className="badge-premium badge-error">Error</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="secondary">Secondary</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-premium">Typography Scale</CardTitle>
            <CardDescription>Enhanced text hierarchy with professional spacing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <h1 className="text-4xl font-bold text-gradient">Heading 1 with Gradient</h1>
            <h2 className="text-3xl font-bold text-premium">Heading 2 Premium</h2>
            <h3 className="text-2xl font-semibold text-foreground">Heading 3 Standard</h3>
            <p className="text-lg text-muted-foreground">
              Large paragraph text with enhanced readability and proper line height for optimal reading experience.
            </p>
            <p className="text-base text-muted-foreground">
              Standard paragraph text that maintains excellent readability while providing clear information hierarchy.
            </p>
            <p className="text-sm text-muted-foreground">
              Small text for secondary information and captions with maintained clarity.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
