import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, User, Phone, Mail, Calendar, Clock, Award, ChevronRight, Edit, Save, X } from "lucide-react";
import { API_BASE } from "@/lib/api";


interface StaffProfile {
  id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    phone: string;
    is_active: boolean;
  };
  emergency_contact: string;
  emergency_phone: string;
  date_of_birth: string;
  hire_date: string;
  position: string;
  department: string;
  manager: string | null;
  skills: string[];
  certifications: string[];
  notes: string;
  profile_image: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

interface PerformanceMetric {
  id: string;
  staff: string;
  metric_type: string;
  value: number;
  date: string;
  notes: string;
}

interface StaffAvailability {
  id: string;
  staff: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes: string;
}

interface StaffProfileViewProps {
  staffId?: string;
  onUpdate?: () => void;
}

const StaffProfileView: React.FC<StaffProfileViewProps> = ({ staffId, onUpdate }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingAvailability, setIsAddingAvailability] = useState(false);
  const [isAddingPerformance, setIsAddingPerformance] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  const [formData, setFormData] = useState<Partial<StaffProfile>>({});
  const [availabilityForm, setAvailabilityForm] = useState<Partial<StaffAvailability>>({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
    is_available: true,
    notes: "",
  });
  const [performanceForm, setPerformanceForm] = useState<Partial<PerformanceMetric>>({
    metric_type: "PRODUCTIVITY",
    value: 0,
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Fetch staff profile
  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery<StaffProfile>({
    queryKey: ["staff-profile", staffId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/profiles/${staffId}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch staff profile");
      }
      return response.json();
    },
    enabled: !!staffId,
  });

  // Fetch performance metrics
  const {
    data: performanceMetrics,
    isLoading: isLoadingMetrics,
  } = useQuery<PerformanceMetric[]>({
    queryKey: ["performance-metrics", staffId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/performance-metrics/?staff=${staffId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch performance metrics");
      }
      return response.json();
    },
    enabled: !!staffId,
  });

  // Fetch staff availability
  const {
    data: availability,
    isLoading: isLoadingAvailability,
  } = useQuery<StaffAvailability[]>({
    queryKey: ["staff-availability", staffId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/availability/?staff=${staffId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch staff availability");
      }
      return response.json();
    },
    enabled: !!staffId,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<StaffProfile>) => {
      const response = await fetch(`${API_BASE}/staff/profiles/${staffId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update profile");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["staff-profile", staffId]);
      toast({
        title: "Profile updated",
        description: "Staff profile has been updated successfully.",
      });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add availability mutation
  const addAvailabilityMutation = useMutation({
    mutationFn: async (data: Partial<StaffAvailability>) => {
      const response = await fetch(`${API_BASE}/staff/availability/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ ...data, staff: staffId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add availability");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["staff-availability", staffId]);
      toast({
        title: "Availability added",
        description: "Staff availability has been added successfully.",
      });
      setIsAddingAvailability(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add availability",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add performance metric mutation
  const addPerformanceMetricMutation = useMutation({
    mutationFn: async (data: Partial<PerformanceMetric>) => {
      const response = await fetch(`${API_BASE}/staff/performance-metrics/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ ...data, staff: staffId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add performance metric");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["performance-metrics", staffId]);
      toast({
        title: "Performance metric added",
        description: "Staff performance metric has been added successfully.",
      });
      setIsAddingPerformance(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add performance metric",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start editing
  const handleStartEditing = () => {
    setFormData(profile || {});
    setIsEditing(true);
  };

  // Save profile changes
  const handleSaveProfile = () => {
    if (formData) {
      updateProfileMutation.mutate(formData);
    }
  };

  // Add availability
  const handleAddAvailability = () => {
    if (availabilityForm) {
      addAvailabilityMutation.mutate(availabilityForm);
    }
  };

  // Add performance metric
  const handleAddPerformanceMetric = () => {
    if (performanceForm) {
      addPerformanceMetricMutation.mutate(performanceForm);
    }
  };

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Loading staff profile...</p>
      </div>
    );
  }

  // Error state
  if (profileError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 text-lg mb-4">Failed to load staff profile</p>
        <Button onClick={() => refetchProfile()}>Retry</Button>
      </div>
    );
  }

  // Format day of week
  const formatDayOfWeek = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day % 7];
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                {profile?.profile_image ? (
                  <AvatarImage src={profile.profile_image} alt={`${profile.user.first_name} ${profile.user.last_name}`} />
                ) : (
                  <AvatarFallback className="text-lg">
                    {profile?.user.first_name?.[0]}{profile?.user.last_name?.[0]}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{profile?.user.first_name} {profile?.user.last_name}</h2>
                <p className="text-gray-500">{profile?.position || profile?.user.role}</p>
                <div className="flex items-center mt-1 space-x-2">
                  <Badge variant={profile?.user.is_active ? "default" : "secondary"}>
                    {profile?.user.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline">{profile?.department}</Badge>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handleStartEditing} disabled={isEditing}>
              <Edit className="h-4 w-4 mr-2" /> Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Staff Details</CardTitle>
              <CardDescription>View and manage staff information</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={formData.user?.first_name || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          user: { ...formData.user!, first_name: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={formData.user?.last_name || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          user: { ...formData.user!, last_name: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.user?.email || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          user: { ...formData.user!, email: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.user?.phone || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          user: { ...formData.user!, phone: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={formData.position || ""}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={formData.department || ""}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth || ""}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hire_date">Hire Date</Label>
                      <Input
                        id="hire_date"
                        type="date"
                        value={formData.hire_date || ""}
                        onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact">Emergency Contact</Label>
                      <Input
                        id="emergency_contact"
                        value={formData.emergency_contact || ""}
                        onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_phone">Emergency Phone</Label>
                      <Input
                        id="emergency_phone"
                        value={formData.emergency_phone || ""}
                        onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city || ""}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state || ""}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">Zip Code</Label>
                      <Input
                        id="zip_code"
                        value={formData.zip_code || ""}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country || ""}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-2" /> Cancel
                    </Button>
                    <Button onClick={handleSaveProfile}>
                      <Save className="h-4 w-4 mr-2" /> Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-y-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p>{profile?.user.first_name} {profile?.user.last_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p>{profile?.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p>{profile?.user.phone || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Date of Birth</p>
                        <p>{profile?.date_of_birth || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Hire Date</p>
                        <p>{profile?.hire_date || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Position</p>
                        <p>{profile?.position || "Not specified"}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Contact Information</h3>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Emergency Contact</p>
                        <p>{profile?.emergency_contact || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Emergency Phone</p>
                        <p>{profile?.emergency_phone || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Address</h3>
                    <p>{profile?.address || "Not provided"}</p>
                    <p>
                      {profile?.city && `${profile.city}, `}
                      {profile?.state && `${profile.state} `}
                      {profile?.zip_code && `${profile.zip_code}, `}
                      {profile?.country}
                    </p>
                  </div>
                  
                  {profile?.notes && (
                    <div className="border-t pt-4">
                      <h3 className="font-medium mb-2">Notes</h3>
                      <p className="text-gray-700">{profile.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Staff Availability</CardTitle>
                <CardDescription>Manage when this staff member is available to work</CardDescription>
              </div>
              <Button onClick={() => setIsAddingAvailability(true)}>Add Availability</Button>
            </CardHeader>
            <CardContent>
              {isLoadingAvailability ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : availability && availability.length > 0 ? (
                <div className="space-y-4">
                  {availability.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className={`p-4 ${item.is_available ? "bg-green-50" : "bg-red-50"} flex justify-between items-center`}>
                        <div>
                          <h3 className="font-medium">{formatDayOfWeek(item.day_of_week)}</h3>
                          <p className="text-sm text-gray-500">
                            {item.is_available 
                              ? `Available: ${item.start_time} - ${item.end_time}` 
                              : "Not Available"}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                      {item.notes && (
                        <div className="p-4 border-t">
                          <p className="text-sm">{item.notes}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No availability information has been added yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Availability Dialog */}
          <Dialog open={isAddingAvailability} onOpenChange={setIsAddingAvailability}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Availability</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="day_of_week">Day of Week</Label>
                  <Select
                    value={availabilityForm.day_of_week?.toString()}
                    onValueChange={(value) => setAvailabilityForm({ ...availabilityForm, day_of_week: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="is_available">Availability</Label>
                  <Select
                    value={availabilityForm.is_available ? "true" : "false"}
                    onValueChange={(value) => setAvailabilityForm({ ...availabilityForm, is_available: value === "true" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Available</SelectItem>
                      <SelectItem value="false">Not Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {availabilityForm.is_available && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_time">Start Time</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={availabilityForm.start_time}
                          onChange={(e) => setAvailabilityForm({ ...availabilityForm, start_time: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_time">End Time</Label>
                        <Input
                          id="end_time"
                          type="time"
                          value={availabilityForm.end_time}
                          onChange={(e) => setAvailabilityForm({ ...availabilityForm, end_time: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={availabilityForm.notes}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, notes: e.target.value })}
                    placeholder="Add any additional information about this availability"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingAvailability(false)}>Cancel</Button>
                <Button onClick={handleAddAvailability}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Track and manage staff performance</CardDescription>
              </div>
              <Button onClick={() => setIsAddingPerformance(true)}>Add Metric</Button>
            </CardHeader>
            <CardContent>
              {isLoadingMetrics ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : performanceMetrics && performanceMetrics.length > 0 ? (
                <div className="space-y-4">
                  {performanceMetrics.map((metric) => (
                    <Card key={metric.id} className="overflow-hidden">
                      <div className="p-4 flex justify-between items-center">
                        <div>
                          <div className="flex items-center">
                            <Badge className="mr-2">{metric.metric_type}</Badge>
                            <h3 className="font-medium">{metric.value}</h3>
                          </div>
                          <p className="text-sm text-gray-500">{metric.date}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                      {metric.notes && (
                        <div className="p-4 border-t">
                          <p className="text-sm">{metric.notes}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No performance metrics have been added yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Performance Metric Dialog */}
          <Dialog open={isAddingPerformance} onOpenChange={setIsAddingPerformance}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Performance Metric</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="metric_type">Metric Type</Label>
                  <Select
                    value={performanceForm.metric_type}
                    onValueChange={(value) => setPerformanceForm({ ...performanceForm, metric_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUCTIVITY">Productivity</SelectItem>
                      <SelectItem value="QUALITY">Quality</SelectItem>
                      <SelectItem value="ATTENDANCE">Attendance</SelectItem>
                      <SelectItem value="CUSTOMER_SATISFACTION">Customer Satisfaction</SelectItem>
                      <SelectItem value="TEAMWORK">Teamwork</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    max="100"
                    value={performanceForm.value?.toString()}
                    onChange={(e) => setPerformanceForm({ ...performanceForm, value: parseFloat(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={performanceForm.date}
                    onChange={(e) => setPerformanceForm({ ...performanceForm, date: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={performanceForm.notes}
                    onChange={(e) => setPerformanceForm({ ...performanceForm, notes: e.target.value })}
                    placeholder="Add any additional information about this metric"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingPerformance(false)}>Cancel</Button>
                <Button onClick={handleAddPerformanceMetric}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Manage staff documents and certifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Document management feature coming soon.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffProfileView;