import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Divider,
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
  Checkbox,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  ListItemIcon,
  Tooltip,
  Badge,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  Assignment as TaskIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Compare as CompareIcon,
  Restore as RestoreIcon,
  Archive as ArchiveIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

interface TemplateVersion {
  id: number;
  version: string;
  created_at: string;
  created_by: {
    id: number;
    first_name: string;
    last_name: string;
  };
  changes_summary: string;
  is_current: boolean;
  shifts_count: number;
  tasks_count: number;
}

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  created_by: {
    id: number;
    first_name: string;
    last_name: string;
  };
  shifts_count: number;
  tasks_count: number;
  usage_count: number;
  versions: TemplateVersion[];
  tags: string[];
  estimated_labor_hours: number;
  estimated_cost: number;
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
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EnhancedTemplateManager: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  
  // Selected items
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<TemplateVersion[]>([]);
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTemplate, setMenuTemplate] = useState<Template | null>(null);

  // Mock data
  const mockTemplates: Template[] = [
    {
      id: 1,
      name: "Weekend Rush Template",
      description: "High-volume weekend schedule with extra kitchen staff",
      category: "Weekend",
      is_active: true,
      is_favorite: true,
      created_at: "2024-01-10T08:00:00Z",
      updated_at: "2024-01-15T10:30:00Z",
      created_by: { id: 1, first_name: "John", last_name: "Manager" },
      shifts_count: 12,
      tasks_count: 25,
      usage_count: 15,
      estimated_labor_hours: 96,
      estimated_cost: 2400,
      tags: ["high-volume", "weekend", "kitchen-heavy"],
      versions: [
        {
          id: 1,
          version: "1.2",
          created_at: "2024-01-15T10:30:00Z",
          created_by: { id: 1, first_name: "John", last_name: "Manager" },
          changes_summary: "Added extra prep cook shift",
          is_current: true,
          shifts_count: 12,
          tasks_count: 25
        },
        {
          id: 2,
          version: "1.1",
          created_at: "2024-01-12T14:20:00Z",
          created_by: { id: 1, first_name: "John", last_name: "Manager" },
          changes_summary: "Updated break schedules",
          is_current: false,
          shifts_count: 11,
          tasks_count: 23
        }
      ]
    },
    {
      id: 2,
      name: "Weekday Standard",
      description: "Standard weekday schedule for regular operations",
      category: "Weekday",
      is_active: true,
      is_favorite: false,
      created_at: "2024-01-05T09:00:00Z",
      updated_at: "2024-01-08T16:45:00Z",
      created_by: { id: 2, first_name: "Jane", last_name: "Supervisor" },
      shifts_count: 8,
      tasks_count: 18,
      usage_count: 32,
      estimated_labor_hours: 64,
      estimated_cost: 1600,
      tags: ["standard", "weekday", "balanced"],
      versions: [
        {
          id: 3,
          version: "2.0",
          created_at: "2024-01-08T16:45:00Z",
          created_by: { id: 2, first_name: "Jane", last_name: "Supervisor" },
          changes_summary: "Major revision with new task assignments",
          is_current: true,
          shifts_count: 8,
          tasks_count: 18
        }
      ]
    }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      // In a real app, this would be an API call
      // const response = await fetch('/api/schedule-templates/');
      // const data = await response.json();
      setTemplates(mockTemplates);
      setError(null);
    } catch (err) {
      setError('Failed to load templates');
      console.error('Template load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleTemplateSelect = (templateId: number) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTemplates.length === filteredTemplates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(filteredTemplates.map(t => t.id));
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: Template) => {
    setAnchorEl(event.currentTarget);
    setMenuTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTemplate(null);
  };

  const handleViewHistory = (template: Template) => {
    setSelectedTemplate(template);
    setVersionHistoryOpen(true);
    handleMenuClose();
  };

  const handleCompareVersions = (template: Template) => {
    setSelectedTemplate(template);
    setCompareDialogOpen(true);
    handleMenuClose();
  };

  const handleToggleFavorite = async (template: Template) => {
    try {
      // In a real app, this would be an API call
      // await fetch(`/api/schedule-templates/${template.id}/toggle-favorite/`, { method: 'POST' });
      
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, is_favorite: !t.is_favorite } : t
      ));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
    handleMenuClose();
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      // In a real app, this would be an API call
      // const response = await fetch(`/api/schedule-templates/${template.id}/duplicate/`, { method: 'POST' });
      
      const duplicatedTemplate = {
        ...template,
        id: Date.now(), // Mock ID
        name: `${template.name} (Copy)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0,
        versions: [{
          ...template.versions[0],
          id: Date.now(),
          version: "1.0",
          created_at: new Date().toISOString(),
          changes_summary: "Duplicated from original template"
        }]
      };
      
      setTemplates(prev => [duplicatedTemplate, ...prev]);
    } catch (err) {
      console.error('Failed to duplicate template:', err);
    }
    handleMenuClose();
  };

  const handleBulkAction = async (action: string) => {
    try {
      switch (action) {
        case 'activate':
          setTemplates(prev => prev.map(t => 
            selectedTemplates.includes(t.id) ? { ...t, is_active: true } : t
          ));
          break;
        case 'deactivate':
          setTemplates(prev => prev.map(t => 
            selectedTemplates.includes(t.id) ? { ...t, is_active: false } : t
          ));
          break;
        case 'delete':
          setTemplates(prev => prev.filter(t => !selectedTemplates.includes(t.id)));
          break;
        case 'export':
          // Handle export logic
          console.log('Exporting templates:', selectedTemplates);
          break;
      }
      setSelectedTemplates([]);
      setBulkActionsOpen(false);
    } catch (err) {
      console.error('Bulk action failed:', err);
    }
  };

  const filteredTemplates = templates.filter(template => {
    if (filterCategory !== 'all' && template.category !== filterCategory) return false;
    if (filterStatus === 'active' && !template.is_active) return false;
    if (filterStatus === 'inactive' && template.is_active) return false;
    if (filterStatus === 'favorites' && !template.is_favorite) return false;
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const categories = Array.from(new Set(templates.map(t => t.category)));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading templates...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.default', minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Template Manager
        </Typography>
        <Box display="flex" gap={2}>
          {selectedTemplates.length > 0 && (
            <Button
              variant="outlined"
              onClick={() => setBulkActionsOpen(true)}
              startIcon={<EditIcon />}
            >
              Bulk Actions ({selectedTemplates.length})
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setTemplateDialogOpen(true)}
          >
            New Template
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search templates"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  label="Category"
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="favorites">Favorites</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSelectAll}
                startIcon={<CheckCircleIcon />}
              >
                {selectedTemplates.length === filteredTemplates.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <Grid container spacing={3}>
        {filteredTemplates.map((template) => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                border: selectedTemplates.includes(template.id) ? 2 : 1,
                borderColor: selectedTemplates.includes(template.id) ? 'primary.main' : 'divider'
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Checkbox
                      checked={selectedTemplates.includes(template.id)}
                      onChange={() => handleTemplateSelect(template.id)}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleToggleFavorite(template)}
                    >
                      {template.is_favorite ? <StarIcon color="warning" /> : <StarBorderIcon />}
                    </IconButton>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={template.category}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, template)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="h6" component="h2" gutterBottom>
                  {template.name}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {template.description}
                </Typography>

                <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                  {template.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>

                <Grid container spacing={2} mb={2}>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {template.shifts_count} shifts
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <TaskIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {template.tasks_count} tasks
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Used {template.usage_count} times
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      v{template.versions[0]?.version}
                    </Typography>
                  </Grid>
                </Grid>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Labor: {template.estimated_labor_hours}h • Cost: ${template.estimated_cost}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(template.usage_count / 50) * 100} // Mock usage percentage
                    sx={{ height: 4 }}
                  />
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={template.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={template.is_active ? 'success' : 'default'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Updated {format(parseISO(template.updated_at), 'MMM dd')}
                  </Typography>
                </Box>
              </CardContent>

              <CardActions>
                <Button size="small" startIcon={<ViewIcon />}>
                  View
                </Button>
                <Button size="small" startIcon={<EditIcon />}>
                  Edit
                </Button>
                <Button 
                  size="small" 
                  startIcon={<HistoryIcon />}
                  onClick={() => handleViewHistory(template)}
                >
                  History
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItemComponent onClick={() => handleViewHistory(menuTemplate!)}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          View History
        </MenuItemComponent>
        <MenuItemComponent onClick={() => handleCompareVersions(menuTemplate!)}>
          <ListItemIcon>
            <CompareIcon fontSize="small" />
          </ListItemIcon>
          Compare Versions
        </MenuItemComponent>
        <MenuItemComponent onClick={() => handleDuplicateTemplate(menuTemplate!)}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          Duplicate
        </MenuItemComponent>
        <MenuItemComponent onClick={() => handleToggleFavorite(menuTemplate!)}>
          <ListItemIcon>
            {menuTemplate?.is_favorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
          </ListItemIcon>
          {menuTemplate?.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </MenuItemComponent>
        <Divider />
        <MenuItemComponent>
          <ListItemIcon>
            <ArchiveIcon fontSize="small" />
          </ListItemIcon>
          Archive
        </MenuItemComponent>
        <MenuItemComponent sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete
        </MenuItemComponent>
      </Menu>

      {/* Version History Dialog */}
      <Dialog
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Version History - {selectedTemplate?.name}
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <List>
              {selectedTemplate.versions.map((version) => (
                <React.Fragment key={version.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: version.is_current ? 'primary.main' : 'grey.400' }}>
                        {version.version}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            Version {version.version}
                          </Typography>
                          {version.is_current && (
                            <Chip label="Current" size="small" color="primary" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {version.changes_summary}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(parseISO(version.created_at), 'MMM dd, yyyy HH:mm')} by{' '}
                            {version.created_by.first_name} {version.created_by.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {version.shifts_count} shifts • {version.tasks_count} tasks
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {!version.is_current && (
                          <Tooltip title="Restore Version">
                            <IconButton size="small">
                              <RestoreIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog
        open={bulkActionsOpen}
        onClose={() => setBulkActionsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Bulk Actions ({selectedTemplates.length} templates selected)
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleBulkAction('activate')}
              >
                Activate All
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<WarningIcon />}
                onClick={() => handleBulkAction('deactivate')}
              >
                Deactivate All
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => handleBulkAction('export')}
              >
                Export
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleBulkAction('delete')}
              >
                Delete All
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkActionsOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedTemplateManager;