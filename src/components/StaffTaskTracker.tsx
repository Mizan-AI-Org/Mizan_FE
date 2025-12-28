import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { AuthContextType } from '../contexts/AuthContext.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
import { API_BASE } from "@/lib/api";
  Camera,
  CheckCircle,
  Circle,
  Clock,
  MapPin,
  Upload,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  Eye,
  MessageSquare,
  Target,
  ClipboardList
} from 'lucide-react';


interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  progress_percentage: number;
  progress_notes?: string;
  checkpoints: Checkpoint[];
  completion_photo?: string;
  completion_location?: string;
  estimated_duration?: string;
  category?: { id: string; name: string; color: string; };
  created_at: string;
  completed_at?: string;
}

interface Checkpoint {
  id: string;
  timestamp: string;
  description: string;
  photo?: string;
  location?: string;
  progress_percentage: number;
}

interface StaffTaskTrackerProps {
  taskId?: string;
  onTaskUpdate?: (task: Task) => void;
}

export const StaffTaskTracker: React.FC<StaffTaskTrackerProps> = ({ taskId, onTaskUpdate }) => {
  const { user } = useAuth() as AuthContextType;
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStartTime, setTrackingStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [progressNotes, setProgressNotes] = useState('');
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false);
  const [checkpointDescription, setCheckpointDescription] = useState('');
  const [checkpointPhoto, setCheckpointPhoto] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkpointFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (taskId) {
      loadTask(taskId);
    } else {
      loadMyTasks();
    }
    getCurrentLocation();
  }, [taskId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && trackingStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - trackingStartTime.getTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, trackingStartTime]);

  const loadTask = async (id: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/scheduling/tasks/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const task = await response.json();
        setSelectedTask(task);
        setProgressNotes(task.progress_notes || '');
      }
    } catch (error) {
      toast.error('Failed to load task');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyTasks = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/scheduling/my-tasks/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data.results || data);
        if (data.length > 0 && !selectedTask) {
          setSelectedTask(data[0]);
          setProgressNotes(data[0].progress_notes || '');
        }
      }
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
        },
        (error) => {
          console.error('Error getting location:', error);
          setCurrentLocation('Location unavailable');
        }
      );
    }
  };

  const startTracking = () => {
    setIsTracking(true);
    setTrackingStartTime(new Date());
    setElapsedTime(0);
    updateTaskStatus('IN_PROGRESS');
  };

  const pauseTracking = () => {
    setIsTracking(false);
    setTrackingStartTime(null);
  };

  const resetTracking = () => {
    setIsTracking(false);
    setTrackingStartTime(null);
    setElapsedTime(0);
  };

  const updateTaskStatus = async (status: Task['status']) => {
    if (!selectedTask) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/scheduling/tasks/${selectedTask.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        const updatedTask = await response.json();
        setSelectedTask(updatedTask);
        onTaskUpdate?.(updatedTask);
        toast.success(`Task status updated to ${status}`);
      }
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const updateProgress = async (progressPercentage: number) => {
    if (!selectedTask) return;

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('progress_percentage', progressPercentage.toString());
      formData.append('progress_notes', progressNotes);
      formData.append('completion_location', currentLocation);

      const response = await fetch(`${API_BASE}/scheduling/tasks/${selectedTask.id}/update-progress/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        const updatedTask = await response.json();
        setSelectedTask(updatedTask);
        onTaskUpdate?.(updatedTask);
        toast.success('Progress updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update progress');
    }
  };

  const addCheckpoint = async () => {
    if (!selectedTask || !checkpointDescription.trim()) return;

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('description', checkpointDescription);
      formData.append('location', currentLocation);
      formData.append('progress_percentage', selectedTask.progress_percentage.toString());
      
      if (checkpointPhoto) {
        formData.append('photo', checkpointPhoto);
      }

      const response = await fetch(`${API_BASE}/scheduling/tasks/${selectedTask.id}/add-checkpoint/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        const updatedTask = await response.json();
        setSelectedTask(updatedTask);
        onTaskUpdate?.(updatedTask);
        setShowCheckpointDialog(false);
        setCheckpointDescription('');
        setCheckpointPhoto(null);
        toast.success('Checkpoint added successfully');
      }
    } catch (error) {
      toast.error('Failed to add checkpoint');
    }
  };

  const completeTask = async () => {
    if (!selectedTask) return;

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('progress_percentage', '100');
      formData.append('progress_notes', progressNotes);
      formData.append('completion_location', currentLocation);
      formData.append('status', 'COMPLETED');
      
      if (completionPhoto) {
        formData.append('completion_photo', completionPhoto);
      }

      const response = await fetch(`${API_BASE}/scheduling/tasks/${selectedTask.id}/complete/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        const updatedTask = await response.json();
        setSelectedTask(updatedTask);
        onTaskUpdate?.(updatedTask);
        resetTracking();
        toast.success('Task completed successfully!');
      }
    } catch (error) {
      toast.error('Failed to complete task');
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCompletionPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCheckpointPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCheckpointPhoto(file);
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedTask) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tasks assigned</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Selection */}
      {!taskId && tasks.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {tasks.map((task) => (
                <Button
                  key={task.id}
                  variant={selectedTask?.id === task.id ? "default" : "outline"}
                  className="justify-start h-auto p-3"
                  onClick={() => {
                    setSelectedTask(task);
                    setProgressNotes(task.progress_notes || '');
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 text-left">
                      <div className="font-medium">{task.title}</div>
                      <div className="text-sm opacity-70">
                        {task.progress_percentage}% complete
                      </div>
                    </div>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Task Tracker */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {selectedTask.status === 'COMPLETED' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-blue-500" />
                )}
                {selectedTask.title}
              </CardTitle>
              <CardDescription>{selectedTask.description}</CardDescription>
            </div>
            <Badge className={getPriorityColor(selectedTask.priority)}>
              {selectedTask.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-500">{selectedTask.progress_percentage}%</span>
            </div>
            <Progress value={selectedTask.progress_percentage} className="mb-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((percentage) => (
                <Button
                  key={percentage}
                  variant="outline"
                  size="sm"
                  onClick={() => updateProgress(percentage)}
                  disabled={selectedTask.status === 'COMPLETED'}
                >
                  {percentage}%
                </Button>
              ))}
            </div>
          </div>

          {/* Time Tracking */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Tracking
              </h4>
              <div className="text-lg font-mono">{formatTime(elapsedTime)}</div>
            </div>
            
            <div className="flex gap-2">
              {!isTracking ? (
                <Button onClick={startTracking} size="sm" className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start
                </Button>
              ) : (
                <Button onClick={pauseTracking} size="sm" variant="outline" className="flex items-center gap-2">
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              )}
              <Button onClick={resetTracking} size="sm" variant="outline" className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </div>

          {/* Progress Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Progress Notes</label>
            <Textarea
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              placeholder="Add notes about your progress..."
              rows={3}
              disabled={selectedTask.status === 'COMPLETED'}
            />
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>Location: {currentLocation}</span>
          </div>

          {/* Checkpoints */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Checkpoints</h4>
              <Dialog open={showCheckpointDialog} onOpenChange={setShowCheckpointDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={selectedTask.status === 'COMPLETED'}>
                    Add Checkpoint
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Progress Checkpoint</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Textarea
                        value={checkpointDescription}
                        onChange={(e) => setCheckpointDescription(e.target.value)}
                        placeholder="Describe what you've accomplished..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Photo (Optional)</label>
                      <input
                        ref={checkpointFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCheckpointPhotoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => checkpointFileInputRef.current?.click()}
                        className="flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        {checkpointPhoto ? 'Photo Selected' : 'Add Photo'}
                      </Button>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCheckpointDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addCheckpoint}>Add Checkpoint</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedTask.checkpoints?.map((checkpoint, index) => (
                <div key={checkpoint.id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm">{checkpoint.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{new Date(checkpoint.timestamp).toLocaleString()}</span>
                        <span>{checkpoint.progress_percentage}%</span>
                        {checkpoint.photo && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Photo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Completion Photo */}
          {selectedTask.status !== 'COMPLETED' && (
            <div>
              <label className="block text-sm font-medium mb-2">Completion Photo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  {completionPhoto ? 'Photo Selected' : 'Add Photo'}
                </Button>
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {selectedTask && (
              <Button
                onClick={() => navigate(`/task-checklist/${selectedTask.id}`)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                Open Checklist
              </Button>
            )}
            {selectedTask.status !== 'COMPLETED' && (
              <>
                <Button
                  onClick={() => updateProgress(selectedTask.progress_percentage)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Save Progress
                </Button>
                <Button
                  onClick={completeTask}
                  className="flex items-center gap-2"
                  disabled={selectedTask.progress_percentage < 100}
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete Task
                </Button>
              </>
            )}
            {selectedTask.status === 'COMPLETED' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Task Completed!</span>
                {selectedTask.completed_at && (
                  <span className="text-sm text-gray-500">
                    on {new Date(selectedTask.completed_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffTaskTracker;