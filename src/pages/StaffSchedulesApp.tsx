import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText } from "lucide-react";
import EnhancedScheduleView from "@/components/schedule/EnhancedScheduleView";
import ShiftReviewsView from "@/components/reviews/ShiftReviewsView";

const StaffSchedulesApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>("schedule");

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="mizan-title">
                        <span className="mizan-serif">Staff</span> Schedules
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                        Manage team rosters and review shift performance
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                    <TabsTrigger value="schedule">
                        <Calendar className="h-4 w-4 mr-2" /> Staff Scheduling
                    </TabsTrigger>
                    <TabsTrigger value="reviews">
                        <FileText className="h-4 w-4 mr-2" /> Shift Reviews
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="schedule" className="space-y-4">
                    <Card className="border-0 shadow-none bg-transparent">
                        {/* EnhancedScheduleView typically has its own card structure, so we might not need a wrapper card or we keep it minimal */}
                        <CardContent className="p-0">
                            <EnhancedScheduleView />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reviews" className="space-y-4">
                    <ShiftReviewsView />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default StaffSchedulesApp;
