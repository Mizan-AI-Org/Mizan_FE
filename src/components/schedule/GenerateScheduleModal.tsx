import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { AuthContextType } from '../../contexts/AuthContext.types';
import { format, startOfWeek } from 'date-fns';
import { API_BASE } from "@/lib/api";

interface ScheduleTemplate {
    id: string;
    name: string;
    is_active: boolean;
}

interface GenerateScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
}


const GenerateScheduleModal: React.FC<GenerateScheduleModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const { logout } = useAuth() as AuthContextType;

    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [weekStartDate, setWeekStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));

    const { data: templates, isLoading: isLoadingTemplates, error: templatesError } = useQuery<ScheduleTemplate[]>({
        queryKey: ['schedule-templates'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/scheduling/templates/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error('Session expired');
                }
                throw new Error('Failed to fetch schedule templates');
            }
            return response.json();
        },
    });

    const generateScheduleMutation = useMutation({
        mutationFn: async (data: { template_id: string; week_start: string }) => {
            const response = await fetch(`${API_BASE}/scheduling/generate-weekly-schedule/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error('Session expired');
                }
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.message || 'Failed to generate schedule');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
            toast({
                title: "Weekly schedule generated successfully!",
                description: "The new weekly schedule has been created based on the selected template.",
            });
            onClose();
        },
        onError: (error: unknown) => {
            const message = error instanceof Error
                ? error.message
                : typeof error === 'string'
                    ? error
                    : 'An unexpected error occurred.';
            toast({
                title: "Failed to generate weekly schedule.",
                description: message,
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplateId || !weekStartDate) {
            toast({
                title: "Missing information",
                description: "Please select a template and a week start date.",
                variant: "destructive",
            });
            return;
        }

        generateScheduleMutation.mutate({
            template_id: selectedTemplateId,
            week_start: weekStartDate,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Generate Weekly Schedule</DialogTitle>
                    <DialogDescription>
                        Select a template and the start date for the new weekly schedule.
                        The week will start on Monday.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="template" className="text-right">Schedule Template</Label>
                        <Select onValueChange={setSelectedTemplateId} value={selectedTemplateId} required>
                            <SelectTrigger className="col-span-3" id="template">
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingTemplates ? (
                                    <SelectItem value="" disabled>Loading templates...</SelectItem>
                                ) : templatesError ? (
                                    <SelectItem value="" disabled>Error loading templates</SelectItem>
                                ) : (
                                    templates?.filter(t => t.is_active).map((t) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="weekStart" className="text-right">Week Start Date (Monday)</Label>
                        <Input
                            id="weekStart"
                            type="date"
                            value={weekStartDate}
                            onChange={(e) => setWeekStartDate(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={generateScheduleMutation.isPending || isLoadingTemplates || !!templatesError}>
                            {generateScheduleMutation.isPending ? 'Generating...' : 'Generate Schedule'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default GenerateScheduleModal;
