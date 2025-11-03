import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import StandardOperatingProcedureList from '@/components/safety/StandardOperatingProcedureList';
import SafetyChecklistComponent from '@/components/safety/SafetyChecklistComponent';
import ScheduleTaskManager from '@/components/safety/ScheduleTaskManager';
import SafetyConcernReporting from '@/components/safety/SafetyConcernReporting';
import SafetyRecognitionComponent from '@/components/safety/SafetyRecognition';
import TaskManagementInterface from '@/components/safety/TaskManagementInterface';
import { useAuth } from '@/hooks/use-auth';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface MyTaskItem {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  progress_percentage: number;
}

const SafetyDashboard: React.FC = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isStaffLevel = !isManager;
  const isMobile = useMediaQuery("(max-width: 768px)");
  const navigate = useNavigate();
  const [myTasks, setMyTasks] = useState<MyTaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoadingTasks(true);
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE}/scheduling/my-tasks/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load tasks');
        const data = await res.json();
        setMyTasks(data.results || data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchTasks();
  }, []);

  return (
    <div className="container mx-auto py-4 md:py-6 space-y-4 md:space-y-6 px-2 md:px-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Safety Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage safety procedures, checklists, tasks, and recognitions
        </p>
      </div>

      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 md:h-5 w-4 md:w-5 text-amber-600" />
        <AlertTitle className="text-sm md:text-base text-amber-800">Safety First</AlertTitle>
        <AlertDescription className="text-xs md:text-sm text-amber-700">
          Safety is everyone's responsibility. Report concerns, follow procedures, and recognize excellence.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="flex items-center text-base md:text-lg">
              <Shield className="mr-2 h-4 w-4 md:h-5 md:w-5 text-green-600" />
              Safety Compliance
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Current safety status</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2 md:py-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm">SOPs Compliance</span>
                <span className="font-medium text-xs md:text-sm text-green-600">92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs md:text-sm">Checklist Completion</span>
                <span className="font-medium text-xs md:text-sm text-amber-600">78%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '78%' }}></div>
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs md:text-sm">Task Completion</span>
                <span className="font-medium text-xs md:text-sm text-blue-600">85%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isMobile && (
          <>
            <Card className="shadow-sm">
              <CardHeader className="pb-2 px-3 md:px-6 py-3 md:py-4">
                <CardTitle className="flex items-center text-base md:text-lg">
                  <AlertTriangle className="mr-2 h-4 w-4 md:h-5 md:w-5 text-red-600" />
                  Open Concerns
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">Unresolved safety issues</CardDescription>
              </CardHeader>
              <CardContent className="px-3 md:px-6 py-2 md:py-3">
                <div className="space-y-3">
                  <div className="p-2 md:p-3 bg-red-50 border border-red-100 rounded-md">
                    <div className="font-medium text-xs md:text-sm text-red-800">Kitchen Equipment</div>
                    <div className="text-xs text-red-700">Oven temperature inconsistent</div>
                    <div className="text-xs text-red-600 mt-1">Reported 2 days ago</div>
                  </div>
                  
                  <div className="p-2 md:p-3 bg-amber-50 border border-amber-100 rounded-md">
                    <div className="font-medium text-xs md:text-sm text-amber-800">Storage Area</div>
                    <div className="text-xs text-amber-700">Heavy items stored on high shelves</div>
                    <div className="text-xs text-amber-600 mt-1">Reported 1 day ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2 px-3 md:px-6 py-3 md:py-4">
                <CardTitle className="flex items-center text-base md:text-lg">
                  <CheckCircle className="mr-2 h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                  Today's Tasks
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">Priority safety tasks</CardDescription>
              </CardHeader>
              <CardContent className="px-3 md:px-6 py-2 md:py-3">
                <div className="space-y-2 md:space-y-3">
                  {loadingTasks && (
                    <div className="text-xs md:text-sm text-muted-foreground">Loading tasks…</div>
                  )}
                  {!loadingTasks && myTasks.length === 0 && (
                    <div className="text-xs md:text-sm text-muted-foreground">No tasks assigned today.</div>
                  )}
                  {!loadingTasks && myTasks.slice(0,5).map((t) => {
                    const badgeClass =
                      t.status === 'COMPLETED'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : t.status === 'IN_PROGRESS'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : t.status === 'CANCELLED'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200';
                    return (
                      <button
                        key={t.id}
                        className="flex items-center w-full text-left hover:bg-gray-50 rounded-md p-2"
                        onClick={() => navigate(`/task-checklist/${t.id}`)}
                      >
                        <div className={`h-3 w-3 md:h-4 md:w-4 rounded-full mr-2 flex-shrink-0 border ${t.status === 'COMPLETED' ? 'bg-blue-500 border-blue-500' : 'border-blue-500'}`}></div>
                        <span className={`text-xs md:text-sm ${t.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                        <Badge className={`ml-auto text-[10px] md:text-[11px] px-2 py-0.5 rounded-full ${badgeClass}`}>{Math.round(t.progress_percentage ?? 0)}%</Badge>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue={isManager ? "procedures" : "tasks"} className="w-full">
        <TabsList className={`grid ${isMobile ? 'grid-cols-3' : isManager ? 'grid-cols-6' : 'grid-cols-3'} mb-4`}>
          {isManager && <TabsTrigger value="procedures">SOPs</TabsTrigger>}
          {isManager && <TabsTrigger value="checklists">Checklists</TabsTrigger>}
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          {isMobile ? (
            isManager ? (
              <TabsTrigger value="more" className="md:hidden">More</TabsTrigger>
            ) : null
          ) : (
            <>
              <TabsTrigger value="concerns">Concerns</TabsTrigger>
              <TabsTrigger value="recognition">Recognition</TabsTrigger>
              {isManager && <TabsTrigger value="management">Management</TabsTrigger>}
            </>
          )}
        </TabsList>
        
        {isManager && (
          <TabsContent value="procedures" className="mt-0">
            <StandardOperatingProcedureList />
          </TabsContent>
        )}
        
        {isManager && (
          <TabsContent value="checklists" className="mt-0">
            <SafetyChecklistComponent />
          </TabsContent>
        )}
        
        <TabsContent value="tasks" className="mt-0">
          <ScheduleTaskManager />
        </TabsContent>
        
        <TabsContent value="concerns" className="mt-0">
          <SafetyConcernReporting />
        </TabsContent>
        
        <TabsContent value="recognition" className="mt-0">
          <SafetyRecognitionComponent />
        </TabsContent>

        {isManager && (
          <TabsContent value="management" className="mt-0">
            <TaskManagementInterface isManager={isManager} />
          </TabsContent>
        )}

        {isMobile && isManager && (
          <TabsContent value="more" className="mt-0">
            <div className="grid grid-cols-1 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2 px-3 py-3">
                  <CardTitle className="flex items-center text-base">
                    <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                    Open Concerns
                  </CardTitle>
                  <CardDescription className="text-xs">Unresolved safety issues</CardDescription>
                </CardHeader>
                <CardContent className="px-3 py-2">
                  <div className="space-y-3">
                    <div className="p-2 bg-red-50 border border-red-100 rounded-md">
                      <div className="font-medium text-xs text-red-800">Kitchen Equipment</div>
                      <div className="text-xs text-red-700">Oven temperature inconsistent</div>
                      <div className="text-xs text-red-600 mt-1">Reported 2 days ago</div>
                    </div>
                    
                    <div className="p-2 bg-amber-50 border border-amber-100 rounded-md">
                      <div className="font-medium text-xs text-amber-800">Storage Area</div>
                      <div className="text-xs text-amber-700">Heavy items stored on high shelves</div>
                      <div className="text-xs text-amber-600 mt-1">Reported 1 day ago</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2 px-3 py-3">
                  <CardTitle className="flex items-center text-base">
                    <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                    Today's Tasks
                  </CardTitle>
                  <CardDescription className="text-xs">Priority safety tasks</CardDescription>
                </CardHeader>
                <CardContent className="px-3 py-2">
                  <div className="space-y-2">
                    {loadingTasks && (
                      <div className="text-xs text-muted-foreground">Loading tasks…</div>
                    )}
                    {!loadingTasks && myTasks.length === 0 && (
                      <div className="text-xs text-muted-foreground">No tasks assigned today.</div>
                    )}
                    {!loadingTasks && myTasks.slice(0,5).map((t) => {
                      const badgeClass =
                        t.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : t.status === 'IN_PROGRESS'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : t.status === 'CANCELLED'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200';
                      return (
                        <button
                          key={t.id}
                          className="flex items-center w-full text-left hover:bg-gray-50 rounded-md p-2"
                          onClick={() => navigate(`/task-checklist/${t.id}`)}
                        >
                          <div className={`h-3 w-3 rounded-full border mr-2 flex-shrink-0 ${t.status === 'COMPLETED' ? 'bg-blue-500 border-blue-500' : 'border-blue-500'}`}></div>
                          <span className={`text-xs ${t.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                          <Badge className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${badgeClass}`}>{Math.round(t.progress_percentage ?? 0)}%</Badge>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                    Safety Concerns
                  </h3>
                  <SafetyConcernReporting />
                </div>
                
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Safety Recognition
                  </h3>
                  <SafetyRecognitionComponent />
                </div>
                
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <ClipboardList className="mr-2 h-4 w-4 text-blue-600" />
                    Task Management
                  </h3>
                  <TaskManagementInterface isManager={isManager} />
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SafetyDashboard;