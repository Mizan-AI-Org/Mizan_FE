import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    href: string;
    color: "blue" | "purple" | "pink" | "orange" | "green" | "indigo";
    comingSoon?: boolean;
}

const colorClasses = {
    blue: "bg-[hsl(var(--feature-blue))]",
    purple: "bg-[hsl(var(--feature-purple))]",
    pink: "bg-[hsl(var(--feature-pink))]",
    orange: "bg-[hsl(var(--feature-orange))]",
    green: "bg-[hsl(var(--feature-green))]",
    indigo: "bg-[hsl(var(--feature-indigo))]",
};

export const FeatureCard = ({
    icon: Icon,
    title,
    description,
    href,
    color,
    comingSoon = true,
}: FeatureCardProps) => {
    return (
        <Link to={href} className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 relative overflow-hidden">
                <CardContent className="p-6">
                    {comingSoon && (
                        <div className="absolute -right-8 top-4 rotate-45 bg-gradient-to-r from-primary to-primary/80 px-10 py-1 text-xs font-bold text-primary-foreground shadow-lg">
                            Coming Soon! ✨
                        </div>
                    )}
                    <div
                        className={cn(
                            "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl",
                            colorClasses[color]
                        )}
                    >
                        <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                        {title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
            </Card>
        </Link>
    );
};
