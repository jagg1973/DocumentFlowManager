import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, Users, BarChart3 } from 'lucide-react';

export default function ButtonShowcase() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Button Contrast Improvements</h1>
        <p className="text-muted-foreground">
          Showcasing improved button readability and contrast
        </p>
      </div>

      {/* Timeline Button Demonstration */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Button - Improved Contrast</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="timeline-button btn-text text-crisp" size="sm">
              View Timeline
            </Button>
            <Button className="timeline-button btn-text text-crisp">
              View Timeline (Default)
            </Button>
            <Button className="timeline-button btn-text text-crisp" size="lg">
              View Timeline (Large)
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Enhanced with bold font weight, text shadow, and improved contrast ratio for better readability on blue backgrounds.
          </p>
        </CardContent>
      </Card>

      {/* Admin Quick Actions Demonstration */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Quick Actions - Maintained Dark Text</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full admin-quick-action justify-start btn-text text-crisp">
            <FileText className="w-4 h-4 mr-2" />
            Manage Documents
          </Button>
          <Button className="w-full admin-quick-action justify-start btn-text text-crisp">
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents
          </Button>
          <Button className="w-full admin-quick-action justify-start btn-text text-crisp">
            <Users className="w-4 h-4 mr-2" />
            Manage Users
          </Button>
          <Button className="w-full admin-quick-action justify-start btn-text text-crisp">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Reports
          </Button>
          <p className="text-sm text-muted-foreground">
            Text remains dark and readable on hover with proper contrast maintenance.
          </p>
        </CardContent>
      </Card>

      {/* Standard Button Variants with Improved Typography */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Button Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="default">Default</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="premium">Premium</Button>
            <Button variant="glass">Glass</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            All variants now include improved font weights and text shadows for better readability.
          </p>
        </CardContent>
      </Card>

      {/* Contrast Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Before vs After Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <h3 className="text-white mb-2 font-medium">Before (Lower Contrast)</h3>
              <Button className="bg-transparent border border-white/30 text-white hover:bg-white/10" size="sm">
                View Timeline
              </Button>
            </div>
            <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <h3 className="text-white mb-2 font-medium">After (Higher Contrast)</h3>
              <Button className="timeline-button btn-text text-crisp" size="sm">
                View Timeline
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
