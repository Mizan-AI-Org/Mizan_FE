import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { AuthForm } from "../components/AuthForm";
import { SignUpForm } from "../components/SignUpForm";
import { RestaurantShowcase } from "../components/RestaurantShowcase";

const Auth = () => {
  const [currentPage, setCurrentPage] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const auth = useAuth();

  // Check if this is an invitation link
  const isInvitationLink = () => {
    return new URLSearchParams(window.location.search).has("token");
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
      await auth.acceptInvitation(token, firstName, lastName, password, null);

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

  // If it's an invitation link, show the invitation acceptance form
  if (isInvitationLink()) {
    return (
      <div className="min-h-screen bg-[#0A0D10] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Premium dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#070A0E] via-[#0B1220] to-[#070A0E]" />

        {/* Soft brand glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 900px 700px at 50% 10%, rgba(0, 230, 118, 0.12), transparent 65%)",
          }}
        />

        {/* Warm accent layer */}
        <div
          className="absolute inset-0 opacity-6 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 215, 0, 0.18) 0%, transparent 42%, rgba(184, 134, 11, 0.10) 100%)",
          }}
        />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] pointer-events-none" />

        {/* Ambient orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#00E676] rounded-full mix-blend-screen opacity-6 blur-3xl animate-pulse" />
        <div
          className="absolute top-1/3 -left-64 w-96 h-96 bg-[#D4AF37] rounded-full mix-blend-screen opacity-3 blur-3xl"
          style={{ animation: "float 8s ease-in-out infinite" }}
        />

        <div className="relative z-10 w-full max-w-md">
          {/* Logo/Brand Area */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-[#00E676] shadow-[0_18px_45px_rgba(0,230,118,0.25)]">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-[#00E676] rounded-full" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Mizan AI</h1>
            <p className="text-[#B0BEC5]">Join Your Team</p>
          </div>

          {/* Elegant Form Card */}
          <div className="relative group">
            {/* Gradient Border Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37] via-[#00E676] to-[#00E676]/30 rounded-xl opacity-0 group-hover:opacity-30 blur transition duration-1000 pointer-events-none" />

            {/* Form Card */}
            <div className="relative bg-white/5 border border-white/10 rounded-xl shadow-2xl p-8 backdrop-blur-xl hover:shadow-[0_0_30px_rgba(0,230,118,0.12)] transition-all duration-500">
              {/* Top accent line */}
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleAcceptInvitation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-white">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    required
                    className="bg-[#0A0D10]/60 border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-white">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    required
                    className="bg-[#0A0D10]/60 border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    className="bg-[#0A0D10]/60 border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5]"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#00E676] hover:bg-[#00C853] text-white font-semibold h-11 rounded-lg shadow-lg hover:shadow-[#00E676]/50 transition-all"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isLoading ? "Completing Setup..." : "Complete Setup"}
                </Button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-[#B0BEC5]">
            <p>
              By continuing, you agree to our{" "}
              <a
                href="#"
                className="text-[#00E676] hover:text-[#00C853] transition-colors"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-[#00E676] hover:text-[#00C853] transition-colors"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Auth Page with split layout
  return (
    <div className="min-h-screen bg-[#0A0D10] flex">
      {/* Left Side - Auth Forms */}
      <div className="w-full lg:w-1/2 relative overflow-hidden">
        {/* Premium dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#070A0E] via-[#0B1220] to-[#070A0E]" />

        {/* Soft brand glow from top right */}
        <div
          className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 900px 700px at 60% -20%, rgba(0, 230, 118, 0.12), transparent 65%)",
          }}
        />

        {/* Warm accent layer */}
        <div
          className="absolute inset-0 opacity-6 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 215, 0, 0.18) 0%, transparent 42%, rgba(184, 134, 11, 0.10) 100%)",
          }}
        />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />

        {/* Ambient orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#00E676] rounded-full mix-blend-screen opacity-6 blur-3xl animate-pulse" />
        <div
          className="absolute top-1/3 -left-64 w-96 h-96 bg-[#D4AF37] rounded-full mix-blend-screen opacity-3 blur-3xl"
          style={{ animation: "float 8s ease-in-out infinite" }}
        />

        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-30" />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4 lg:p-8">
          <div className="w-full max-w-md">
            {/* Logo/Brand Area */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-[#00E676] shadow-[0_18px_45px_rgba(0,230,118,0.25)]">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-[#00E676] rounded-full" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Mizan AI</h1>
              <p className="text-[#B0BEC5]">
                Your Restaurant Operations on Auto Pilot
              </p>
            </div>

            {/* Elegant Form Card with Premium Styling */}
            <div className="relative group">
              {/* Gradient Border Effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37] via-[#00E676] to-[#00E676]/30 rounded-xl opacity-0 group-hover:opacity-30 blur transition duration-1000 pointer-events-none" />

              {/* Form Card */}
              <div className="relative bg-white/5 border border-white/10 rounded-xl shadow-2xl p-8 backdrop-blur-xl hover:shadow-[0_0_30px_rgba(0,230,118,0.12)] transition-all duration-500">
                {/* Top accent line */}
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />

                {/* Conditionally render login or signup form */}
                {currentPage === "login" ? (
                  <AuthForm
                    onNavigateToSignup={() => setCurrentPage("signup")}
                  />
                ) : (
                  <SignUpForm
                    onNavigateToLogin={() => setCurrentPage("login")}
                  />
                )}
              </div>
            </div>

            {/* Footer - only show on login page */}
            {currentPage === "login" && (
              <div className="mt-8 text-center text-sm text-[#B0BEC5]">
                <p>
                  By continuing, you agree to our{" "}
                  <a
                    href="#"
                    className="text-[#00E676] hover:text-[#00C853] transition-colors"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="text-[#00E676] hover:text-[#00C853] transition-colors"
                  >
                    Privacy Policy
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Restaurant Showcase */}
      <RestaurantShowcase />
    </div>
  );
};

export default Auth;
