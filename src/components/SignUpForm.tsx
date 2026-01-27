import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User, Mail, Lock, Building2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface SignUpFormProps {
  onNavigateToLogin: () => void;
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

export const SignUpForm: React.FC<SignUpFormProps> = ({ onNavigateToLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const handleOwnerSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!termsAccepted) {
      setError("You must accept the Terms of Service and Privacy Policy");
      setIsLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const businessName = formData.get("businessName") as string;
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Split full name into first and last
    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "User";

    const signupData: SignupData = {
      user: {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      },
      restaurant: {
        name: businessName,
        address: "",
        phone: "",
        email: email,
      },
    };

    try {
      await auth.ownerSignup(signupData);

      toast({
        title: "Welcome to Mizan AI!",
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

  return (
    <div className="w-full space-y-6">
      {error && (
        <Alert
          variant="destructive"
          className="bg-red-500/10 border-red-500/30 rounded-lg"
        >
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2 mb-6">
        <h2 className="text-2xl font-bold text-white">Create Account</h2>
        <p className="text-sm text-[#B0BEC5]">Sign up as a Manager or Owner</p>
      </div>

      <form onSubmit={handleOwnerSignUp} className="space-y-4">
        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="businessName" className="text-white text-sm">
            Restaurant Name
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#00E676]/60" />
            <Input
              id="businessName"
              name="businessName"
              placeholder="Your Restaurant Name"
              required
              className="pl-9 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] text-sm"
            />
          </div>
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-white text-sm">
            Owner's Full Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#00E676]/60" />
            <Input
              id="fullName"
              name="fullName"
              placeholder="John Doe"
              required
              className="pl-9 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] text-sm"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-white text-sm">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#00E676]/60" />
            <Input
              id="signup-email"
              name="email"
              type="email"
              placeholder="owner@restaurant.com"
              required
              className="pl-9 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] text-sm"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="signup-password" className="text-white text-sm">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#00E676]/60" />
            <Input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={6}
              className="pl-9 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] text-sm"
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-white text-sm">
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#00E676]/60" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="pl-9 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] text-sm"
            />
          </div>
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start space-x-3 py-2">
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 bg-[#0A0D10] border-white/10 rounded cursor-pointer accent-[#00E676]"
          />
          <label htmlFor="terms" className="text-xs text-[#B0BEC5] cursor-pointer">
            I agree to the{" "}
            <a href="#" className="text-[#00E676] hover:text-[#00C853] transition-colors">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-[#00E676] hover:text-[#00C853] transition-colors">
              Privacy Policy
            </a>
          </label>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#00E676] hover:bg-[#00C853] text-white font-semibold h-11 rounded-lg shadow-lg hover:shadow-[#00E676]/50 transition-all mt-4"
          disabled={isLoading || !termsAccepted}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[#00E676]/25" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#0A0D10]/40 px-3 py-1 text-[#B0BEC5] rounded-full border border-white/10 backdrop-blur-sm">
            Already have an account?
          </span>
        </div>
      </div>

      <Button
        onClick={onNavigateToLogin}
        className="w-full border border-[#00E676]/30 text-[#00E676] hover:bg-[#00E676]/10 hover:text-[#00C853] font-semibold h-11 bg-transparent"
      >
        Sign In
      </Button>
    </div>
  );
};