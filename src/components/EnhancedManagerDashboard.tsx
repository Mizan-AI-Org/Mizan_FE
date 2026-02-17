import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as TaskIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as TimeIcon,
  AttachMoney as MoneyIcon,
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  PhotoCamera as PhotoCameraIcon,
  History as HistoryIcon,
  Star as StarIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { format, parseISO, startOfWeek, endOfWeek, isToday } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { DashboardSkeleton } from '@/components/skeletons';

interface DashboardStats {
  total_staff: number;
  active_shifts: number;
  pending_tasks: number;
  completed_tasks: number;
  total_labor_hours: number;
  labor_cost: number;
  efficiency_score: number;
  attendance_rate: number;
  revenue_per_hour: number;
  customer_satisfaction: number;
}

interface TaskProgress {
  id: number;
  title: string;
  assigned_to: {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string;
    phone?: string;
  };
  status: string;
  priority: string;
  due_time: string;
  completion_percentage: number;
  estimated_duration: number;
  actual_duration?: number;
  photo_required: boolean;
  photo_submitted: boolean;
  location: string;
  checkpoints: Array<{
    id: string;
    timestamp: string;
    description: string;
    progress: number;
  }>;
}

interface StaffActivity {
  id: number;
  staff: {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string;
    role: string;
    phone?: string;
    email?: string;
  };
  status: 'on_shift' | 'on_break' | 'off_shift' | 'late' | 'no_show';
  current_task?: string;
  shift_start: string;
  shift_end: string;
  tasks_completed: number;
  tasks_pending: number;
  efficiency_score: number;
  last_activity: string;
  location?: string;
  break_time_remaining?: number;
}

