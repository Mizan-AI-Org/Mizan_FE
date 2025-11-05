import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Star,
  TrendingUp,
  DollarSign,
  Edit,
  Image,
  BarChart3,
  Users
} from "lucide-react";

export default function MenuManagement() {
  return (
    <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Coming Soon Banner */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/50 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-green-600" />
                  Menu Management System
                </CardTitle>
                <CardDescription className="mt-1">
                  Coming Soon - Intelligent menu creation and optimization
                </CardDescription>
              </div>
              <Badge variant="secondary" className="w-fit bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                🚀 Coming Soon
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
          </CardContent>
        </Card>

        </div>
      </div>
  );
}