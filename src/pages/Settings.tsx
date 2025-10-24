import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe,
  Users,
  Mail,
  UserPlus,
  Clock,
  Calendar,
  Bell,
  CreditCard,
  Settings as SettingsIcon,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import MenuScanner from "@/components/MenuScanner";
import POSIntegration from "@/components/POSIntegration";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { StaffInvitation, User } from "../types/staff"; // Use type import for interfaces
import axios from "axios";
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [radius, setRadius] = useState<number>(0);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");
  const [restaurantPhone, setRestaurantPhone] = useState("");
  const [restaurantEmail, setRestaurantEmail] = useState("");
  const [timezone, setTimezone] = useState("America/New_York"); // Default value
  const [currency, setCurrency] = useState("USD"); // Default value
  const [language, setLanguage] = useState("en"); // Default value

  const [operatingHours, setOperatingHours] = useState<{
    [key: string]: { open: string; close: string; isClosed: boolean };
  }>(
    {
      Monday: { open: "09:00", close: "17:00", isClosed: false },
      Tuesday: { open: "09:00", close: "17:00", isClosed: false },
      Wednesday: { open: "09:00", close: "17:00", isClosed: false },
      Thursday: { open: "09:00", close: "17:00", isClosed: false },
      Friday: { open: "09:00", close: "17:00", isClosed: false },
      Saturday: { open: "10:00", close: "14:00", isClosed: true },
      Sunday: { open: "10:00", close: "14:00", isClosed: true },
    }
  );
  const [automaticClockOut, setAutomaticClockOut] = useState(false);
  const [breakDuration, setBreakDuration] = useState(30);

  const [emailNotifications, setEmailNotifications] = useState({
    lowInventory: true,
    scheduling: true,
    revenue: false,
    aiInsights: true,
  });
  const [pushNotifications, setPushNotifications] = useState({
    lowInventory: true,
    scheduling: true,
    revenue: false,
    aiInsights: true,
  });

  // State for Invite Staff form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState("STAFF"); // Default role

  const [pendingInvitations, setPendingInvitations] = useState<StaffInvitation[]>([]); // New state for pending invitations
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  const apiClient = axios.create({
    baseURL: 'http://localhost:8000/api', // Or your backend API URL
    headers: {
      'Content-Type': 'application/json',
    },
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(storedUser));
    } else {
      navigate('/auth');
    }

    const fetchSettings = async () => {
      try {
        const response = await apiClient.get("/accounts/restaurant/location/");
        const data = response.data;
        setLatitude(data.latitude || 0);
        setLongitude(data.longitude || 0);
        setRadius(data.radius || 0);
        setRestaurantName(data.name || "");
        setRestaurantAddress(data.address || "");
        setRestaurantPhone(data.phone || "");
        setRestaurantEmail(data.email || "");
        setTimezone(data.timezone || "America/New_York");
        setCurrency(data.currency || "USD");
        setLanguage(data.language || "en");
        setOperatingHours(data.operating_hours || operatingHours);
        setAutomaticClockOut(data.automatic_clock_out || false);
        setBreakDuration(data.break_duration || 30);
        setEmailNotifications(data.email_notifications || emailNotifications);
        setPushNotifications(data.push_notifications || pushNotifications);
      } catch (error) {
        console.error("Failed to fetch restaurant settings:", error);
        toast.error("Failed to load restaurant settings.");
      }

      try {
        const response = await apiClient.get(
          "/accounts/staff/pending-invitations/"
        );
        const invitations = response.data;
        setPendingInvitations(invitations);
      } catch (error) {
        console.error("Error fetching pending invitations:", error);
        toast.error("Failed to load pending invitations.");
      }
    };
    fetchSettings();
  }, [navigate]);

  const saveGeneralSettings = async () => {
    try {
      const response = await apiClient.put(
        "/accounts/restaurant/update-location/", // This endpoint now handles general restaurant info as well
        {
          latitude,
          longitude,
          radius,
          name: restaurantName,
          address: restaurantAddress,
          phone: restaurantPhone,
          email: restaurantEmail,
          timezone, // Add timezone
          currency, // Add currency
          language, // Add language
          operating_hours: operatingHours, // Add operating hours
          automatic_clock_out: automaticClockOut, // Add automatic clock-out
          break_duration: breakDuration, // Add break duration
          email_notifications: emailNotifications, // Add email notification preferences
          push_notifications: pushNotifications, // Add push notification preferences
        }
      );
      if (response.status === 200) {
        toast.success("General settings saved successfully!");
      } else {
        const errorData = response.data;
        toast.error(`Failed to save settings: ${errorData.detail || errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error saving general settings:", error);
      toast.error("Failed to save general settings.");
    }
  };

  const handleOperatingHoursChange = (day: string, field: string, value: string | boolean) => {
    setOperatingHours((prevHours) => ({
      ...prevHours,
      [day]: { ...prevHours[day], [field]: value },
    }));
  };

  const handleNotificationChange = (type: "email" | "push", field: string, value: boolean) => {
    if (type === "email") {
      setEmailNotifications((prev) => ({ ...prev, [field]: value }));
    } else {
      setPushNotifications((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleInviteStaff = async () => {
    if (!inviteEmail || !inviteFirstName || !inviteLastName || !inviteRole) {
      toast.error("Please fill in all staff invitation fields.");
      return;
    }

    try {
      const response = await apiClient.post(
        "/accounts/staff/invite/",
        {
          email: inviteEmail,
          first_name: inviteFirstName,
          last_name: inviteLastName,
          role: inviteRole,
        }
      );

      if (response.status === 201) { // Assuming 201 Created for successful invitation
        toast.success("Staff invitation sent successfully!");
        // Clear form
        setInviteEmail("");
        setInviteFirstName("");
        setInviteLastName("");
        setInviteRole("STAFF");
        // Refresh pending invitations
        const updatedInvitationsResponse = await apiClient.get(
          "/accounts/staff/pending-invitations/"
        );
        const updatedInvitations = updatedInvitationsResponse.data;
        setPendingInvitations(updatedInvitations);

      } else {
        const errorData = response.data;
        toast.error(`Failed to send invitation: ${errorData.detail || errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error inviting staff:", error);
      toast.error("Failed to send staff invitation.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="location">Location & Tables</TabsTrigger>
          <TabsTrigger value="menu">Menu Management</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>Manage your restaurant's basic details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="restaurant-name">Restaurant Name</Label>
                  <Input
                    id="restaurant-name"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={restaurantAddress}
                    onChange={(e) => setRestaurantAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={restaurantPhone}
                    onChange={(e) => setRestaurantPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={restaurantEmail}
                    onChange={(e) => setRestaurantEmail(e.target.value)}
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Time & Language</h4>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      className="w-full p-2 border rounded-lg mt-1"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      aria-label="Timezone"
                    >
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Chicago">America/Chicago</option>
                      <option value="America/Denver">America/Denver</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      className="w-full p-2 border rounded-lg mt-1"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      aria-label="Currency"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      className="w-full p-2 border rounded-lg mt-1"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      aria-label="Language"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">AI Preferences</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-generate purchase lists</Label>
                        <p className="text-xs text-muted-foreground">AI creates daily purchase recommendations</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Smart scheduling</Label>
                        <p className="text-xs text-muted-foreground">AI optimizes staff schedules</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
              {/* Geolocation Settings */}
              <Card className="shadow-soft border-0 shadow-none p-0">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center text-lg">
                    <Globe className="w-5 h-5 mr-2" />
                    Geolocation Settings
                  </CardTitle>
                  <CardDescription>Set the restaurant's location for staff clock-in</CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e) => setLatitude(parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e) => setLongitude(parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="radius">Radius (meters)</Label>
                    <Input
                      id="radius"
                      type="number"
                      value={radius}
                      onChange={(e) => setRadius(parseFloat(e.target.value))}
                    />
                  </div>
                </CardContent>
              </Card>
              <Button onClick={saveGeneralSettings} className="w-full">Save General Settings</Button>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>Set your restaurant's daily operating hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(operatingHours).map((day) => (
                <div key={day} className="flex items-center justify-between">
                  <Label htmlFor={day.toLowerCase()}>{day}</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id={`${day.toLowerCase()}-open`}
                      type="time"
                      value={operatingHours[day].open}
                      onChange={(e) =>
                        handleOperatingHoursChange(day, "open", e.target.value)
                      }
                      className="w-24"
                      disabled={operatingHours[day].isClosed}
                    />
                    <span>-</span>
                    <Input
                      id={`${day.toLowerCase()}-close`}
                      type="time"
                      value={operatingHours[day].close}
                      onChange={(e) =>
                        handleOperatingHoursChange(day, "close", e.target.value)
                      }
                      className="w-24"
                      disabled={operatingHours[day].isClosed}
                    />
                    <Switch
                      checked={!operatingHours[day].isClosed}
                      onCheckedChange={(checked) =>
                        handleOperatingHoursChange(day, "isClosed", !checked)
                      }
                    />
                    <Label className="w-16 text-right">
                      {operatingHours[day].isClosed ? "Closed" : "Open"}
                    </Label>
                  </div>
                </div>
              ))}
              <Button onClick={saveGeneralSettings} className="w-full">Save Business Hours</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Manage your staff and their roles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Clock-out</Label>
                  <p className="text-xs text-muted-foreground">Automatically clock out staff at the end of their scheduled shift.</p>
                </div>
                <Switch
                  checked={automaticClockOut}
                  onCheckedChange={setAutomaticClockOut}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="break-duration">Default Break Duration (minutes)</Label>
                <Input
                  id="break-duration"
                  type="number"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                />
              </div>
              <Button onClick={saveGeneralSettings} className="w-full">Save Staff Settings</Button>
              <Separator />
              {/* Existing invite button, will keep for now but may be replaced by the form below */}
              <Button className="w-full" variant="outline">
                Invite Team Member
              </Button>
            </CardContent>
          </Card>

          {/* Invite Staff */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Invite Staff</CardTitle>
              <CardDescription>Send an invitation to a new staff member</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invite-firstname">First Name</Label>
                  <Input
                    id="invite-firstname"
                    type="text"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="invite-lastname">Last Name</Label>
                  <Input
                    id="invite-lastname"
                    type="text"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  className="w-full p-2 border rounded mt-1"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  aria-label="Invite Staff Role"
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <Button onClick={handleInviteStaff} className="w-full">
                Send Invitation
              </Button>
            </CardContent>
          </Card>

          {/* Pending Staff Invitations */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>{pendingInvitations.length} pending staff invitations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingInvitations.length > 0 ? (
                pendingInvitations.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border">
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">({invite.role.toLowerCase()})</p>
                      <p className="text-xs text-muted-foreground">Expires: {new Date(invite.expires_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className="ml-2">Pending</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No pending invitations.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Password Change</CardTitle>
              <CardDescription>Change your account password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <Button className="w-full">Change Password</Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Enable two-factor authentication for enhanced security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground">Secure your account with two-factor authentication.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div>
                <Label htmlFor="two-factor-code">Authentication Code</Label>
                <Input id="two-factor-code" placeholder="Enter your authentication code" />
              </div>
              <Button className="w-full">Enable Two-Factor Authentication</Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>Manage active sessions and device access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Sessions</Label>
                  <p className="text-xs text-muted-foreground">View and manage your active sessions across devices.</p>
                </div>
                <Button variant="outline">View Sessions</Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Device Access</Label>
                  <p className="text-xs text-muted-foreground">Control which devices can access your account.</p>
                </div>
                <Button variant="outline">Manage Devices</Button>
              </div>
              <Button className="w-full" variant="outline">
                Log Out All Sessions
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API keys for programmatic access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>API Keys</Label>
                  <p className="text-xs text-muted-foreground">View and manage your API keys.</p>
                </div>
                <Button variant="outline">View API Keys</Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>API Key Permissions</Label>
                  <p className="text-xs text-muted-foreground">Control which API endpoints your keys can access.</p>
                </div>
                <Button variant="outline">Manage Permissions</Button>
              </div>
              <Button className="w-full" variant="outline">
                Create New API Key
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Restaurant Layout Management</CardTitle>
              <CardDescription>Manage your restaurant's floor plan and table configurations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full">Manage Floor Plans</Button>
              <Button className="w-full">Configure Tables</Button>
              <Button className="w-full">Setup Floor Plan</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Menu Categories</CardTitle>
              <CardDescription>Organize your menu items into categories.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full">Manage Categories</Button>
              <Button className="w-full">Add New Category</Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Pricing Rules</CardTitle>
              <CardDescription>Define special pricing rules and discounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full">Manage Pricing Rules</Button>
              <Button className="w-full">Create New Rule</Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Tax Configurations</CardTitle>
              <CardDescription>Set up taxes for different menu items or categories.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full">Manage Tax Settings</Button>
              <Button className="w-full">Add New Tax Rule</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect with third-party services.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <MenuScanner />
              <POSIntegration />
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Payment Gateway Settings</CardTitle>
              <CardDescription>Configure your payment gateway integrations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full">Manage Payment Gateways</Button>
              <Button className="w-full">Add New Gateway</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure email alerts for various events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="low-inventory-email">Low Inventory Alerts</Label>
                  <Switch
                    id="low-inventory-email"
                    checked={emailNotifications.lowInventory}
                    onCheckedChange={(checked) => handleNotificationChange("email", "lowInventory", checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduling-email">Scheduling Alerts</Label>
                  <Switch
                    id="scheduling-email"
                    checked={emailNotifications.scheduling}
                    onCheckedChange={(checked) => handleNotificationChange("email", "scheduling", checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="revenue-email">Revenue Alerts</Label>
                  <Switch
                    id="revenue-email"
                    checked={emailNotifications.revenue}
                    onCheckedChange={(checked) => handleNotificationChange("email", "revenue", checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="ai-insights-email">AI Insights</Label>
                  <Switch
                    id="ai-insights-email"
                    checked={emailNotifications.aiInsights}
                    onCheckedChange={(checked) => handleNotificationChange("email", "aiInsights", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>Configure push alerts for various events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="low-inventory-push">Low Inventory Alerts</Label>
                  <Switch
                    id="low-inventory-push"
                    checked={pushNotifications.lowInventory}
                    onCheckedChange={(checked) => handleNotificationChange("push", "lowInventory", checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduling-push">Scheduling Alerts</Label>
                  <Switch
                    id="scheduling-push"
                    checked={pushNotifications.scheduling}
                    onCheckedChange={(checked) => handleNotificationChange("push", "scheduling", checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="revenue-push">Revenue Alerts</Label>
                  <Switch
                    id="revenue-push"
                    checked={pushNotifications.revenue}
                    onCheckedChange={(checked) => handleNotificationChange("push", "revenue", checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="ai-insights-push">AI Insights</Label>
                  <Switch
                    id="ai-insights-push"
                    checked={pushNotifications.aiInsights}
                    onCheckedChange={(checked) => handleNotificationChange("push", "aiInsights", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>Manage your subscription and payment methods.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Current Plan</h4>
                  <p className="text-sm text-muted-foreground">Pro Plan - $29/month</p>
                </div>
                <Button variant="outline">Change Plan</Button>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Next billing date: <strong>November 22, 2025</strong></p>
                <p>Amount: <strong>$29.00</strong></p>
                <p>Payment method: Visa ending in 4242</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold">Payment Method</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-6 h-6 text-muted-foreground" />
                    <p className="text-sm">Visa ending in 4242</p>
                  </div>
                  <Button variant="outline">Update</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Deletion (Danger Zone) */}
          <Card className="shadow-soft border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Permanently delete your account and all associated data. This action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full">Delete Account</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}