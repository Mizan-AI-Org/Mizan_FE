import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BarChart2,
    Users,
    Package,
    ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";

export default function ReportingPage() {
    const { t } = useLanguage();
    const reportSections = [
        {
            title: t("reporting.sections.daily.title"),
            description: t("reporting.sections.daily.description"),
            icon: BarChart2,
            link: "/dashboard/reports/sales/daily",
            color: "text-blue-500",
        },
        {
            title: t("reporting.sections.attendance.title"),
            description: t("reporting.sections.attendance.description"),
            icon: Users,
            link: "/dashboard/reports/attendance",
            color: "text-green-500",
        },
        {
            title: t("reporting.sections.inventory.title"),
            description: t("reporting.sections.inventory.description"),
            icon: Package,
            link: "/dashboard/reports/inventory",
            color: "text-purple-500",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/50 shadow-lg">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                                    <BarChart2 className="w-6 h-6 text-blue-600" />
                                    {t("reporting.title")}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {t("reporting.description")}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {reportSections.map((section) => (
                        <Link to={section.link} key={section.title}>
                            <Card className="shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-[1.02] flex items-center justify-between p-6">
                                <div className="flex items-center gap-4">
                                    <section.icon className={`w-8 h-8 ${section.color}`} />
                                    <div>
                                        <CardTitle className="text-lg">{section.title}</CardTitle>
                                        <CardDescription>{section.description}</CardDescription>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
