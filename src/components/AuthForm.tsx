import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mail, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface AuthFormProps {
  onNavigateToSignup: () => void;
}

type UserType = "staff" | "manager";

export const AuthForm: React.FC<AuthFormProps> = ({ onNavigateToSignup }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userType, setUserType] = useState<UserType>("manager");
  const [pinInput, setPinInput] = useState("");
  const { toast } = useToast();
  const auth = useAuth();

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
    setPinInput(value);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const credential = userType === "staff" ? pinInput : (formData.get("credential") as string);

    // Validate PIN for staff users
    if (userType === "staff") {
      if (!/^\d{4}$/.test(credential)) {
        setError("PIN must be exactly 4 digits");
        setIsLoading(false);
        return;
      }
    }

    try {
      // Always use password field for API, but accept PIN from staff
      await auth.login(email, credential);

      toast({
        title: `Welcome back, ${auth.user?.first_name}!`,
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

  return (
    <div className="w-full space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 rounded-lg">
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}

      {/* Elegant User Type Toggle with Premium Styling */}
      <div className="flex gap-2 bg-[#0A0D10]/50 rounded-lg p-1 border border-[#00E676]/10 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => {
            setUserType("staff");
            setPinInput("");
          }}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all text-sm duration-300 ${
            userType === "staff"
              ? "bg-gradient-to-r from-[#00E676] to-[#00C853] text-white shadow-lg shadow-[#00E676]/20"
              : "text-[#B0BEC5] hover:text-[#00E676] hover:bg-[#00E676]/5"
          }`}
        >
          Staff
        </button>
        <button
          type="button"
          onClick={() => {
            setUserType("manager");
            setPinInput("");
          }}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all text-sm duration-300 ${
            userType === "manager"
              ? "bg-gradient-to-r from-[#00E676] to-[#00C853] text-white shadow-lg shadow-[#00E676]/20"
              : "text-[#B0BEC5] hover:text-[#00E676] hover:bg-[#00E676]/5"
          }`}
        >
          Manager/Owner
        </button>
      </div>

      <form onSubmit={handleSignIn} className="space-y-5">
        {/* Email Field with Premium Styling */}
        <div className="space-y-2">
          <Label htmlFor="signin-email" className="text-white font-semibold text-sm tracking-wider">
            Email Address
          </Label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#00E676]/60 group-focus-within:text-[#00E676] transition-colors" />
            <Input
              id="signin-email"
              name="email"
              type="email"
              placeholder="manager@restaurant.com"
              required
              className="pl-10 bg-[#0A0D10]/50 border border-[#00E676]/20 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] rounded-lg transition-all duration-300 focus:shadow-[0_0_15px_rgba(0,230,118,0.2)] backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Credential Field (PIN/Password) with Premium Styling */}
        <div className="space-y-2">
          <Label htmlFor="signin-credential" className="text-white font-semibold text-sm tracking-wider">
            {userType === "staff" ? "PIN" : "Password"}
          </Label>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#00E676]/60 group-focus-within:text-[#00E676] transition-colors" />
            {userType === "staff" ? (
              <Input
                id="signin-credential"
                type="text"
                placeholder="0000"
                required
                value={pinInput}
                onChange={handlePinChange}
                inputMode="numeric"
                maxLength={4}
                className="pl-10 bg-[#0A0D10]/50 border border-[#00E676]/20 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] rounded-lg transition-all duration-300 focus:shadow-[0_0_15px_rgba(0,230,118,0.2)] backdrop-blur-sm"
              />
            ) : (
              <Input
                id="signin-credential"
                name="credential"
                type="password"
                placeholder="••••••••"
                required
                className="pl-10 bg-[#0A0D10]/50 border border-[#00E676]/20 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] rounded-lg transition-all duration-300 focus:shadow-[0_0_15px_rgba(0,230,118,0.2)] backdrop-blur-sm"
              />
            )}
          </div>
          {userType === "staff" && (
            <p className="text-xs text-[#B0BEC5] font-medium">Enter your 4-digit PIN for secure access</p>
          )}
        </div>

        {/* Premium Sign In Button */}
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00F77B] hover:to-[#00D96B] text-white font-semibold h-11 rounded-lg shadow-lg hover:shadow-[0_0_25px_rgba(0,230,118,0.4)] transition-all duration-300 border border-[#00E676]/30 mt-2"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      {/* Elegant Divider and Footer Section */}
      <div className="text-center space-y-4 text-sm pt-2">
        <p>
          <a href="#" className="text-[#00E676] hover:text-[#00F77B] transition-colors font-medium underline-offset-2 hover:underline">
            Forgot PIN?
          </a>
        </p>
        
        {/* Premium Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gradient-to-r from-transparent via-[#00E676]/20 to-transparent" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gradient-to-br from-[#121A22] to-[#0f1419] px-3 text-[#B0BEC5] font-medium text-xs tracking-wide">
              New to Mizan?
            </span>
          </div>
        </div>
      </div>

      {/* Premium Signup Button */}
      <Button
        onClick={onNavigateToSignup}
        className="w-full border-2 border-[#00E676]/50 text-[#00E676] hover:bg-[#00E676]/10 hover:text-[#00F77B] hover:border-[#00E676] font-semibold h-11 bg-transparent backdrop-blur-sm transition-all duration-300 mt-2"
      >
        Create Restaurant Account
      </Button>
    </div>
  );
};