interface Alert {
  id: number;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  action_required: boolean;
  staff_id?: number;
  task_id?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PerformanceMetric {
  name: string;
  efficiency: number;
  tasks: number;
  labor_hours: number;
  revenue: number;
  customer_rating: number;
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

const EnhancedManagerDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('today');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Data states
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([]);
  const [staffActivity, setStaffActivity] = useState<StaffActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [laborCostData, setLaborCostData] = useState<any[]>([]);

  // Dialog states
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [staffDetailOpen, setStaffDetailOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskProgress | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffActivity | null>(null);

  // Mock data
  const mockStats: DashboardStats = {
    total_staff: 28,
    active_shifts: 22,
    pending_tasks: 47,
    completed_tasks: 189,
    total_labor_hours: 176,
    labor_cost: 4400,
    efficiency_score: 89,
    attendance_rate: 96,
    revenue_per_hour: 45.50,
    customer_satisfaction: 4.7
  };

  const mockTasks: TaskProgress[] = [
    {
      id: 1,
      title: "Kitchen Deep Clean & Sanitization",
      assigned_to: {
        id: 1,
        first_name: "John",
        last_name: "Smith",
        phone: "+1-555-0123"
      },
      status: "in_progress",
      priority: "high",
      due_time: "2024-01-20T14:00:00Z",
      completion_percentage: 75,
      estimated_duration: 120,
      actual_duration: 90,
      photo_required: true,
      photo_submitted: false,
      location: "Main Kitchen",
      checkpoints: [
        { id: '1', timestamp: '2024-01-20T12:00:00Z', description: 'Started equipment cleaning', progress: 25 },
        { id: '2', timestamp: '2024-01-20T12:30:00Z', description: 'Completed surface sanitization', progress: 50 },
        { id: '3', timestamp: '2024-01-20T13:00:00Z', description: 'Deep cleaned fryers', progress: 75 }
      ]
    },
    {
      id: 2,
      title: "Inventory Count - Dry Storage",
      assigned_to: {
        id: 2,
        first_name: "Sarah",
        last_name: "Johnson",
        phone: "+1-555-0124"
      },
      status: "pending",
      priority: "medium",
      due_time: "2024-01-20T16:00:00Z",
      completion_percentage: 0,
      estimated_duration: 60,
      photo_required: true,
      photo_submitted: false,
      location: "Storage Room A",
      checkpoints: []
    },
    {
      id: 3,
      title: "Customer Service Training Review",
      assigned_to: {
        id: 3,
        first_name: "Mike",
        last_name: "Wilson",
        phone: "+1-555-0125"
      },
      status: "overdue",
      priority: "high",
      due_time: "2024-01-20T13:00:00Z",
      completion_percentage: 30,
      estimated_duration: 90,
      actual_duration: 45,
      photo_required: false,
      photo_submitted: false,
      location: "Training Room",
      checkpoints: [
        { id: '4', timestamp: '2024-01-20T11:00:00Z', description: 'Started module 1', progress: 30 }
      ]
    }
  ];

  const mockStaff: StaffActivity[] = [
    {
      id: 1,
      staff: {
        id: 1,
        first_name: "John",
        last_name: "Smith",
        role: "Kitchen Manager",
        phone: "+1-555-0123",
        email: "john.smith@restaurant.com"
      },
      status: "on_shift",
      current_task: "Kitchen Deep Clean & Sanitization",
      shift_start: "2024-01-20T08:00:00Z",
      shift_end: "2024-01-20T16:00:00Z",
      tasks_completed: 4,
      tasks_pending: 2,
      efficiency_score: 94,
      last_activity: "2024-01-20T13:45:00Z",
      location: "Main Kitchen"
    },
    {
      id: 2,
      staff: {
        id: 2,
        first_name: "Sarah",
        last_name: "Johnson",
        role: "Server",
        phone: "+1-555-0124",
        email: "sarah.johnson@restaurant.com"
      },
      status: "on_break",
      shift_start: "2024-01-20T10:00:00Z",
      shift_end: "2024-01-20T18:00:00Z",
      tasks_completed: 6,
      tasks_pending: 1,
      efficiency_score: 91,
      last_activity: "2024-01-20T13:30:00Z",
      location: "Break Room",
      break_time_remaining: 8
    },
    {
      id: 3,
      staff: {
        id: 3,
        first_name: "Mike",
        last_name: "Wilson",
        role: "Host",
        phone: "+1-555-0125",
        email: "mike.wilson@restaurant.com"
      },
      status: "late",
      shift_start: "2024-01-20T14:00:00Z",
      shift_end: "2024-01-20T22:00:00Z",
      tasks_completed: 0,
      tasks_pending: 3,
      efficiency_score: 0,
      last_activity: "2024-01-20T13:45:00Z",
      location: "Unknown"
    }
  ];

  const mockAlerts: Alert[] = [
    {
      id: 1,
      type: "error",
      title: "Staff No-Show Alert",
      message: "Mike Wilson is 45 minutes late for his shift. Customer service may be impacted.",
      timestamp: "2024-01-20T14:45:00Z",
      is_read: false,
      action_required: true,
      staff_id: 3,
      severity: "critical"
    },
    {
      id: 2,
      type: "warning",
      title: "Task Overdue",
      message: "Customer Service Training Review is 1 hour overdue and only 30% complete.",
      timestamp: "2024-01-20T14:30:00Z",
      is_read: false,
      action_required: true,
      task_id: 3,
      severity: "high"
    },
    {
      id: 3,
      type: "warning",
      title: "Photo Verification Missing",
      message: "Kitchen Deep Clean task requires photo verification before completion.",
      timestamp: "2024-01-20T14:15:00Z",
      is_read: false,
      action_required: true,
      task_id: 1,
      severity: "medium"
    },
    {
      id: 4,
      type: "info",
      title: "High Efficiency Alert",
      message: "John Smith has achieved 94% efficiency score today - consider recognition.",
      timestamp: "2024-01-20T14:00:00Z",
      is_read: false,
      action_required: false,
      staff_id: 1,
      severity: "low"
    }
  ];

  const mockPerformanceData: PerformanceMetric[] = [
    { name: 'Mon', efficiency: 87, tasks: 52, labor_hours: 128, revenue: 5800, customer_rating: 4.5 },
    { name: 'Tue', efficiency: 91, tasks: 58, labor_hours: 142, revenue: 6200, customer_rating: 4.6 },
    { name: 'Wed', efficiency: 89, tasks: 55, labor_hours: 135, revenue: 6100, customer_rating: 4.7 },
    { name: 'Thu', efficiency: 93, tasks: 62, labor_hours: 148, revenue: 6800, customer_rating: 4.8 },
    { name: 'Fri', efficiency: 95, tasks: 68, labor_hours: 165, revenue: 7500, customer_rating: 4.7 },
    { name: 'Sat', efficiency: 88, tasks: 72, labor_hours: 180, revenue: 8200, customer_rating: 4.6 },
    { name: 'Sun', efficiency: 85, tasks: 58, labor_hours: 156, revenue: 6900, customer_rating: 4.5 }
  ];

  const mockLaborCostData = [
    { name: 'Kitchen Staff', value: 1800, percentage: 41, hours: 72 },
    { name: 'Service Staff', value: 1200, percentage: 27, hours: 48 },
    { name: 'Management', value: 800, percentage: 18, hours: 32 },
    { name: 'Cleaning', value: 400, percentage: 9, hours: 16 },
    { name: 'Other', value: 200, percentage: 5, hours: 8 }
  ];

  useEffect(() => {
    loadDashboardData();

    // Set up real-time updates
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        if (!refreshing) {
          loadDashboardData(true);
        }
      }, 30000); // Update every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTimeRange, autoRefresh]);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      setDashboardStats(mockStats);
      setTaskProgress(mockTasks);
      setStaffActivity(mockStaff);
      setAlerts(mockAlerts);
      setPerformanceData(mockPerformanceData);
      setLaborCostData(mockLaborCostData);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
  };

  const handleTaskClick = (task: TaskProgress) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  const handleStaffClick = (staff: StaffActivity) => {
    setSelectedStaff(staff);
    setStaffDetailOpen(true);
  };

  const handleMarkAlertRead = async (alertId: number) => {
    try {
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId ? { ...alert, is_read: true } : alert
      ));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const getStatusColor = (status: string): 'success' | 'primary' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getStaffStatusColor = (status: string): 'success' | 'warning' | 'default' | 'error' => {
    switch (status) {
      case 'on_shift': return 'success';
      case 'on_break': return 'warning';
      case 'off_shift': return 'default';
      case 'late': return 'error';
      case 'no_show': return 'error';
      default: return 'default';
    }
  };

  const getSeverityColor = (status: string): 'error' | 'warning' | 'info' | 'success' | 'default' => {
    switch (status) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <DashboardSkeleton statCount={4} contentCards={3} />
      </Box>
    );
  }

