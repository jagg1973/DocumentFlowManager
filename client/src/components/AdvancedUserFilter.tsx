import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Filter, 
  Search, 
  Save, 
  Trash2, 
  Download, 
  Upload, 
  Settings,
  Calendar as CalendarIcon,
  Star,
  Trophy,
  Target,
  Users,
  TrendingUp,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface FilterCriteria {
  id?: string;
  name: string;
  description?: string;
  // Basic filters
  search: string;
  role: string[];
  memberLevel: string[];
  status: string[];
  
  // Performance filters
  experienceRange: [number, number];
  levelRange: [number, number];
  badgeCount: [number, number];
  streakDays: [number, number];
  tasksCompleted: [number, number];
  
  // Date filters
  joinedAfter?: Date;
  joinedBefore?: Date;
  lastActiveAfter?: Date;
  lastActiveBefore?: Date;
  
  // Advanced filters
  averageRating: [number, number];
  authorityScore: [number, number];
  departments: string[];
  skills: string[];
  projects: string[];
  
  // Activity filters
  documentsUploaded: [number, number];
  reviewsGiven: [number, number];
  projectsOwned: [number, number];
  
  // Custom fields
  customFields: Record<string, any>;
}

interface SavedFilter {
  id: string;
  name: string;
  description: string;
  criteria: FilterCriteria;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

interface AdvancedUserFilterProps {
  onFilterChange: (criteria: FilterCriteria) => void;
  onUserSelect?: (users: any[]) => void;
  initialCriteria?: Partial<FilterCriteria>;
  showSaveFilter?: boolean;
  showBulkActions?: boolean;
}

const defaultCriteria: FilterCriteria = {
  name: "",
  search: "",
  role: [],
  memberLevel: [],
  status: [],
  experienceRange: [0, 10000],
  levelRange: [1, 20],
  badgeCount: [0, 50],
  streakDays: [0, 365],
  tasksCompleted: [0, 1000],
  averageRating: [0, 5],
  authorityScore: [0, 1000],
  departments: [],
  skills: [],
  projects: [],
  documentsUploaded: [0, 500],
  reviewsGiven: [0, 200],
  projectsOwned: [0, 50],
  customFields: {}
};

export default function AdvancedUserFilter({ 
  onFilterChange, 
  onUserSelect, 
  initialCriteria = {},
  showSaveFilter = true,
  showBulkActions = false 
}: AdvancedUserFilterProps) {
  const [criteria, setCriteria] = useState<FilterCriteria>({ ...defaultCriteria, ...initialCriteria });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [saveFilterOpen, setSaveFilterOpen] = useState(false);
  const [loadFilterOpen, setLoadFilterOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterDescription, setFilterDescription] = useState("");
  const { toast } = useToast();

  // Fetch saved filters
  const { data: savedFilters = [] } = useQuery({
    queryKey: ["/api/filters/saved"],
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ["/api/filters/options"],
  });

  // Apply filters and get filtered users
  const { data: filteredUsers = [], isLoading } = useQuery({
    queryKey: ["/api/users/filtered", criteria],
    queryFn: () => apiRequest("/api/users/filtered", "POST", criteria),
  });

  // Save filter mutation
  const saveFilterMutation = useMutation({
    mutationFn: (filterData: any) => apiRequest("/api/filters/save", "POST", filterData),
    onSuccess: () => {
      toast({
        title: "Filter Saved",
        description: "Your filter has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/filters/saved"] });
      setSaveFilterOpen(false);
      setFilterName("");
      setFilterDescription("");
    },
  });

