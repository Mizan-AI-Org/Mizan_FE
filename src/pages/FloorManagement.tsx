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

const sampleTables = [
  { table: "Table 1", capacity: "2 guests", status: "occupied", time: "45 min" },
  { table: "Table 3", capacity: "4 guests", status: "available", time: "Ready" },
  { table: "Table 5", capacity: "6 guests", status: "reserved", time: "7:30 PM" },
  { table: "Table 7", capacity: "2 guests", status: "cleaning", time: "5 min" }
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

        {/* Sample Table Status */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              Sample Table Status
            </CardTitle>
            <CardDescription>Preview of table management interface</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sampleTables.map((table, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {table.status === "available" ? (
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                  ) : table.status === "occupied" ? (
                    <Users className="w-4 h-4 text-warning flex-shrink-0" />
                  ) : table.status === "reserved" ? (
                    <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{table.table}</p>
                    <p className="text-xs text-muted-foreground">{table.capacity}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={table.status === "available" ? "default" : table.status === "occupied" ? "secondary" : table.status === "reserved" ? "outline" : "destructive"}
                    className="flex-shrink-0"
                  >
                    {table.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{table.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Future Quick Actions</CardTitle>
            <CardDescription>Planned floor management features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button className="h-16 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-soft hover:shadow-strong transition-all duration-300" disabled>
                <div className="text-center">
                  <div className="font-semibold">Design Floor Layout</div>
                </div>
              </Button>
              <Button variant="outline" className="h-16 border-2 hover:bg-secondary/50 transition-all duration-300" disabled>
                <div className="text-center">
                  <div className="font-semibold">Assign Table</div>
                </div>
              </Button>
              <Button variant="outline" className="h-16 border-2 hover:bg-secondary/50 transition-all duration-300 sm:col-span-2 lg:col-span-1" disabled>
                <div className="text-center">
                  <div className="font-semibold">Floor Analytics</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}