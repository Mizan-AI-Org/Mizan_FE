// src/components/TaskModal.tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { Shift } from "./AutoScheduler";

interface TaskModalProps {
    shift: Shift;
    onClose: () => void;
    onTaskComplete: (shiftId: string, taskId: string) => void;
}

export const TaskModal = ({ shift, onClose, onTaskComplete }: TaskModalProps) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Shift Tasks - {shift.staffName}</h3>
                <div className="space-y-3">
                    {shift.tasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onTaskComplete(shift.id, task.id)}
                                    className={`p-1 rounded-full ${task.completed
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-gray-100 text-gray-400'
                                        }`}
                                >
                                    {task.completed ? <CheckCircle className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2" />}
                                </button>
                                <div>
                                    <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                                        {task.name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {task.duration}min • {task.category} • <Badge variant="outline">{task.priority}</Badge>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                    <Button onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TaskModal;