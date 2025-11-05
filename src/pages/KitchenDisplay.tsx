import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    UtensilsCrossed} from "lucide-react";


export default function KitchenDisplay() {
    return (
        <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Coming Soon Banner */}
                <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200/50 dark:border-orange-800/50 shadow-lg">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                                    <UtensilsCrossed className="w-6 h-6 text-orange-600" />
                                    Kitchen Display System
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Coming Soon - Advanced kitchen management and order tracking
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="w-fit bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
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