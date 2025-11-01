import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Grid,
  Badge,
  Tooltip,
  Fab,
  Snackbar,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  ButtonGroup
} from '@mui/material';
import {
  Assignment as TaskIcon,
  PhotoCamera as PhotoCameraIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  Notifications as NotificationsIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
  QrCode as QrCodeIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';

interface TaskCheckpoint {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  photo_required: boolean;
  photo_url?: string;
  completion_time?: string;
  notes?: string;
  estimated_duration: number;
  actual_duration?: number;
}

interface TaskDetails {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'overdue';
  assigned_to: {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
  location: string;
  estimated_duration: number;
  actual_duration?: number;
  start_time?: string;
  due_time: string;
  completion_time?: string;
  checkpoints: TaskCheckpoint[];
  photo_required: boolean;
  completion_photos: string[];
  instructions: string[];
  tools_required: string[];
  safety_notes: string[];
  completion_notes?: string;
  quality_score?: number;
  manager_approval_required: boolean;
  manager_approved?: boolean;
  created_at: string;
  updated_at: string;
}

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  avatar?: string;
  phone?: string;
  current_location?: string;
  shift_start: string;
  shift_end: string;
  break_time_remaining?: number;
  efficiency_score: number;
}

interface TaskTimer {
  isRunning: boolean;
  startTime?: Date;
  pausedTime: number;
  totalTime: number;
}

const StaffTaskInterface: React.FC = () => {
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);
  const [tasks, setTasks] = useState<TaskDetails[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetails | null>(null);
  const [taskTimer, setTaskTimer] = useState<TaskTimer>({
    isRunning: false,
    pausedTime: 0,
    totalTime: 0
  });
  const [currentCheckpoint, setCurrentCheckpoint] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [completionNotes, setCompletionNotes] = useState('');
  const [qualityScore, setQualityScore] = useState(5);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [checkpointNotes, setCheckpointNotes] = useState<{[key: string]: string}>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mock data
  const mockStaff: StaffMember = {
    id: 1,
    first_name: "John",
    last_name: "Smith",
    role: "Kitchen Staff",
    phone: "+1-555-0123",
    current_location: "Main Kitchen",
    shift_start: "2024-01-20T08:00:00Z",
    shift_end: "2024-01-20T16:00:00Z",
    break_time_remaining: 15,
    efficiency_score: 94
  };

  const mockTasks: TaskDetails[] = [
    {
      id: 1,
      title: "Kitchen Deep Clean & Sanitization",
      description: "Complete deep cleaning and sanitization of all kitchen equipment, surfaces, and storage areas according to health department standards.",
      priority: "high",
      status: "pending",
      assigned_to: mockStaff,
      location: "Main Kitchen",
      estimated_duration: 120,
      due_time: "2024-01-20T14:00:00Z",
      photo_required: true,
      completion_photos: [],
      instructions: [
        "Turn off all equipment and allow to cool",
        "Remove all food items from work surfaces",
        "Apply sanitizing solution to all surfaces",
        "Clean and sanitize all equipment thoroughly",
        "Document with photos at each major step"
      ],
      tools_required: ["Sanitizing solution", "Cleaning cloths", "Scrub brushes", "Protective gloves"],
      safety_notes: ["Wear protective gloves at all times", "Ensure proper ventilation", "Do not mix cleaning chemicals"],
      manager_approval_required: true,
      created_at: "2024-01-20T08:00:00Z",
      updated_at: "2024-01-20T08:00:00Z",
      checkpoints: [
        {
          id: "1",
          title: "Equipment Shutdown",
          description: "Turn off and cool down all kitchen equipment",
          required: true,
          completed: false,
          photo_required: true,
          estimated_duration: 15
        },
        {
          id: "2",
          title: "Surface Preparation",
          description: "Clear and prepare all work surfaces",
          required: true,
          completed: false,
          photo_required: false,
          estimated_duration: 20
        },
        {
          id: "3",
          title: "Deep Cleaning",
          description: "Apply cleaning solutions and scrub all surfaces",
          required: true,
          completed: false,
          photo_required: true,
          estimated_duration: 45
        },
        {
          id: "4",
          title: "Sanitization",
          description: "Apply sanitizing solution to all cleaned surfaces",
          required: true,
          completed: false,
          photo_required: true,
          estimated_duration: 30
        },
        {
          id: "5",
          title: "Final Inspection",
          description: "Conduct final quality check and documentation",
          required: true,
          completed: false,
          photo_required: true,
          estimated_duration: 10
        }
      ]
    },
    {
      id: 2,
      title: "Inventory Count - Dry Storage",
      description: "Complete inventory count of all dry storage items and update system records.",
      priority: "medium",
      status: "pending",
      assigned_to: mockStaff,
      location: "Storage Room A",
      estimated_duration: 60,
      due_time: "2024-01-20T16:00:00Z",
      photo_required: true,
      completion_photos: [],
      instructions: [
        "Count all items systematically by category",
        "Record quantities in the inventory system",
        "Note any damaged or expired items",
        "Take photos of discrepancies"
      ],
      tools_required: ["Inventory scanner", "Clipboard", "Pen", "Calculator"],
      safety_notes: ["Use proper lifting techniques", "Report any spills immediately"],
      manager_approval_required: false,
      created_at: "2024-01-20T09:00:00Z",
      updated_at: "2024-01-20T09:00:00Z",
      checkpoints: [
        {
          id: "1",
          title: "Setup & Preparation",
          description: "Gather tools and prepare inventory sheets",
          required: true,
          completed: false,
          photo_required: false,
          estimated_duration: 10
        },
        {
          id: "2",
          title: "Category A Count",
          description: "Count canned goods and packaged items",
          required: true,
          completed: false,
          photo_required: false,
          estimated_duration: 20
        },
        {
          id: "3",
          title: "Category B Count",
          description: "Count dry goods and bulk items",
          required: true,
          completed: false,
          photo_required: false,
          estimated_duration: 20
        },
        {
          id: "4",
          title: "System Update",
          description: "Enter all counts into inventory system",
          required: true,
          completed: false,
          photo_required: true,
          estimated_duration: 10
        }
      ]
    }
  ];

  useEffect(() => {
    loadStaffData();
    loadTasks();

    // Set up real-time updates
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadTasks();
      }, 30000); // Update every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [autoRefresh]);

  useEffect(() => {
    if (taskTimer.isRunning && !timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        setTaskTimer(prev => ({
          ...prev,
          totalTime: prev.pausedTime + (prev.startTime ? Date.now() - prev.startTime.getTime() : 0)
        }));
      }, 1000);
    } else if (!taskTimer.isRunning && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [taskTimer.isRunning]);

  const loadStaffData = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStaff(mockStaff);
    } catch (error) {
      console.error('Failed to load staff data:', error);
      showSnackbar('Failed to load staff data', 'error');
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTasks(mockTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      showSnackbar('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const startTask = async (task: TaskDetails) => {
    try {
      setSelectedTask({ ...task, status: 'in_progress', start_time: new Date().toISOString() });
      setTaskTimer({
        isRunning: true,
        startTime: new Date(),
        pausedTime: 0,
        totalTime: 0
      });
      setCurrentCheckpoint(0);
      
      // Update task status in backend
      await updateTaskStatus(task.id, 'in_progress');
      showSnackbar('Task started successfully', 'success');
    } catch (error) {
      console.error('Failed to start task:', error);
      showSnackbar('Failed to start task', 'error');
    }
  };

  const pauseTask = () => {
    if (taskTimer.isRunning) {
      setTaskTimer(prev => ({
        ...prev,
        isRunning: false,
        pausedTime: prev.totalTime,
        startTime: undefined
      }));
      showSnackbar('Task paused', 'info');
    }
  };

  const resumeTask = () => {
    if (!taskTimer.isRunning) {
      setTaskTimer(prev => ({
        ...prev,
        isRunning: true,
        startTime: new Date()
      }));
      showSnackbar('Task resumed', 'info');
    }
  };

  const completeCheckpoint = async (checkpointId: string) => {
    if (!selectedTask) return;

    try {
      const updatedCheckpoints = selectedTask.checkpoints.map(cp => 
        cp.id === checkpointId 
          ? { 
              ...cp, 
              completed: true, 
              completion_time: new Date().toISOString(),
              actual_duration: Math.floor(taskTimer.totalTime / 60000), // Convert to minutes
              notes: checkpointNotes[checkpointId] || ''
            }
          : cp
      );

      const updatedTask = { ...selectedTask, checkpoints: updatedCheckpoints };
      setSelectedTask(updatedTask);

      // Move to next checkpoint
      const nextIncompleteIndex = updatedCheckpoints.findIndex(cp => !cp.completed);
      if (nextIncompleteIndex !== -1) {
        setCurrentCheckpoint(nextIncompleteIndex);
      } else {
        // All checkpoints completed
        setCompletionDialogOpen(true);
      }

      showSnackbar('Checkpoint completed', 'success');
    } catch (error) {
      console.error('Failed to complete checkpoint:', error);
      showSnackbar('Failed to complete checkpoint', 'error');
    }
  };

  const completeTask = async () => {
    if (!selectedTask) return;

    try {
      const completedTask = {
        ...selectedTask,
        status: 'completed' as const,
        completion_time: new Date().toISOString(),
        actual_duration: Math.floor(taskTimer.totalTime / 60000),
        completion_notes: completionNotes,
        quality_score: qualityScore,
        completion_photos: selectedPhotos.map(photo => URL.createObjectURL(photo))
      };

      setSelectedTask(completedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? completedTask : t));
      
      // Stop timer
      setTaskTimer({
        isRunning: false,
        pausedTime: 0,
        totalTime: 0
      });

      // Update backend
      await updateTaskStatus(selectedTask.id, 'completed');
      
      setCompletionDialogOpen(false);
      setSelectedTask(null);
      showSnackbar('Task completed successfully!', 'success');
    } catch (error) {
      console.error('Failed to complete task:', error);
      showSnackbar('Failed to complete task', 'error');
    }
  };

  const updateTaskStatus = async (taskId: number, status: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Task ${taskId} status updated to ${status}`);
  };

  const handlePhotoCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedPhotos(prev => [...prev, ...files]);
    setPhotoDialogOpen(false);
    showSnackbar(`${files.length} photo(s) added`, 'success');
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string): 'error' | 'warning' | 'info' | 'default' => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string): 'success' | 'primary' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'paused': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.default', minHeight: '100vh', p: 2 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Avatar sx={{ width: 56, height: 56 }}>
                {currentStaff?.first_name[0]}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h5" fontWeight="bold">
                Welcome, {currentStaff?.first_name} {currentStaff?.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentStaff?.role} • Efficiency Score: {currentStaff?.efficiency_score}%
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <LocationIcon fontSize="small" color="action" />
                <Typography variant="body2">{currentStaff?.current_location}</Typography>
                {currentStaff?.break_time_remaining && (
                  <>
                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                    <TimerIcon fontSize="small" color="warning" />
                    <Typography variant="body2" color="warning.main">
                      Break: {currentStaff.break_time_remaining}min left
                    </Typography>
                  </>
                )}
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" gap={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                  }
                  label="Auto-refresh"
                />
                <IconButton onClick={loadTasks}>
                  <RefreshIcon />
                </IconButton>
                {currentStaff?.phone && (
                  <IconButton color="primary">
                    <PhoneIcon />
                  </IconButton>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Active Task */}
      {selectedTask && (
        <Card sx={{ mb: 3, border: 2, borderColor: 'primary.main' }}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h6">Active Task: {selectedTask.title}</Typography>
                <Chip label={selectedTask.status} color={getStatusColor(selectedTask.status)} />
                <Chip label={selectedTask.priority} color={getPriorityColor(selectedTask.priority)} />
              </Box>
            }
            action={
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6" color="primary">
                  {formatTime(taskTimer.totalTime)}
                </Typography>
                <ButtonGroup>
                  {taskTimer.isRunning ? (
                    <IconButton onClick={pauseTask} color="warning">
                      <PauseIcon />
                    </IconButton>
                  ) : (
                    <IconButton onClick={resumeTask} color="success">
                      <PlayIcon />
                    </IconButton>
                  )}
                  <IconButton onClick={() => setNotesDialogOpen(true)}>
                    <CommentIcon />
                  </IconButton>
                </ButtonGroup>
              </Box>
            }
          />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="body1" paragraph>
                  {selectedTask.description}
                </Typography>
                
                {/* Progress Stepper */}
                <Stepper activeStep={currentCheckpoint} orientation="vertical">
                  {selectedTask.checkpoints.map((checkpoint, index) => (
                    <Step key={checkpoint.id}>
                      <StepLabel
                        optional={
                          <Box display="flex" gap={1} alignItems="center">
                            {checkpoint.photo_required && <PhotoCameraIcon fontSize="small" />}
                            <Typography variant="caption">
                              ~{checkpoint.estimated_duration}min
                            </Typography>
                          </Box>
                        }
                        StepIconComponent={() => (
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: checkpoint.completed ? 'success.main' : 
                                      index === currentCheckpoint ? 'primary.main' : 'grey.300',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {checkpoint.completed ? (
                              <CheckCircleIcon sx={{ color: 'white', fontSize: 16 }} />
                            ) : (
                              <Typography variant="caption" sx={{ color: 'white' }}>
                                {index + 1}
                              </Typography>
                            )}
                          </Box>
                        )}
                      >
                        {checkpoint.title}
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" paragraph>
                          {checkpoint.description}
                        </Typography>
                        {index === currentCheckpoint && !checkpoint.completed && (
                          <Box>
                            {checkpoint.photo_required && (
                              <Button
                                variant="outlined"
                                startIcon={<PhotoCameraIcon />}
                                onClick={() => setPhotoDialogOpen(true)}
                                sx={{ mr: 1, mb: 1 }}
                              >
                                Add Photo
                              </Button>
                            )}
                            <TextField
                              fullWidth
                              multiline
                              rows={2}
                              placeholder="Add notes for this checkpoint..."
                              value={checkpointNotes[checkpoint.id] || ''}
                              onChange={(e) => setCheckpointNotes(prev => ({
                                ...prev,
                                [checkpoint.id]: e.target.value
                              }))}
                              sx={{ mb: 2 }}
                            />
                            <Button
                              variant="contained"
                              onClick={() => completeCheckpoint(checkpoint.id)}
                              startIcon={<CheckCircleIcon />}
                            >
                              Complete Checkpoint
                            </Button>
                          </Box>
                        )}
                        {checkpoint.completed && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="success.main">
                              ✓ Completed at {checkpoint.completion_time && format(parseISO(checkpoint.completion_time), 'HH:mm')}
                            </Typography>
                            {checkpoint.notes && (
                              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                                Notes: {checkpoint.notes}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Task Details</Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Location:</strong> {selectedTask.location}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Due:</strong> {format(parseISO(selectedTask.due_time), 'MMM dd, HH:mm')}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Estimated:</strong> {selectedTask.estimated_duration}min
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Actual:</strong> {Math.floor(taskTimer.totalTime / 60000)}min
                  </Typography>
                </Paper>

                {selectedTask.tools_required.length > 0 && (
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Tools Required</Typography>
                    <List dense>
                      {selectedTask.tools_required.map((tool, index) => (
                        <ListItem key={index} sx={{ py: 0 }}>
                          <ListItemText primary={tool} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                {selectedTask.safety_notes.length > 0 && (
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.light' }}>
                    <Typography variant="subtitle2" gutterBottom color="warning.dark">
                      <WarningIcon fontSize="small" sx={{ mr: 1 }} />
                      Safety Notes
                    </Typography>
                    <List dense>
                      {selectedTask.safety_notes.map((note, index) => (
                        <ListItem key={index} sx={{ py: 0 }}>
                          <ListItemText 
                            primary={note} 
                            primaryTypographyProps={{ variant: 'body2', color: 'warning.dark' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                {selectedPhotos.length > 0 && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Photos ({selectedPhotos.length})
                    </Typography>
                    <Grid container spacing={1}>
                      {selectedPhotos.map((photo, index) => (
                        <Grid item xs={6} key={index}>
                          <Box
                            sx={{
                              position: 'relative',
                              aspectRatio: '1',
                              bgcolor: 'grey.200',
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <PhotoCameraIcon />
                            <IconButton
                              size="small"
                              sx={{ position: 'absolute', top: 4, right: 4 }}
                              onClick={() => removePhoto(index)}
                            >
                              <Remove />
                            </IconButton>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Available Tasks */}
      <Card>
        <CardHeader 
          title="Available Tasks" 
          action={
            <Badge badgeContent={tasks.filter(t => t.status === 'pending').length} color="primary">
              <TaskIcon />
            </Badge>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            {tasks.filter(task => task.status !== 'completed').map((task) => (
              <Grid item xs={12} md={6} lg={4} key={task.id}>
                <Card 
                  variant="outlined"
                  sx={{ 
                    height: '100%',
                    cursor: selectedTask?.id === task.id ? 'default' : 'pointer',
                    opacity: selectedTask?.id === task.id ? 0.7 : 1,
                    '&:hover': selectedTask?.id !== task.id ? { boxShadow: 3 } : {}
                  }}
                  onClick={() => selectedTask?.id !== task.id && startTask(task)}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                        {task.title}
                      </Typography>
                      <Box display="flex" gap={0.5} flexDirection="column">
                        <Chip
                          label={task.priority}
                          color={getPriorityColor(task.priority)}
                          size="small"
                        />
                        <Chip
                          label={task.status}
                          color={getStatusColor(task.status)}
                          size="small"
                        />
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" paragraph>
                      {task.description.substring(0, 100)}...
                    </Typography>

                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <LocationIcon fontSize="small" color="action" />
                      <Typography variant="body2">{task.location}</Typography>
                    </Box>

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="body2">
                        <TimerIcon fontSize="small" sx={{ mr: 0.5 }} />
                        {task.estimated_duration}min
                      </Typography>
                      <Typography variant="body2">
                        Due: {format(parseISO(task.due_time), 'HH:mm')}
                      </Typography>
                    </Box>

                    <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                      {task.photo_required && (
                        <Chip
                          icon={<PhotoCameraIcon />}
                          label="Photo Required"
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {task.manager_approval_required && (
                        <Chip
                          icon={<PersonIcon />}
                          label="Manager Approval"
                          size="small"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={`${task.checkpoints.length} steps`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    {selectedTask?.id === task.id && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        This task is currently active
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Photo Capture Dialog */}
      <Dialog open={photoDialogOpen} onClose={() => setPhotoDialogOpen(false)}>
        <DialogTitle>Add Photo</DialogTitle>
        <DialogContent>
          <Box textAlign="center" py={3}>
            <Button
              variant="contained"
              startIcon={<PhotoCameraIcon />}
              onClick={handlePhotoCapture}
              size="large"
            >
              Take Photo
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              multiple
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhotoDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Task Completion Dialog */}
      <Dialog 
        open={completionDialogOpen} 
        onClose={() => setCompletionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Complete Task</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            All checkpoints have been completed! Please provide final details:
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Completion Notes"
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" gutterBottom>
            Quality Score (1-5 stars)
          </Typography>
          <Box display="flex" gap={1} mb={3}>
            {[1, 2, 3, 4, 5].map((star) => (
              <IconButton
                key={star}
                onClick={() => setQualityScore(star)}
                color={star <= qualityScore ? 'primary' : 'default'}
              >
                <StarIcon />
              </IconButton>
            ))}
          </Box>

          {selectedTask?.photo_required && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Final Photos ({selectedPhotos.length} added)
              </Typography>
              <Button
                variant="outlined"
                startIcon={<PhotoCameraIcon />}
                onClick={() => setPhotoDialogOpen(true)}
                sx={{ mb: 2 }}
              >
                Add More Photos
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompletionDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={completeTask}
            disabled={selectedTask?.photo_required && selectedPhotos.length === 0}
          >
            Complete Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onClose={() => setNotesDialogOpen(false)}>
        <DialogTitle>Task Notes</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            placeholder="Add notes about this task..."
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setNotesDialogOpen(false)}>
            Save Notes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StaffTaskInterface;