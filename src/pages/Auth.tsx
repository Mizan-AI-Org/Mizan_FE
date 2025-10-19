import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ChefHat } from "lucide-react";
import { useAuth } from "../hooks/use-auth";

// API base URL - adjust based on your environment
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

interface LoginResponse {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    restaurant: string;
    restaurant_data?: {
      id: string;
      name: string;
      address: string;
    };
  };
  tokens: {
    access: string;
    refresh: string;
  };
}

interface SignupData {
  user: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  restaurant: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate(); // This navigate will be used only for invitation link check
  const { toast } = useToast();
  const auth = useAuth();

  // Handle restaurant owner signup
  const handleOwnerSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const restaurantName = formData.get("restaurantName") as string;
    const restaurantAddress = formData.get("restaurantAddress") as string;
    const restaurantPhone = formData.get("restaurantPhone") as string;

    const signupData: SignupData = {
      user: {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone: restaurantPhone,
      },
      restaurant: {
        name: restaurantName,
        address: restaurantAddress,
        phone: restaurantPhone,
        email: email,
      },
    };

    try {
      await auth.ownerSignup(signupData);

      toast({
        title: "Welcome to Mizan!",
        description: "Your restaurant account has been created successfully.",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred during signup.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login for all user types (owner, admin, staff)
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await auth.login(email, password);

      toast({
        title: `Welcome back, ${auth.user?.first_name}!`, // Access user from auth context
        description: "You've been signed in successfully.",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred during login.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle invitation acceptance (for staff members)
  const handleAcceptInvitation = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const token = new URLSearchParams(window.location.search).get("token");
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const password = formData.get("password") as string;

    if (!token) {
      setError("Invalid invitation link");
      setIsLoading(false);
      return;
    }

    try {
      await auth.acceptInvitation(token, {
        first_name: firstName,
        last_name: lastName,
        password: password,
      });

      toast({
        title: "Welcome to the team!",
        description: "Your staff account has been created successfully.",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check if this is an invitation link
  const isInvitationLink = () => {
    return new URLSearchParams(window.location.search).has("token");
  };

  // If it's an invitation link, show the invitation acceptance form
  if (isInvitationLink()) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-strong">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-primary rounded-full">
                <ChefHat className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Join Your Team
            </CardTitle>
            <CardDescription>Complete your staff account setup</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAcceptInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-strong">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-primary rounded-full">
              <ChefHat className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Mizan
          </CardTitle>
          <CardDescription>
            Your Restaurant Operations on Autopilot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="manager@restaurant.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleOwnerSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurantName">Restaurant Name</Label>
                  <Input
                    id="restaurantName"
                    name="restaurantName"
                    placeholder="John's Bistro"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurantAddress">Restaurant Address</Label>
                  <Input
                    id="restaurantAddress"
                    name="restaurantAddress"
                    placeholder="123 Main Street, City, State"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurantPhone">Restaurant Phone</Label>
                  <Input
                    id="restaurantPhone"
                    name="restaurantPhone"
                    placeholder="+1234567890"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="owner@restaurant.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Restaurant Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  For staff members
                </span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Staff members should use the invitation link sent to their email
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
