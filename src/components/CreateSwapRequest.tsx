import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const API_BASE =
  import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

interface AssignedShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role: string;
  staff: string; // ID of the staff member
  staff_info: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface Restaurant {
  id: string;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  restaurant?: Restaurant | string;
}

const formSchema = z.object({
  shift_to_swap: z.string().uuid({ message: "Invalid shift selected" }),
  receiver: z
    .string()
    .uuid({ message: "Invalid staff member selected" })
    .optional()
    .nullable(),
  request_message: z.string().optional(),
});

type CreateSwapRequestFormValues = z.infer<typeof formSchema>;

interface CreateSwapRequestProps {
  onSuccess?: () => void;
}

const CreateSwapRequest: React.FC<CreateSwapRequestProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<CreateSwapRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shift_to_swap: "",
      receiver: null,
      request_message: "",
    },
  });

  // Fetch user's upcoming shifts
  const { data: myShifts, isLoading: isLoadingShifts } = useQuery<
    AssignedShift[]
  >({
    // Specify the type of data expected
    queryKey: ["myShifts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch(`${API_BASE}/schedule/my-shifts/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch my shifts");
      return response.json();
    },
    enabled: !!user,
  });

  const restaurantId = user?.restaurant ?? user?.restaurant_data?.id;

  // Fetch all staff members (for optional receiver)
  const { data: allStaff, isLoading: isLoadingStaff } = useQuery<StaffMember[]>(
    {
      // Specify the type of data expected
      queryKey: ["allStaff", restaurantId],
      queryFn: async () => {
        if (!restaurantId) return [];
        const response = await fetch(`${API_BASE}/staff/staff-list/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch staff list");
        return response.json();
      },
      enabled: !!restaurantId,
    }
  );

  const createSwapRequestMutation = useMutation({
    mutationFn: async (data: CreateSwapRequestFormValues) => {
      const response = await fetch(
        `${API_BASE}/schedule/shift-swap-requests/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create swap request");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myShiftSwapRequests"] });
      toast.success("Shift swap request created successfully.");
      setIsDialogOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create shift swap request.");
    },
  });

  const onSubmit = (values: CreateSwapRequestFormValues) => {
    createSwapRequestMutation.mutate(values);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Request Shift Swap
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Shift Swap Request</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="shift_to_swap"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift to Swap</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shift to swap" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingShifts ? (
                        <SelectItem value="__loading_shifts__" disabled>
                          Loading shifts...
                        </SelectItem>
                      ) : myShifts?.length === 0 ? (
                        <SelectItem value="__no_shifts__" disabled>
                          No upcoming shifts
                        </SelectItem>
                      ) : (
                        myShifts?.map((shift) => (
                          <SelectItem key={shift.id} value={shift.id}>
                            {format(new Date(shift.shift_date), "PPP")}{" "}
                            {format(
                              new Date(`2000-01-01T${shift.start_time}`),
                              "hh:mm a"
                            )}{" "}
                            -{" "}
                            {format(
                              new Date(`2000-01-01T${shift.end_time}`),
                              "hh:mm a"
                            )}
                            ({shift.role})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiver"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Suggest Receiver (Optional)</FormLabel>
                  <Select
                    onValueChange={(val) =>
                      field.onChange(val === "__none__" ? null : val)
                    }
                    defaultValue={field.value ?? "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a staff member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">
                        No specific receiver
                      </SelectItem>
                      {isLoadingStaff ? (
                        <SelectItem value="__loading_staff__" disabled>
                          Loading staff...
                        </SelectItem>
                      ) : (
                        allStaff
                          ?.filter((staff) => staff.id !== user?.id)
                          .map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.first_name} {staff.last_name} (
                              {staff.email})
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="request_message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Reason for swap request"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createSwapRequestMutation.isPending}
            >
              {createSwapRequestMutation.isPending
                ? "Submitting..."
                : "Submit Request"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSwapRequest;
