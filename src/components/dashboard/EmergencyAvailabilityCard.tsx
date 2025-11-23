import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Phone, ArrowRight } from "lucide-react";
import type { StaffProfileItem } from "@/lib/types";

type Props = {
  searchTerm: string;
  onSearchTerm: (v: string) => void;
  hoursWindow: number;
  onHoursWindow: (v: number) => void;
  staffProfiles?: StaffProfileItem[] | null;
  filteredStaff: StaffProfileItem[];
  loading?: boolean;
  error?: boolean;
  onAssignNow: (staffId: number, reason: string) => void;
};

const EmergencyAvailabilityCard: React.FC<Props> = ({ searchTerm, onSearchTerm, hoursWindow, onHoursWindow, filteredStaff, loading, error, onAssignNow }) => {
  return (
    <Card aria-labelledby="emergency-availability-title">
      <CardHeader>
        <CardTitle id="emergency-availability-title" className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" /> Emergency Staff Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            className="border rounded px-3 py-2 text-sm flex-1"
            placeholder="Search by name, position, or skill…"
            value={searchTerm}
            onChange={(e) => onSearchTerm(e.target.value)}
            aria-label="Search staff"
          />
          <select
            className="border rounded px-3 py-2 text-sm"
            value={hoursWindow}
            onChange={(e) => onHoursWindow(Number(e.target.value))}
            aria-label="Urgency window"
          >
            <option value={2}>Next 2 hours</option>
            <option value={4}>Next 4 hours</option>
            <option value={6}>Next 6 hours</option>
          </select>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading staff…
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive" role="alert">Failed to load staff profiles.</div>
        )}
        {!loading && !error && filteredStaff.length === 0 && (
          <div className="text-sm text-muted-foreground">No matching staff found.</div>
        )}

        {!loading && !error && filteredStaff.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in">
            {filteredStaff.slice(0, 12).map((s) => (
              <div key={s.user_details?.id} className="rounded-md border p-3 space-y-2 transition hover:bg-muted/40">
                <div className="font-medium">
                  {s.user_details?.first_name} {s.user_details?.last_name}
                </div>
                <div className="text-xs text-muted-foreground">{s.position ?? "Staff"}</div>
                {s.user_details?.phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {s.user_details?.phone}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => onAssignNow(Number(s.user_details?.id ?? 0), `Urgent help requested in next ${hoursWindow}h`)} aria-label="Assign now">Assign Now</Button>
                  <Button size="sm" variant="outline" aria-label="Contact staff">
                    Contact <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmergencyAvailabilityCard;