import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

const Unauthorized: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader>
          <div className="flex justify-center mb-3">
            <BrandLogo size="sm" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Platform Admin (<code className="text-xs">/admin</code>) is only for
            dedicated Mizan operators. Restaurant SUPER_ADMIN or OWNER accounts
            cannot access it — even if they have Django staff privileges. Ask a
            platform superuser to add you under <strong>Operators</strong>.
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="secondary">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
