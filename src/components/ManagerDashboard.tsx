import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as TaskIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, isToday } from 'date-fns';

interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  assigned_to: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
    color: string;
  };
  estimated_duration: number;
  progress_percentage: number;
  created_at: string;
  due_date: string;
  completed_at?: string;
  checkpoints: Array<{
    id: string;
    timestamp: string;
    description: string;
    location: string;
    progress_percentage: number;
    photo?: string;
  }>;
}

interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  workload_score: number;
}

interface DashboardStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  total_staff: number;
  active_staff: number;
  completion_rate: number;
  average_completion_time: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ManagerDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Mock data for demonstration
  const mockStats: DashboardStats = {
    total_tasks: 45,
    completed_tasks: 28,
    in_progress_tasks: 12,
    overdue_tasks: 5,
    total_staff: 15,
    active_staff: 12,
    completion_rate: 85.2,
    average_completion_time: 2.5
  };

  const mockTasks: Task[] = [
    {
      id: 1,
      title: "Clean Kitchen Equipment",
      description: "Deep clean all kitchen equipment including ovens, grills, and fryers",
      priority: "HIGH",
      status: "IN_PROGRESS",
      assigned_to: { id: 1, first_name: "John", last_name: "Doe", email: "john@example.com" },
      category: { id: 1, name: "Cleaning", color: "#4CAF50" },
      estimated_duration: 120,
      progress_percentage: 65,
      created_at: "2024-01-15T08:00:00Z",
      due_date: "2024-01-15T18:00:00Z",
      checkpoints: [
        {
          id: "1",
          timestamp: "2024-01-15T10:00:00Z",
          description: "Started cleaning ovens",
          location: "Kitchen",
          progress_percentage: 30
        },
        {
          id: "2",
          timestamp: "2024-01-15T12:00:00Z",
          description: "Completed oven cleaning, starting grills",
          location: "Kitchen",
          progress_percentage: 65
        }
      ]
    },
    {
      id: 2,
      title: "Inventory Count",
      description: "Complete inventory count for all dry goods",
      priority: "MEDIUM",
      status: "TODO",
      assigned_to: { id: 2, first_name: "Jane", last_name: "Smith", email: "jane@example.com" },
      category: { id: 2, name: "Inventory", color: "#FF9800" },
      estimated_duration: 90,
      progress_percentage: 0,
      created_at: "2024-01-15T09:00:00Z",
      due_date: "2024-01-15T16:00:00Z",
      checkpoints: []
    },
    {
      id: 3,
      title: "Staff Training Session",
      description: "Conduct food safety training for new staff members",
      priority: "URGENT",
      status: "OVERDUE",
      assigned_to: { id: 3, first_name: "Mike", last_name: "Johnson", email: "mike@example.com" },
      category: { id: 3, name: "Training", color: "#F44336" },
      estimated_duration: 180,
      progress_percentage: 20,
      created_at: "2024-01-14T08:00:00Z",
      due_date: "2024-01-14T17:00:00Z",
      checkpoints: [
        {
          id: "1",
          timestamp: "2024-01-14T09:00:00Z",
          description: "Prepared training materials",
          location: "Training Room",
          progress_percentage: 20
        }
      ]
    }
  ];

  const mockStaff: Staff[] = [
    {
      id: 1,
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      role: "Kitchen Staff",
      total_tasks: 8,
      completed_tasks: 6,
      in_progress_tasks: 2,
      overdue_tasks: 0,
      workload_score: 75
    },
    {
      id: 2,
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com",
      role: "Server",
      total_tasks: 5,
      completed_tasks: 3,
      in_progress_tasks: 1,
      overdue_tasks: 1,
      workload_score: 60
    },
    {
      id: 3,
      first_name: "Mike",
      last_name: "Johnson",
      email: "mike@example.com",
      role: "Supervisor",
      total_tasks: 12,
      completed_tasks: 8,
      in_progress_tasks: 3,
      overdue_tasks: 1,
      workload_score: 85
    }
  ];

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // In a real app, these would be API calls
      // const [tasksResponse, staffResponse, statsResponse] = await Promise.all([
      //   fetch('/api/tasks/'),
      //   fetch('/api/staff/workload/'),
      //   fetch('/api/dashboard/stats/')
      // ]);
      
      // For now, use mock data
      setTasks(mockTasks);
      setStaff(mockStaff);
      setStats(mockStats);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleTaskDialogClose = () => {
    setTaskDialogOpen(false);
    setSelectedTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '#F44336';
      case 'HIGH': return '#FF9800';
      case 'MEDIUM': return '#2196F3';
      case 'LOW': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#4CAF50';
      case 'IN_PROGRESS': return '#2196F3';
      case 'TODO': return '#757575';
      case 'OVERDUE': return '#F44336';
      default: return '#757575';
    }
  };

  const getWorkloadColor = (score: number) => {
    if (score >= 80) return '#F44336';
    if (score >= 60) return '#FF9800';
    return '#4CAF50';
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    return true;
  });

  if (loading && !stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.default', minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Manager Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDashboardData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Tasks
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stats.total_tasks}
                    </Typography>
                  </Box>
                  <TaskIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Completion Rate
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stats.completion_rate}%
                    </Typography>
                  </Box>
                  <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Active Staff
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stats.active_staff}/{stats.total_staff}
                    </Typography>
                  </Box>
                  <PeopleIcon color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Overdue Tasks
                    </Typography>
                    <Typography variant="h4" component="div" color="error">
                      {stats.overdue_tasks}
                    </Typography>
                  </Box>
                  <WarningIcon color="error" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Task Overview" />
            <Tab label="Staff Performance" />
            <Tab label="Real-time Monitoring" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        {/* Task Overview Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box mb={2} display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="TODO">To Do</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="OVERDUE">Overdue</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filterPriority}
                label="Priority"
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {task.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {task.description.substring(0, 50)}...
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {task.assigned_to.first_name[0]}
                        </Avatar>
                        <Typography variant="body2">
                          {task.assigned_to.first_name} {task.assigned_to.last_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.priority}
                        size="small"
                        sx={{
                          backgroundColor: getPriorityColor(task.priority),
                          color: 'white'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.status.replace('_', ' ')}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(task.status),
                          color: 'white'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={task.progress_percentage}
                          sx={{ width: 80, height: 6 }}
                        />
                        <Typography variant="body2">
                          {task.progress_percentage}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={new Date(task.due_date) < new Date() ? 'error' : 'textPrimary'}
                      >
                        {format(new Date(task.due_date), 'MMM dd, HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleTaskClick(task)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Staff Performance Tab */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            {staff.map((member) => (
              <Grid item xs={12} md={6} lg={4} key={member.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Avatar sx={{ width: 48, height: 48 }}>
                        {member.first_name[0]}{member.last_name[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {member.first_name} {member.last_name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {member.role}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box mb={2}>
                      <Typography variant="body2" gutterBottom>
                        Workload Score
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={member.workload_score}
                        sx={{
                          height: 8,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getWorkloadColor(member.workload_score)
                          }
                        }}
                      />
                      <Typography variant="body2" color="textSecondary" mt={0.5}>
                        {member.workload_score}%
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Total Tasks
                        </Typography>
                        <Typography variant="h6">
                          {member.total_tasks}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Completed
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {member.completed_tasks}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          In Progress
                        </Typography>
                        <Typography variant="h6" color="info.main">
                          {member.in_progress_tasks}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Overdue
                        </Typography>
                        <Typography variant="h6" color="error.main">
                          {member.overdue_tasks}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Real-time Monitoring Tab */}
        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Live Task Updates
          </Typography>
          <List>
            {tasks
              .filter(task => task.status === 'IN_PROGRESS')
              .map((task) => (
                <React.Fragment key={task.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getStatusColor(task.status) }}>
                        <TaskIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={task.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Assigned to: {task.assigned_to.first_name} {task.assigned_to.last_name}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={task.progress_percentage}
                            sx={{ mt: 1, width: '100%' }}
                          />
                          <Typography variant="body2" color="textSecondary" mt={0.5}>
                            Progress: {task.progress_percentage}%
                          </Typography>
                          {task.checkpoints.length > 0 && (
                            <Typography variant="body2" color="textSecondary">
                              Last update: {task.checkpoints[task.checkpoints.length - 1].description}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
          </List>
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={currentTab} index={3}>
          <Typography variant="h6" gutterBottom>
            Performance Analytics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Task Completion Trends
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Analytics charts would be implemented here using a charting library like Chart.js or Recharts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Staff Performance Metrics
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Detailed performance metrics and comparisons would be displayed here
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Task Detail Dialog */}
      <Dialog
        open={taskDialogOpen}
        onClose={handleTaskDialogClose}
        maxWidth="md"
        fullWidth
      >
        {selectedTask && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{selectedTask.title}</Typography>
                <Chip
                  label={selectedTask.status.replace('_', ' ')}
                  sx={{
                    backgroundColor: getStatusColor(selectedTask.status),
                    color: 'white'
                  }}
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box mb={2}>
                <Typography variant="body1" gutterBottom>
                  {selectedTask.description}
                </Typography>
              </Box>
              
              <Grid container spacing={2} mb={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Assigned To
                  </Typography>
                  <Typography variant="body1">
                    {selectedTask.assigned_to.first_name} {selectedTask.assigned_to.last_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Priority
                  </Typography>
                  <Chip
                    label={selectedTask.priority}
                    size="small"
                    sx={{
                      backgroundColor: getPriorityColor(selectedTask.priority),
                      color: 'white'
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Progress
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={selectedTask.progress_percentage}
                      sx={{ width: 100 }}
                    />
                    <Typography variant="body2">
                      {selectedTask.progress_percentage}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Due Date
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedTask.due_date), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Grid>
              </Grid>

              {selectedTask.checkpoints.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Progress Checkpoints
                  </Typography>
                  <List>
                    {selectedTask.checkpoints.map((checkpoint) => (
                      <ListItem key={checkpoint.id}>
                        <ListItemText
                          primary={checkpoint.description}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="textSecondary">
                                {format(new Date(checkpoint.timestamp), 'MMM dd, HH:mm')} - {checkpoint.location}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                Progress: {checkpoint.progress_percentage}%
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleTaskDialogClose}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ManagerDashboard;