  const criticalAlerts = alerts.filter(a => !a.is_read && a.severity === 'critical');
  const highPriorityTasks = taskProgress.filter(t => t.priority === 'high' && t.status !== 'completed');
  const staffIssues = staffActivity.filter(s => s.status === 'late' || s.status === 'no_show');

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.default', minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Enhanced Manager Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Real-time operations control center
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={selectedTimeRange}
              label="Time Range"
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Auto-refresh enabled">
            <IconButton
              color={autoRefresh ? 'primary' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Badge badgeContent={alerts.filter(a => !a.is_read).length} color="error">
            <IconButton>
              <NotificationsIcon />
            </IconButton>
          </Badge>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => console.log('Export report')}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small">
              View All ({criticalAlerts.length})
            </Button>
          }
        >
          <Typography variant="subtitle2">
            {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''} require immediate attention
          </Typography>
        </Alert>
      )}

      {/* Enhanced Key Metrics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Staff Status
                  </Typography>
                  <Typography variant="h4">
                    {dashboardStats?.active_shifts}/{dashboardStats?.total_staff}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <PeopleIcon />
                </Avatar>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(dashboardStats?.active_shifts || 0) / (dashboardStats?.total_staff || 1) * 100}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {dashboardStats?.attendance_rate}% attendance rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Task Progress
                  </Typography>
                  <Typography variant="h4">
                    {dashboardStats?.completed_tasks}/{(dashboardStats?.completed_tasks || 0) + (dashboardStats?.pending_tasks || 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <TaskIcon />
                </Avatar>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(dashboardStats?.completed_tasks || 0) / ((dashboardStats?.completed_tasks || 0) + (dashboardStats?.pending_tasks || 1)) * 100}
                sx={{ mb: 1 }}
                color="success"
              />
              <Typography variant="body2" color="text.secondary">
                {highPriorityTasks.length} high priority pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Efficiency Score
                  </Typography>
                  <Typography variant="h4">
                    {dashboardStats?.efficiency_score}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <SpeedIcon />
                </Avatar>
              </Box>
              <LinearProgress
                variant="determinate"
                value={dashboardStats?.efficiency_score || 0}
                sx={{ mb: 1 }}
                color="warning"
              />
              <Typography variant="body2" color="text.secondary">
                ${dashboardStats?.revenue_per_hour}/hour revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Labor Cost
                  </Typography>
                  <Typography variant="h4">
                    ${dashboardStats?.labor_cost}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                  <MoneyIcon />
                </Avatar>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {dashboardStats?.total_labor_hours} hours scheduled
              </Typography>
              <Typography variant="body2" color="success.main">
                ⭐ {dashboardStats?.customer_satisfaction}/5.0 satisfaction
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions Floating Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => console.log('Quick actions')}
      >
        <SettingsIcon />
      </Fab>

      {/* Main Content Tabs */}
      <Card>
        <Tabs value={currentTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <TaskIcon />
                Real-time Tasks
                {highPriorityTasks.length > 0 && (
                  <Chip label={highPriorityTasks.length} size="small" color="error" />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <PeopleIcon />
                Staff Activity
                {staffIssues.length > 0 && (
                  <Chip label={staffIssues.length} size="small" color="error" />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <AssessmentIcon />
                Performance Analytics
              </Box>
            }
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <NotificationsIcon />
                Alerts & Issues
                {alerts.filter(a => !a.is_read).length > 0 && (
                  <Chip label={alerts.filter(a => !a.is_read).length} size="small" color="error" />
                )}
              </Box>
            }
          />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          {/* Enhanced Real-time Tasks */}
          <Grid container spacing={3}>
            {taskProgress.map((task) => (
              <Grid item xs={12} md={6} lg={4} key={task.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 3 }
                  }}
                  onClick={() => handleTaskClick(task)}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                        {task.title}
                      </Typography>
                      <Chip
                        label={task.status.replace('_', ' ')}
                        color={getStatusColor(task.status)}
                        size="small"
                      />
                    </Box>

                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {task.assigned_to.first_name[0]}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="body2">
                          {task.assigned_to.first_name} {task.assigned_to.last_name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LocationIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {task.location}
                          </Typography>
                        </Box>
                      </Box>
                      {task.assigned_to.phone && (
                        <IconButton size="small" href={`tel:${task.assigned_to.phone}`}>
                          <PhoneIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <Box mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">Progress</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {task.completion_percentage}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={task.completion_percentage}
                        color={getStatusColor(task.status)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>

                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Due Time
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {format(parseISO(task.due_time), 'HH:mm')}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Duration
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {task.actual_duration || task.estimated_duration}min
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                      <Chip
                        label={task.priority}
                        color={(task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'default') as 'error' | 'warning' | 'default'}
                        size="small"
                      />
                      {task.photo_required && (
                        <Chip
                          icon={<PhotoCameraIcon />}
                          label={task.photo_submitted ? 'Photo ✓' : 'Photo Required'}
                          color={task.photo_submitted ? 'success' : 'warning'}
                          size="small"
                        />
                      )}
                      {task.checkpoints.length > 0 && (
                        <Chip
                          icon={<TimelineIcon />}
                          label={`${task.checkpoints.length} checkpoints`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* Enhanced Staff Activity */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Current Activity</TableCell>
                  <TableCell>Shift Time</TableCell>
                  <TableCell>Tasks</TableCell>
                  <TableCell>Efficiency</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staffActivity.map((staff) => (
                  <TableRow
                    key={staff.id}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => handleStaffClick(staff)}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar>{staff.staff.first_name[0]}</Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {staff.staff.first_name} {staff.staff.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {staff.staff.role}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={staff.status.replace('_', ' ')}
                        color={getStaffStatusColor(staff.status) as any}
                        size="small"
                      />
                      {staff.break_time_remaining && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Break: {staff.break_time_remaining}min left
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {staff.current_task || 'No active task'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(parseISO(staff.shift_start), 'HH:mm')} - {format(parseISO(staff.shift_end), 'HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          ✅ {staff.tasks_completed} | ⏳ {staff.tasks_pending}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(staff.tasks_completed / (staff.tasks_completed + staff.tasks_pending)) * 100}
                          sx={{ width: 80, height: 4, mt: 0.5 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="medium">
                          {staff.efficiency_score}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={staff.efficiency_score}
                          sx={{ width: 60, height: 4 }}
                          color={staff.efficiency_score >= 90 ? 'success' : staff.efficiency_score >= 70 ? 'warning' : 'error'}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {staff.location || 'Unknown'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        {staff.staff.phone && (
                          <IconButton size="small" href={`tel:${staff.staff.phone}`}>
                            <PhoneIcon fontSize="small" />
                          </IconButton>
                        )}
                        {staff.staff.email && (
                          <IconButton size="small" href={`mailto:${staff.staff.email}`}>
                            <EmailIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          {/* Enhanced Performance Analytics */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Card>
                <CardHeader title="Weekly Performance Trends" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <RechartsTooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="efficiency" stroke="#8884d8" name="Efficiency %" strokeWidth={3} />
                      <Line yAxisId="left" type="monotone" dataKey="customer_rating" stroke="#82ca9d" name="Customer Rating" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#ffc658" name="Revenue ($)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Labor Cost Breakdown" />
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={laborCostData}
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ percentage }) => `${percentage}%`}
                          >
                            {laborCostData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Today's Metrics" />
                    <CardContent>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Tasks Completed"
                            secondary={`${dashboardStats?.completed_tasks} tasks`}
                          />
                          <Chip label="+12%" color="success" size="small" />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Labor Hours"
                            secondary={`${dashboardStats?.total_labor_hours} hours`}
                          />
                          <Chip label="+5%" color="success" size="small" />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Efficiency"
                            secondary={`${dashboardStats?.efficiency_score}%`}
                          />
                          <Chip label="+3%" color="success" size="small" />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          {/* Enhanced Alerts & Issues */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader
                  title="Active Alerts"
                  action={
                    <Button size="small" onClick={() => setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))}>
                      Mark All Read
                    </Button>
                  }
                />
                <CardContent>
                  <List>
                    {alerts.map((alert) => (
                      <ListItem
                        key={alert.id}
                        button
                        onClick={() => handleAlertClick(alert)}
                        sx={{
                          border: 1,
                          borderColor: `${getSeverityColor(alert.severity)}.main`,
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: alert.is_read ? 'action.hover' : `${getSeverityColor(alert.severity)}.light`,
                          opacity: alert.is_read ? 0.7 : 1
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: `${getSeverityColor(alert.severity)}.main` }}>
                            {alert.type === 'warning' && <WarningIcon />}
                            {alert.type === 'error' && <ErrorIcon />}
                            {alert.type === 'info' && <InfoIcon />}
                            {alert.type === 'success' && <CheckCircleIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle2">{alert.title}</Typography>
                              <Chip label={alert.severity} size="small" color={getSeverityColor(alert.severity) as any} />
                              {alert.action_required && (
                                <Chip label="Action Required" size="small" color="error" variant="outlined" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2">{alert.message}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(parseISO(alert.timestamp), 'MMM dd, HH:mm')}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAlertRead(alert.id);
                            }}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="Alert Summary" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h3" color="error.main">
                          {alerts.filter(a => a.severity === 'critical').length}
                        </Typography>
                        <Typography variant="body2">Critical</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h3" color="warning.main">
                          {alerts.filter(a => a.severity === 'high').length}
                        </Typography>
                        <Typography variant="body2">High</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h3" color="info.main">
                          {alerts.filter(a => a.severity === 'medium').length}
                        </Typography>
                        <Typography variant="body2">Medium</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h3" color="success.main">
                          {alerts.filter(a => a.severity === 'low').length}
                        </Typography>
                        <Typography variant="body2">Low</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Task Detail Dialog */}
      <Dialog
        open={taskDetailOpen}
        onClose={() => setTaskDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Task Details: {selectedTask?.title}
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Progress</Typography>
                <LinearProgress
                  variant="determinate"
                  value={selectedTask.completion_percentage}
                  sx={{ height: 8, borderRadius: 4, mb: 2 }}
                />
                <Typography variant="body2" gutterBottom>
                  <strong>Assigned to:</strong> {selectedTask.assigned_to.first_name} {selectedTask.assigned_to.last_name}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Location:</strong> {selectedTask.location}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Due:</strong> {format(parseISO(selectedTask.due_time), 'MMM dd, yyyy HH:mm')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Checkpoints</Typography>
                <List dense>
                  {selectedTask.checkpoints.map((checkpoint) => (
                    <ListItem key={checkpoint.id}>
                      <ListItemText
                        primary={checkpoint.description}
                        secondary={format(parseISO(checkpoint.timestamp), 'HH:mm')}
                      />
                      <Chip label={`${checkpoint.progress}%`} size="small" />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDetailOpen(false)}>Close</Button>
          <Button variant="contained" color="primary">
            Contact Staff
          </Button>
        </DialogActions>
      </Dialog>

      {/* Staff Detail Dialog */}
      <Dialog
        open={staffDetailOpen}
        onClose={() => setStaffDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Staff Details: {selectedStaff?.staff.first_name} {selectedStaff?.staff.last_name}
        </DialogTitle>
        <DialogContent>
          {selectedStaff && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Role:</strong> {selectedStaff.staff.role}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Status:</strong> {selectedStaff.status.replace('_', ' ')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Current Task:</strong> {selectedStaff.current_task || 'None'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Efficiency Score:</strong> {selectedStaff.efficiency_score}%
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Tasks Today:</strong> {selectedStaff.tasks_completed} completed, {selectedStaff.tasks_pending} pending
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Last Activity:</strong> {format(parseISO(selectedStaff.last_activity), 'HH:mm')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStaffDetailOpen(false)}>Close</Button>
          {selectedStaff?.staff.phone && (
            <Button variant="contained" href={`tel:${selectedStaff.staff.phone}`}>
              Call
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Alert Detail Dialog */}
      <Dialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedAlert?.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            {selectedAlert?.message}
          </Typography>
          <Box display="flex" gap={1} mb={2}>
            <Chip label={selectedAlert?.type} color={selectedAlert?.type as any} size="small" />
            <Chip label={selectedAlert?.severity} color={getSeverityColor(selectedAlert?.severity || '') as any} size="small" />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {selectedAlert && format(parseISO(selectedAlert.timestamp), 'MMM dd, yyyy HH:mm')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialogOpen(false)}>Close</Button>
          {selectedAlert?.action_required && (
            <Button variant="contained" color="primary">
              Take Action
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedManagerDashboard;