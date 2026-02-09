import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, FileText, Upload } from "lucide-react";
import EnhancedScheduleView from "@/components/schedule/EnhancedScheduleView";
import ShiftReviewsView from "@/components/reviews/ShiftReviewsView";
import SchedulePhotoImport from "@/components/schedule/SchedulePhotoImport";
import { useLanguage } from "@/hooks/use-language";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

const StaffSchedulesApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>("schedule");
    const { t } = useLanguage();
    const weekStartStr = useMemo(() => {
      const start = getWeekStart(new Date());
      return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    }, []);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full md:w-[560px] grid-cols-3">
                    <TabsTrigger value="schedule">
                        <Calendar className="h-4 w-4 mr-2" /> {t("schedule.staff_scheduling")}
                    </TabsTrigger>
                    <TabsTrigger value="import">
                        <Upload className="h-4 w-4 mr-2" /> {t("schedule.import_schedules")}
                    </TabsTrigger>
                    <TabsTrigger value="reviews">
                        <FileText className="h-4 w-4 mr-2" /> {t("schedule.shift_reviews")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="schedule" className="space-y-4">
                    <Card className="border-0 shadow-none bg-transparent">
                        <CardContent className="p-0">
                            <EnhancedScheduleView />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="import" className="space-y-4">
                    <SchedulePhotoImport weekStart={weekStartStr} />
                </TabsContent>

                <TabsContent value="reviews" className="space-y-4">
                    <ShiftReviewsView />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default StaffSchedulesApp;
