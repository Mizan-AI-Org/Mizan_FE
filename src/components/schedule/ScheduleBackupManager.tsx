import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, Archive, RotateCcw } from "lucide-react";
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";

interface BackupHistoryItem {
  filename: string;
  timestamp: string;
  path: string;
}

interface ScheduleBackupManagerProps {
  scheduleId: string;
}

const ScheduleBackupManager: React.FC<ScheduleBackupManagerProps> = ({ scheduleId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  // Fetch backup history
  const { data: backupHistory, isLoading, error, refetch } = useQuery({
    queryKey: ['backupHistory', scheduleId],
    queryFn: async () => {
      const response = await axios.get(`/api/staff/schedules/${scheduleId}/backup_history/`);
      return response.data as BackupHistoryItem[];
    }
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/api/staff/schedules/${scheduleId}/create_backup/`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Backup created",
        description: "Schedule backup created successfully",
        variant: "default",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create backup",
        variant: "destructive",
      });
      console.error("Backup creation error:", error);
    }
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupFile: string) => {
      const response = await axios.post(`/api/staff/schedules/${scheduleId}/restore_backup/`, {
        backup_file: backupFile
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Restore successful",
        description: "Schedule restored from backup",
        variant: "default",
      });
      // Invalidate queries that might be affected by the restore
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      setRestoreDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Restore failed",
        description: "Failed to restore schedule from backup",
        variant: "destructive",
      });
      console.error("Restore error:", error);
    }
  });

  const handleCreateBackup = () => {
    createBackupMutation.mutate();
  };

  const handleRestoreBackup = () => {
    if (selectedBackup) {
      restoreBackupMutation.mutate(selectedBackup);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Schedule Backup Manager
        </CardTitle>
        <CardDescription>
          Create and restore backups of your schedule data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load backup history. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-4">
          <Button 
            onClick={handleCreateBackup} 
            disabled={createBackupMutation.isPending}
            className="flex items-center gap-2"
          >
            {createBackupMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Create Backup
          </Button>
        </div>

        <div className="border rounded-md">
          <div className="bg-muted px-4 py-2 font-medium">Backup History</div>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : backupHistory && backupHistory.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Filename</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backupHistory.map((backup, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-2">{formatTimestamp(backup.timestamp)}</td>
                      <td className="px-4 py-2 font-mono text-xs truncate max-w-[200px]">
                        {backup.filename}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBackup(backup.path);
                            setRestoreDialogOpen(true);
                          }}
                          className="flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No backup history found
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {backupHistory?.length || 0} backups available
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </CardFooter>

      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this schedule from backup? This will overwrite the current schedule data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestoreBackup}
              disabled={restoreBackupMutation.isPending}
              className="flex items-center gap-2"
            >
              {restoreBackupMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ScheduleBackupManager;