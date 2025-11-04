import React from "react"

// Minimal placeholder list to satisfy default export used by Staff.tsx
// Replace with real announcements fetching when backend endpoint is ready.
export default function StaffAnnouncementsList() {
	return (
		<div className="space-y-2">
			<div className="text-sm text-muted-foreground">Announcements</div>
			<div className="rounded-md border p-3 text-sm">
				No announcements yet.
			</div>
		</div>
	)
}
