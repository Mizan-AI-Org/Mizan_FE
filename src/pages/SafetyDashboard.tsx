import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, ClipboardList } from 'lucide-react';
import StandardOperatingProcedureList from '@/components/safety/StandardOperatingProcedureList';
import SafetyChecklistComponent from '@/components/safety/SafetyChecklistComponent';
import ScheduleTaskManager from '@/components/safety/ScheduleTaskManager';
import SafetyConcernReporting from '@/components/safety/SafetyConcernReporting';
import SafetyRecognitionComponent from '@/components/safety/SafetyRecognition';
import TaskManagementInterface from '@/components/safety/TaskManagementInterface';
import { useAuth } from '@/hooks/use-auth';
import { useMediaQuery } from '@/hooks/use-media-query';

const SafetyDashboard: React.FC = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'manager' || user?.is_superuser;
  const isMobile = useMediaQuery("(max-width: 768px)");

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
                  <div className="flex items-center">
                    <div className="h-3 w-3 md:h-4 md:w-4 rounded-full border border-blue-500 mr-2 flex-shrink-0"></div>
                    <span className="text-xs md:text-sm">Morning safety walkthrough</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 md:h-4 md:w-4 rounded-full border border-blue-500 bg-blue-500 mr-2 flex-shrink-0"></div>
                    <span className="line-through text-xs md:text-sm text-muted-foreground">Equipment inspection</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 md:h-4 md:w-4 rounded-full border border-blue-500 mr-2 flex-shrink-0"></div>
                    <span className="text-xs md:text-sm">Update fire evacuation plan</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 md:h-4 md:w-4 rounded-full border border-blue-500 mr-2 flex-shrink-0"></div>
                    <span className="text-xs md:text-sm">Staff safety briefing</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="procedures" className="w-full">
        <TabsList className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-6'} mb-4`}>
          <TabsTrigger value="procedures">SOPs</TabsTrigger>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          {isMobile ? (
            <TabsTrigger value="more" className="md:hidden">More</TabsTrigger>
          ) : (
            <>
              <TabsTrigger value="concerns">Concerns</TabsTrigger>
              <TabsTrigger value="recognition">Recognition</TabsTrigger>
              <TabsTrigger value="management">Management</TabsTrigger>
            </>
          )}
        </TabsList>
        
        <TabsContent value="procedures" className="mt-0">
          <StandardOperatingProcedureList isManager={isManager} />
        </TabsContent>
        
        <TabsContent value="checklists" className="mt-0">
          <SafetyChecklistComponent isManager={isManager} />
        </TabsContent>
        
        <TabsContent value="tasks" className="mt-0">
          <ScheduleTaskManager isManager={isManager} />
        </TabsContent>
        
        <TabsContent value="concerns" className="mt-0">
          <SafetyConcernReporting isManager={isManager} />
        </TabsContent>
        
        <TabsContent value="recognition" className="mt-0">
          <SafetyRecognitionComponent isManager={isManager} />
        </TabsContent>
        
        <TabsContent value="management" className="mt-0">
          <TaskManagementInterface isManager={isManager} />
        </TabsContent>

        {isMobile && (
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
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full border border-blue-500 mr-2 flex-shrink-0"></div>
                      <span className="text-xs">Morning safety walkthrough</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full border border-blue-500 bg-blue-500 mr-2 flex-shrink-0"></div>
                      <span className="line-through text-xs text-muted-foreground">Equipment inspection</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full border border-blue-500 mr-2 flex-shrink-0"></div>
                      <span className="text-xs">Update fire evacuation plan</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full border border-blue-500 mr-2 flex-shrink-0"></div>
                      <span className="text-xs">Staff safety briefing</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                    Safety Concerns
                  </h3>
                  <SafetyConcernReporting isManager={isManager} />
                </div>
                
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Safety Recognition
                  </h3>
                  <SafetyRecognitionComponent isManager={isManager} />
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
        
        <TabsContent value="concerns" className="mt-0">
          <SafetyConcernReporting isManager={isManager} />
        </TabsContent>
        
        <TabsContent value="recognition" className="mt-0">
          <SafetyRecognitionComponent isManager={isManager} />
        </TabsContent>

        <TabsContent value="management" className="mt-0">
          <TaskManagementInterface isManager={isManager} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SafetyDashboard;