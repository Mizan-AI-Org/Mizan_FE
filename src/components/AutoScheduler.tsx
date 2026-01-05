// src/components/AutoScheduler.tsx
import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
    Settings,
    Play,
    Square,
    RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import TaskTemplateSelector from "@/components/schedule/TaskTemplateSelector";
import { useTaskTemplates } from "@/hooks/useTaskTemplates";
import { API_BASE } from "@/lib/api";



// Types
export interface Shift {
    id: string;
    title: string;
    start: string;
    end: string;
    type: "confirmed" | "pending" | "tentative";
    day: number;
    staffId: string;
    color: string;
    staffName: string;
    role: string;
    tasks: Task[];
}

export interface Task {
    id: string;
    name: string;
    duration: number; // in minutes
    priority: "high" | "medium" | "low";
    category: "opening" | "closing" | "maintenance" | "service" | "cleaning";
    completed: boolean;
}

export interface StaffMember {
    id: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    status: "active" | "inactive" | "on_leave";
    weeklyHours: number;
    preferredShift: "morning" | "afternoon" | "evening";
    skills: string[];
    hourlyRate: number;
    maxHoursPerDay: number;
    unavailableDays: number[]; // 0-6 for Sunday-Saturday
    taskPreferences: string[];
}

export interface SchedulingRule {
    id: string;
    name: string;
    type: "coverage" | "skill" | "preference" | "legal";
    enabled: boolean;
    priority: number;
    description: string;
}

export interface AutoSchedulerConfig {
    rules: SchedulingRule[];
    constraints: {
        maxLaborCost: number;
        minStaffCoverage: number;
        breakDuration: number;
        maxConsecutiveHours: number;
    };
    optimization: {
        prioritizeCost: boolean;
        prioritizeSkills: boolean;
        balanceWorkload: boolean;
        respectPreferences: boolean;
    };
}

interface AutoSchedulerProps {
    staffMembers: StaffMember[];
    onSchedulesGenerated: (shifts: Shift[]) => void;
}

