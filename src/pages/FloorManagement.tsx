import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  Users,
  Clock,
  CheckCircle,
  MapPin,
  Calendar,
  BarChart3,
  Settings
} from "lucide-react";

const upcomingFeatures = [
  {
    title: "Interactive Floor Designer",
    description: "Drag-and-drop table layout creation and management",
    icon: LayoutGrid,
    status: "planned"
  },
  {
    title: "Smart Table Assignment",
    description: "AI-powered table allocation based on party size and preferences",
    icon: Users,
    status: "planned"
  },
  {
    title: "Real-time Occupancy Tracking",
    description: "Live table status monitoring and wait time optimization",
    icon: Clock,
    status: "planned"
  },
  {
    title: "Seating Analytics",
    description: "Track table utilization and optimize floor layout efficiency",
    icon: BarChart3,
    status: "planned"
  }
];


export default function FloorManagement() {
  return (
    <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Coming Soon Banner */}
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-200/50 dark:border-indigo-800/50 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <LayoutGrid className="w-6 h-6 text-indigo-600" />
                  Floor Management System
                </CardTitle>
                <CardDescription className="mt-1">
                  Coming Soon - Intelligent table layout and seating optimization
                </CardDescription>
              </div>
              <Badge variant="secondary" className="w-fit bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400">
                🚀 Coming Soon
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm sm:text-base leading-relaxed">
              <strong>Revolutionary Floor Management:</strong> Our AI-powered table management system will transform
              how you organize your restaurant floor, optimize seating efficiency, and enhance customer experience.
              Get ready for smart table assignment, real-time occupancy tracking, and comprehensive floor analytics!
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {upcomingFeatures.map((feature) => (
            <Card key={feature.title} className="shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <feature.icon className="w-5 h-5 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs">
                    Planned
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </div>
  );
}