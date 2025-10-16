import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RoleGate } from '@/components/RoleGate';
import { UserPlus, Mail, Phone, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'owner' | 'manager' | 'server' | 'chef' | 'cleaner';

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  status: string;
  roles: AppRole[];
}

const roleColors: Record<AppRole, string> = {
  owner: 'bg-purple-500',
  manager: 'bg-blue-500',
  server: 'bg-green-500',
  chef: 'bg-orange-500',
  cleaner: 'bg-gray-500',
};

export default function StaffManagement() {
  const { userRoles, isOwner, isManager } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'server' as AppRole,
    pin_code: '',
  });

  const restaurantId = userRoles[0]?.restaurant_id;

  useEffect(() => {
    if (restaurantId) {
      loadStaff();
    }
  }, [restaurantId]);

  const loadStaff = async () => {
    try {
      const { data: staffMembers, error: staffError } = await supabase
        .from('staff_members')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (staffError) throw staffError;

      // Fetch roles for each staff member
      const staffWithRoles = await Promise.all(
        (staffMembers || []).map(async (member) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', member.user_id)
            .eq('restaurant_id', restaurantId);

          return {
            ...member,
            roles: roles?.map(r => r.role) || [],
          };
        })
      );

      setStaff(staffWithRoles);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Failed to load staff members');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        email_confirm: true,
        user_metadata: {
          full_name: formData.full_name,
        },
      });

      if (authError) throw authError;

      // Create staff member
      const { error: staffError } = await supabase
        .from('staff_members')
        .insert({
          user_id: authData.user.id,
          restaurant_id: restaurantId,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          pin_code: formData.pin_code,
          role: formData.role,
        });

      if (staffError) throw staffError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          restaurant_id: restaurantId,
          role: formData.role,
        });

      if (roleError) throw roleError;

      toast.success('Staff member created successfully');
      setIsDialogOpen(false);
      setFormData({
        email: '',
        full_name: '',
        phone: '',
        role: 'server',
        pin_code: '',
      });
      loadStaff();
    } catch (error: any) {
      console.error('Error creating staff:', error);
      toast.error(error.message || 'Failed to create staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (staffId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;

    try {
      await supabase.from('staff_members').delete().eq('id', staffId);
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('restaurant_id', restaurantId);
      
      toast.success('Staff member removed');
      loadStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Failed to remove staff member');
    }
  };

  return (
    <RoleGate allowedRoles={['owner', 'manager']}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground">Manage your restaurant team members and their roles</p>
          </div>

          {isOwner && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Staff Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateStaff}>
                  <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                    <DialogDescription>
                      Create a new staff account with specific role and permissions
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={formData.role} onValueChange={(value: AppRole) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {isOwner && <SelectItem value="manager">Manager</SelectItem>}
                          <SelectItem value="server">Server/Waiter</SelectItem>
                          <SelectItem value="chef">Chef/Kitchen Staff</SelectItem>
                          <SelectItem value="cleaner">Cleaner/Support Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pin_code">PIN Code (4 digits)</Label>
                      <Input
                        id="pin_code"
                        type="text"
                        maxLength={4}
                        pattern="[0-9]{4}"
                        value={formData.pin_code}
                        onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                        placeholder="1234"
                        required
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Staff Member'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>All staff members and their assigned roles</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  {isOwner && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {member.roles.map((role) => (
                          <Badge key={role} className={roleColors[role]}>
                            <Shield className="h-3 w-3 mr-1" />
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    {isOwner && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStaff(member.id, member.user_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