// Auto Scheduler Component
export const AutoScheduler = ({
    staffMembers,
    onSchedulesGenerated,
}: AutoSchedulerProps) => {
    const [isScheduling, setIsScheduling] = useState(false);
    const [progress, setProgress] = useState(0);
    const [config, setConfig] = useState<AutoSchedulerConfig>({
        rules: [
            {
                id: "1",
                name: "Minimum Staff Coverage",
                type: "coverage",
                enabled: true,
                priority: 1,
                description: "Ensure minimum staff during peak hours",
            },
            {
                id: "2",
                name: "Skill Matching",
                type: "skill",
                enabled: true,
                priority: 2,
                description: "Assign staff based on required skills",
            },
            {
                id: "3",
                name: "Shift Preference",
                type: "preference",
                enabled: true,
                priority: 3,
                description: "Respect staff shift preferences",
            },
            {
                id: "4",
                name: "Break Compliance",
                type: "legal",
                enabled: true,
                priority: 4,
                description: "Ensure legal break requirements",
            },
        ],
        constraints: {
            maxLaborCost: 1000,
            minStaffCoverage: 3,
            breakDuration: 30,
            maxConsecutiveHours: 8,
        },
        optimization: {
            prioritizeCost: true,
            prioritizeSkills: false,
            balanceWorkload: true,
            respectPreferences: true,
        },
    });

    const [taskTemplates, setTaskTemplates] = useState<Task[]>([]);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const { templates, error: templatesError } = useTaskTemplates({ pollIntervalMs: 10000 });

    interface TemplateTask {
        title?: string;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
        estimated_duration?: number;
    }
    interface TaskTemplateApi {
        id: string;
        name: string;
        description?: string;
        template_type?: string; // opening, service, cleaning, closing, maintenance
        tasks?: TemplateTask[];
        // Optional top-level fields present on some templates
        estimated_duration?: number;
        priority_level?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
        frequency?: string;
    }

    const mapPriority = (p?: TemplateTask["priority"]): Task["priority"] => {
        switch (p) {
            case "HIGH":
                return "high";
            case "MEDIUM":
                return "medium";
            case "LOW":
                return "low";
            case "URGENT":
                return "high";
            default:
                return "medium";
        }
    };

    const mapCategory = (c?: string): Task["category"] => {
        const val = (c || "service").toLowerCase();
        const categories: readonly Task['category'][] = ["opening", "closing", "service", "maintenance", "cleaning"];
        const foundCategory = categories.find(cat => cat === val);
        return foundCategory || "service";
    };

    // Map templates from shared hook into local Task[] used by scheduler
    useEffect(() => {
        try {
            let mapped: Task[] = [];
            const allTemplates = (templates || []) as TaskTemplateApi[];
            const activeTemplates: TaskTemplateApi[] =
                selectedTemplateIds && selectedTemplateIds.length > 0
                    ? allTemplates.filter((t) => selectedTemplateIds.includes(String(t.id)))
                    : allTemplates;
            activeTemplates.forEach((tpl) => {
                const category = mapCategory(tpl.template_type || undefined);
                const tasks: TemplateTask[] = Array.isArray(tpl.tasks) && tpl.tasks.length > 0
                    ? tpl.tasks
                    : [{
                        title: tpl.name,
                        priority: tpl.priority_level ?? "MEDIUM",
                        estimated_duration: typeof tpl.estimated_duration === "number" ? tpl.estimated_duration : 30,
                    }];
                mapped = mapped.concat(
                    tasks.map((t, idx) => ({
                        id: `${tpl.id}-${idx}`,
                        name: t.title || tpl.name,
                        duration: typeof t.estimated_duration === "number" ? t.estimated_duration : 30,
                        priority: mapPriority(t.priority),
                        category,
                        completed: false,
                    }))
                );
            });
            if (mapped.length === 0) {
                mapped = [
                    { id: "fallback-1", name: "Opening Setup", duration: 45, priority: "high", category: "opening", completed: false },
                    { id: "fallback-2", name: "Inventory Check", duration: 30, priority: "medium", category: "opening", completed: false },
                    { id: "fallback-3", name: "Prep Station Setup", duration: 60, priority: "high", category: "opening", completed: false },
                    { id: "fallback-4", name: "Lunch Service", duration: 240, priority: "high", category: "service", completed: false },
                    { id: "fallback-5", name: "Dinner Service", duration: 300, priority: "high", category: "service", completed: false },
                    { id: "fallback-6", name: "Clean Kitchen", duration: 60, priority: "medium", category: "cleaning", completed: false },
                    { id: "fallback-7", name: "Restock Supplies", duration: 30, priority: "low", category: "maintenance", completed: false },
                    { id: "fallback-8", name: "Closing Procedures", duration: 45, priority: "high", category: "closing", completed: false },
                ];
            }
            setTaskTemplates(mapped);
        } catch {
            // ignore mapping errors
        }
    }, [templates, selectedTemplateIds]);

    const simulateScheduling = async () => {
        setIsScheduling(true);
        setProgress(0);

        // Simulate scheduling process with progress updates
        const steps = [
            "Analyzing staff availability...",
            "Calculating coverage needs...",
            "Matching skills to tasks...",
            "Optimizing schedule...",
            "Applying constraints...",
            "Finalizing schedule...",
        ];

        for (let i = 0; i < steps.length; i++) {
            setProgress(((i + 1) / steps.length) * 100);
            await new Promise((resolve) => setTimeout(resolve, 800));
        }

        // Generate sample shifts with tasks
        const generatedShifts: Shift[] = [];
        const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

        staffMembers.forEach((staff, index) => {
            if (staff.status !== "active") return;

            // Generate 3-5 shifts per staff member
            const shiftCount = Math.floor(Math.random() * 3) + 3;
            for (let i = 0; i < shiftCount; i++) {
                const day = Math.floor(Math.random() * 7);
                const startHour = 6 + Math.floor(Math.random() * 12);
                const duration = 4 + Math.floor(Math.random() * 6);

                // Assign tasks based on shift type and staff role
                const shiftTasks = getTasksForShift(staff, startHour, duration);

                generatedShifts.push({
                    id: `auto-${staff.id}-${i}`,
                    title: staff.name,
                    start: `${startHour}:00`,
                    end: `${startHour + duration}:00`,
                    type: "confirmed",
                    day,
                    staffId: staff.id,
                    color: colors[index % colors.length],
                    staffName: staff.name,
                    role: staff.role,
                    tasks: shiftTasks,
                });
            }
        });

        setIsScheduling(false);
        onSchedulesGenerated(generatedShifts);
        toast.success(
            `Auto-scheduled ${generatedShifts.length} shifts with tasks!`
        );
    };

    const getTasksForShift = (
        staff: StaffMember,
        startHour: number,
        duration: number
    ): Task[] => {
        const tasks: Task[] = [];
        let remainingTime = duration * 60; // Convert to minutes

        // Filter tasks by staff role and shift time
        const availableTasks = taskTemplates.filter((task) => {
            if (startHour < 12 && task.category === "opening") return true;
            if (startHour >= 12 && startHour < 17 && task.category === "service")
                return true;
            if (startHour >= 17 && task.category === "service") return true;
            if (startHour + duration >= 21 && task.category === "closing")
                return true;
            return task.category === "maintenance" || task.category === "cleaning";
        });

        // Sort by priority
        availableTasks.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        // Assign tasks until shift is filled
        for (const task of availableTasks) {
            if (remainingTime >= task.duration) {
                tasks.push({ ...task, id: `${task.id}-${Date.now()}` });
                remainingTime -= task.duration;
            }
            if (remainingTime <= 30) break; // Leave time for breaks
        }

        return tasks;
    };

    const updateRule = (ruleId: string, updates: Partial<SchedulingRule>) => {
        setConfig((prev) => ({
            ...prev,
            rules: prev.rules.map((rule) =>
                rule.id === ruleId ? { ...rule, ...updates } : rule
            ),
        }));
    };

    const updateConstraint = (
        key: keyof AutoSchedulerConfig["constraints"],
        value: number
    ) => {
        setConfig((prev) => ({
            ...prev,
            constraints: { ...prev.constraints, [key]: value },
        }));
    };

    const updateOptimization = (
        key: keyof AutoSchedulerConfig["optimization"],
        value: boolean
    ) => {
        setConfig((prev) => ({
            ...prev,
            optimization: { ...prev.optimization, [key]: value },
        }));
    };

    return (
        <div className="space-y-6">
            {/* Configuration Panel */}
            <Card>
                <CardHeader>
                    <CardDescription>
                        Configure rules and constraints for automatic staff scheduling
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Scheduling Rules */}
                    <div>
                        <h4 className="font-semibold mb-3">Scheduling Rules</h4>
                        <div className="space-y-3">
                            {config.rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={rule.enabled}
                                            onCheckedChange={(checked) =>
                                                updateRule(rule.id, { enabled: checked })
                                            }
                                        />
                                        <div>
                                            <p className="font-medium">{rule.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {rule.description}
                                            </p>
                                        </div>
                                    </div>
                                    <Select
                                        value={rule.priority.toString()}
                                        onValueChange={(value) =>
                                            updateRule(rule.id, { priority: parseInt(value) })
                                        }
                                    >
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1</SelectItem>
                                            <SelectItem value="2">2</SelectItem>
                                            <SelectItem value="3">3</SelectItem>
                                            <SelectItem value="4">4</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Constraints */}
                    <div>
                        <h4 className="font-semibold mb-3">Constraints</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="maxLaborCost">
                                    Max Daily Labor Cost: ${config.constraints.maxLaborCost}
                                </Label>
                                <Slider
                                    id="maxLaborCost"
                                    min={500}
                                    max={5000}
                                    step={100}
                                    value={[config.constraints.maxLaborCost]}
                                    onValueChange={([value]) =>
                                        updateConstraint("maxLaborCost", value)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="minStaffCoverage">
                                    Min Staff During Peak: {config.constraints.minStaffCoverage}
                                </Label>
                                <Slider
                                    id="minStaffCoverage"
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={[config.constraints.minStaffCoverage]}
                                    onValueChange={([value]) =>
                                        updateConstraint("minStaffCoverage", value)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="breakDuration">
                                    Break Duration: {config.constraints.breakDuration} min
                                </Label>
                                <Slider
                                    id="breakDuration"
                                    min={15}
                                    max={60}
                                    step={15}
                                    value={[config.constraints.breakDuration]}
                                    onValueChange={([value]) =>
                                        updateConstraint("breakDuration", value)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxConsecutiveHours">
                                    Max Consecutive Hours:{" "}
                                    {config.constraints.maxConsecutiveHours}
                                </Label>
                                <Slider
                                    id="maxConsecutiveHours"
                                    min={4}
                                    max={12}
                                    step={1}
                                    value={[config.constraints.maxConsecutiveHours]}
                                    onValueChange={([value]) =>
                                        updateConstraint("maxConsecutiveHours", value)
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Optimization Preferences */}
                    <div>
                        <h4 className="font-semibold mb-3">Optimization Preferences</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={config.optimization.prioritizeCost}
                                    onCheckedChange={(checked) =>
                                        updateOptimization("prioritizeCost", checked)
                                    }
                                />
                                <Label>Prioritize Cost Savings</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={config.optimization.prioritizeSkills}
                                    onCheckedChange={(checked) =>
                                        updateOptimization("prioritizeSkills", checked)
                                    }
                                />
                                <Label>Prioritize Skill Matching</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={config.optimization.balanceWorkload}
                                    onCheckedChange={(checked) =>
                                        updateOptimization("balanceWorkload", checked)
                                    }
                                />
                                <Label>Balance Workload</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={config.optimization.respectPreferences}
                                    onCheckedChange={(checked) =>
                                        updateOptimization("respectPreferences", checked)
                                    }
                                />
                                <Label>Respect Staff Preferences</Label>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Task Templates */}
            <Card>
                <CardHeader>
                    <CardTitle>Task Templates</CardTitle>
                    <CardDescription>
                        Manage tasks that will be automatically assigned to shifts
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <TaskTemplateSelector
                            multiselect
                            selectedIds={selectedTemplateIds}
                            onChangeSelected={setSelectedTemplateIds}
                        />

                        {templatesError && (
                            <Alert variant="destructive" role="alert">
                                <AlertTitle>Failed to load templates</AlertTitle>
                                <AlertDescription>{templatesError}</AlertDescription>
                            </Alert>
                        )}

                        {/* Removed card grid; using scrollable multi-select list above */}
                    </div>
                </CardContent>
            </Card>

            {/* Scheduler Controls */}
            <Card>
                <CardHeader>
                    <CardTitle>Generate Schedule</CardTitle>
                    <CardDescription>
                        Automatically create optimized schedules based on your configuration
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <Button
                            onClick={simulateScheduling}
                            disabled={isScheduling}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isScheduling ? (
                                <>
                                    <Square className="w-4 h-4 mr-2" />
                                    Stop Scheduling
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Run Auto-Scheduler
                                </>
                            )}
                        </Button>

                        <Button variant="outline" disabled={isScheduling}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset to Defaults
                        </Button>

                        {isScheduling && (
                            <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {progress < 20 && "Analyzing staff availability..."}
                                    {progress >= 20 &&
                                        progress < 40 &&
                                        "Calculating coverage needs..."}
                                    {progress >= 40 &&
                                        progress < 60 &&
                                        "Matching skills to tasks..."}
                                    {progress >= 60 && progress < 80 && "Optimizing schedule..."}
                                    {progress >= 80 && "Finalizing schedule..."}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AutoScheduler;
