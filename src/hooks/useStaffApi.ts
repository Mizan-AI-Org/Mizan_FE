import { useMutation, useQuery } from '@tanstack/react-query';

export const useStaffInvite = () => {
    return useMutation({
        mutationFn: async (invitationData: { email: string; role: string }) => {
            const response = await fetch('/api/staff/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(invitationData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send invitation');
            }

            return response.json();
        },
    });
};

export const useStaffList = () => {
    return useQuery({
        queryKey: ['staff-list'],
        queryFn: async () => {
            const response = await fetch('/api/staff/list', {
                credentials: 'include',
            });

            if (!response.ok) throw new Error('Failed to fetch staff list');
            return response.json();
        },
    });
};