  // Delete filter mutation
  const deleteFilterMutation = useMutation({
    mutationFn: (filterId: string) => apiRequest(`/api/filters/${filterId}`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "Filter Deleted",
        description: "Filter has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/filters/saved"] });
    },
  });

  // Export filtered users
  const exportMutation = useMutation({
    mutationFn: (format: string) => apiRequest("/api/users/export", "POST", { criteria, format }),
    onSuccess: (data) => {
      // Create download link
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filtered_users_${format}_${Date.now()}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  useEffect(() => {
    onFilterChange(criteria);
  }, [criteria, onFilterChange]);

  const updateCriteria = (key: keyof FilterCriteria, value: any) => {
    setCriteria(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setCriteria(defaultCriteria);
  };

  const loadSavedFilter = (savedFilter: SavedFilter) => {
    setCriteria(savedFilter.criteria);
    setLoadFilterOpen(false);
    toast({
      title: "Filter Loaded",
      description: `Loaded filter: ${savedFilter.name}`,
    });
  };

  const saveCurrentFilter = () => {
    if (!filterName.trim()) {
      toast({
        title: "Filter Name Required",
        description: "Please enter a name for your filter",
        variant: "destructive",
      });
      return;
    }

    saveFilterMutation.mutate({
      name: filterName,
      description: filterDescription,
      criteria,
      isPublic: false,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (criteria.search) count++;
    if (criteria.role.length > 0) count++;
    if (criteria.memberLevel.length > 0) count++;
    if (criteria.experienceRange[0] > 0 || criteria.experienceRange[1] < 10000) count++;
    if (criteria.levelRange[0] > 1 || criteria.levelRange[1] < 20) count++;
    if (criteria.joinedAfter || criteria.joinedBefore) count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Advanced User Filters</h3>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {getActiveFiltersCount()} active
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {filteredUsers.length} users found
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {showSaveFilter && (
            <>
              <Dialog open={loadFilterOpen} onOpenChange={setLoadFilterOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Load Filter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Load Saved Filter</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {savedFilters.map((filter: SavedFilter) => (
                      <div key={filter.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{filter.name}</p>
                          <p className="text-sm text-gray-600">{filter.description}</p>
                          <p className="text-xs text-gray-500">Used {filter.usageCount} times</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => loadSavedFilter(filter)}>
                            Load
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => deleteFilterMutation.mutate(filter.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={saveFilterOpen} onOpenChange={setSaveFilterOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Save Filter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Current Filter</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="filter-name">Filter Name</Label>
                      <Input
                        id="filter-name"
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        placeholder="Enter filter name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="filter-description">Description (Optional)</Label>
                      <Input
                        id="filter-description"
                        value={filterDescription}
                        onChange={(e) => setFilterDescription(e.target.value)}
                        placeholder="Enter filter description"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setSaveFilterOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={saveCurrentFilter}
                        disabled={saveFilterMutation.isPending}
                      >
                        {saveFilterMutation.isPending ? "Saving..." : "Save Filter"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          
          <Button variant="outline" size="sm" onClick={() => exportMutation.mutate('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Basic Filters */}
        <TabsContent value="basic" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Basic Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="Name, email, or ID"
                      value={criteria.search}
                      onChange={(e) => updateCriteria('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Role</Label>
                  <Select 
                    value={criteria.role[0] || ""} 
                    onValueChange={(value) => updateCriteria('role', value ? [value] : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Member Level</Label>
                  <Select 
                    value={criteria.memberLevel[0] || ""} 
                    onValueChange={(value) => updateCriteria('memberLevel', value ? [value] : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C-Level">C-Level</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="SEO Lead">SEO Lead</SelectItem>
                      <SelectItem value="SEO Expert">SEO Expert</SelectItem>
                      <SelectItem value="SEO Specialist">SEO Specialist</SelectItem>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Joined After</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {criteria.joinedAfter ? format(criteria.joinedAfter, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={criteria.joinedAfter}
                        onSelect={(date) => updateCriteria('joinedAfter', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Joined Before</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {criteria.joinedBefore ? format(criteria.joinedBefore, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={criteria.joinedBefore}
                        onSelect={(date) => updateCriteria('joinedBefore', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Filters */}
        <TabsContent value="performance" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Performance Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Experience Points: {criteria.experienceRange[0]} - {criteria.experienceRange[1]}</Label>
                  <Slider
                    min={0}
                    max={10000}
                    step={50}
                    value={criteria.experienceRange}
                    onValueChange={(value) => updateCriteria('experienceRange', value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Level: {criteria.levelRange[0]} - {criteria.levelRange[1]}</Label>
                  <Slider
                    min={1}
                    max={20}
                    step={1}
                    value={criteria.levelRange}
                    onValueChange={(value) => updateCriteria('levelRange', value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Badge Count: {criteria.badgeCount[0]} - {criteria.badgeCount[1]}</Label>
                  <Slider
                    min={0}
                    max={50}
                    step={1}
                    value={criteria.badgeCount}
                    onValueChange={(value) => updateCriteria('badgeCount', value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Streak Days: {criteria.streakDays[0]} - {criteria.streakDays[1]}</Label>
                  <Slider
                    min={0}
                    max={365}
                    step={1}
                    value={criteria.streakDays}
                    onValueChange={(value) => updateCriteria('streakDays', value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Tasks Completed: {criteria.tasksCompleted[0]} - {criteria.tasksCompleted[1]}</Label>
                  <Slider
                    min={0}
                    max={1000}
                    step={5}
                    value={criteria.tasksCompleted}
                    onValueChange={(value) => updateCriteria('tasksCompleted', value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Authority Score: {criteria.authorityScore[0]} - {criteria.authorityScore[1]}</Label>
                  <Slider
                    min={0}
                    max={1000}
                    step={10}
                    value={criteria.authorityScore}
                    onValueChange={(value) => updateCriteria('authorityScore', value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Filters */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Activity Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Documents Uploaded: {criteria.documentsUploaded[0]} - {criteria.documentsUploaded[1]}</Label>
                  <Slider
                    min={0}
                    max={500}
                    step={5}
                    value={criteria.documentsUploaded}
                    onValueChange={(value) => updateCriteria('documentsUploaded', value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Reviews Given: {criteria.reviewsGiven[0]} - {criteria.reviewsGiven[1]}</Label>
                  <Slider
                    min={0}
                    max={200}
                    step={2}
                    value={criteria.reviewsGiven}
                    onValueChange={(value) => updateCriteria('reviewsGiven', value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Projects Owned: {criteria.projectsOwned[0]} - {criteria.projectsOwned[1]}</Label>
                  <Slider
                    min={0}
                    max={50}
                    step={1}
                    value={criteria.projectsOwned}
                    onValueChange={(value) => updateCriteria('projectsOwned', value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Average Rating: {criteria.averageRating[0]} - {criteria.averageRating[1]}</Label>
                  <Slider
                    min={0}
                    max={5}
                    step={0.1}
                    value={criteria.averageRating}
                    onValueChange={(value) => updateCriteria('averageRating', value)}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Last Active After</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {criteria.lastActiveAfter ? format(criteria.lastActiveAfter, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={criteria.lastActiveAfter}
                        onSelect={(date) => updateCriteria('lastActiveAfter', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Last Active Before</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {criteria.lastActiveBefore ? format(criteria.lastActiveBefore, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={criteria.lastActiveBefore}
                        onSelect={(date) => updateCriteria('lastActiveBefore', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Filters */}
        <TabsContent value="advanced" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Advanced Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Department</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="seo">SEO</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Skills</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select skills" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical-seo">Technical SEO</SelectItem>
                      <SelectItem value="content-writing">Content Writing</SelectItem>
                      <SelectItem value="link-building">Link Building</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Project Experience</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="e-commerce">E-commerce</SelectItem>
                      <SelectItem value="local-seo">Local SEO</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="startup">Startup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results Summary */}
      {filteredUsers.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filtered Results ({filteredUsers.length} users)</span>
              {showBulkActions && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Select All
                  </Button>
                  <Button size="sm" variant="outline">
                    Bulk Actions
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.slice(0, 6).map((user: any) => (
                <div key={user.id} className="p-4 border rounded-lg bg-white/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Level {user.currentLevel} • {user.experiencePoints} XP</div>
                    <div>{user.totalBadges} badges • {user.tasksCompleted} tasks</div>
                    <div>Streak: {user.streakDays} days</div>
                  </div>
                </div>
              ))}
              {filteredUsers.length > 6 && (
                <div className="p-4 border rounded-lg bg-gray-50 flex items-center justify-center">
                  <div className="text-center text-gray-600">
                    <div className="font-medium">+{filteredUsers.length - 6} more users</div>
                    <div className="text-sm">Use export to see all results</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}