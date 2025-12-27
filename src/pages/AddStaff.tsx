import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Users, Mail, User, Upload, Download, FileSpreadsheet, X, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface FormErrors {
    [key: string]: string;
}

interface StaffMember {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    department?: string;
    phoneNumber: string;
    status: string;
}

const ROLES = [
    { value: "ADMIN", label: "Admin", color: "bg-red-100 text-red-700 border-red-200" },
    { value: "MANAGER", label: "Manager", color: "bg-purple-100 text-purple-700 border-purple-200" },
    { value: "CHEF", label: "Chef", color: "bg-orange-100 text-orange-700 border-orange-200" },
    { value: "SOUS_CHEF", label: "Sous Chef", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    { value: "LINE_COOK", label: "Line Cook", color: "bg-green-100 text-green-700 border-green-200" },
    { value: "WAITER", label: "Waiter", color: "bg-blue-100 text-blue-700 border-blue-200" },
    { value: "HOST", label: "Host", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    { value: "BARTENDER", label: "Bartender", color: "bg-pink-100 text-pink-700 border-pink-200" },
    { value: "DISHWASHER", label: "Dishwasher", color: "bg-gray-100 text-gray-700 border-gray-200" },
    { value: "CLEANER", label: "Cleaner", color: "bg-teal-100 text-teal-700 border-teal-200" },
    { value: "CASHIER", label: "Cashier", color: "bg-cyan-100 text-cyan-700 border-cyan-200" }
];

const AddStaff = () => {
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [inviteViaWhatsapp, setInviteViaWhatsapp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [parsedStaff, setParsedStaff] = useState<StaffMember[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bulkInviteResults, setBulkInviteResults] = useState<any[]>([]);

    const validateForm = () => {
        const newErrors: FormErrors = {};

        if (!inviteViaWhatsapp) {
            if (!email) {
                newErrors.email = "Email is required";
            } else if (!/\S+@\S+\.\S+/.test(email)) {
                newErrors.email = "Email is invalid";
            }
        }

        if (!firstName) newErrors.firstName = "First name is required";
        if (!lastName) newErrors.lastName = "Last name is required";
        if (!role) newErrors.role = "Role is required";
        if (inviteViaWhatsapp && !phoneNumber) {
            newErrors.phone = "Phone number is required for WhatsApp invite";
            // Force phone field error if we need to show it there
            setErrors(prev => ({ ...prev, phone: "Required for WhatsApp" }));
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInvite = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        setErrors({}); // Clear previous errors

        // 1. Get the token from localStorage
        const token = localStorage.getItem('access_token');

        let finalEmail = email;
        if (inviteViaWhatsapp && !email && phoneNumber) {
            // Generate placeholder email for backend requirement
            const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
            finalEmail = `wa.${cleanPhone}@no-email.com`;
        }

        try {
            const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";
            // We use camelCase payload for JSON stringify usually, but let's check what I sent before.
            // Before: email, role, first_name, last_name, phone_number
            // The backend serializer uses fields = ['email', 'role', ... 'phone' (in extra_data?)] 
            // Wait, the backend serializer I viewed in `accounts/views_invitations.py` uses `serializer = self.get_serializer(data=request.data)`
            // and `StaffInvitationSerializer` fields.
            // And `create` method manually extracts `phone` from request.data to put in `extra_data`.

            const resp = await fetch(`${API_BASE}/staff/invite/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email: finalEmail,
                    role,
                    first_name: firstName,
                    last_name: lastName,
                    phone_number: phoneNumber || undefined,
                    phone: phoneNumber || undefined, // Send both keys just in case
                }),
            });

            // Safely parse response: handle non-JSON (e.g., HTML error pages)
            type InviteResponse = {
                message?: string;
                token?: string;
                error?: string;
                detail?: string;
                invitation_token?: string;
                invitation?: { invitation_token?: string };
            };
            const contentType = resp.headers.get('content-type') || '';
            let data: InviteResponse | null = null;
            if (contentType.includes('application/json')) {
                try {
                    data = await resp.json();
                } catch (parseErr) {
                    // ignore
                }
            } else {
                const text = await resp.text();
                // data = { message: text }; 
                // Don't set data if not json? 
            }

            if (!resp.ok) {
                const fallback = typeof data?.message === 'string' ? data.message.slice(0, 200) : '';
                throw new Error(
                    data?.detail || data?.error || fallback || `Failed to send invitation (HTTP ${resp.status})`
                );
            }

            // Extract the token - it might be at root or inside 'invitation' object
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const responseData = data as any;
            const inviteToken = responseData.invitation_token || responseData.invitation?.invitation_token || responseData.token;

            if (inviteViaWhatsapp && inviteToken && phoneNumber) {
                const baseUrl = window.location.origin;
                const inviteLink = `${baseUrl}/accept-invitation?token=${inviteToken}`;
                const message = `Hi ${firstName}, you have been invited to join Mizan. Click here to accept: ${inviteLink}`;
                const encodedMessage = encodeURIComponent(message);
                const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;

                window.open(whatsappUrl, '_blank');
                alert(`Invitation prepared for ${firstName}. WhatsApp opened!`);
            } else {
                alert(`Invitation sent to ${firstName} ${lastName}`);
            }

            setEmail('');
            setFirstName('');
            setLastName('');
            setRole('');
            setPhoneNumber('');
            setInviteViaWhatsapp(false);
            setErrors({});
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to send invitation';
            alert(message);
        } finally {
            setIsLoading(false);
        }
    };

    const [csvText, setCsvText] = useState<string>('');

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadedFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = (e.target?.result as string) || "";
            // Normalize line endings
            const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const lines = normalized.split('\n');
            // Find first non-empty line
            let startIndex = 0;
            while (startIndex < lines.length && !lines[startIndex].trim()) startIndex++;
            let delimiterFromSep: string | null = null;
            // Excel directive: sep=,
            const firstLine = (lines[startIndex] || '').trim();
            const sepMatch = /^sep\s*=\s*([^\s])\s*$/i.exec(firstLine);
            if (sepMatch) {
                delimiterFromSep = sepMatch[1];
                startIndex++; // skip sep line
            }
            const headerLine = lines[startIndex] || '';
            const detectedDelimiter = delimiterFromSep || (headerLine.includes(';') ? ';' : ',');
            const headers = headerLine
                .split(detectedDelimiter)
                .map((h: string) => h.trim().replace(/^"|"$/g, '').toLowerCase());
            // Build a server-friendly CSV (comma-delimited, without sep= line)
            const headerPartsRaw = headerLine
                .split(detectedDelimiter)
                .map((p: string) => p.trim().replace(/^"|"$/g, ''));
            const cleanedRows: string[] = [];
            for (let i = startIndex + 1; i < lines.length; i++) {
                const raw = lines[i];
                if (!raw || !raw.trim()) continue;
                const parts = raw
                    .split(detectedDelimiter)
                    .map((p: string) => p.trim());
                cleanedRows.push(parts.join(','));
            }
            const serverCsv = [headerPartsRaw.join(','), ...cleanedRows].join('\n');
            setCsvText(serverCsv);

            const staff: StaffMember[] = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;

                const values = lines[i]
                    .split(detectedDelimiter)
                    .map((v: string) => v.trim().replace(/^"|"$/g, ''));
                const staffMember: StaffMember = {
                    id: i,
                    email: values[headers.indexOf('email')] || values[headers.indexOf('email address')] || '',
                    firstName: values[headers.indexOf('firstname')] || values[headers.indexOf('first name')] || '',
                    lastName: values[headers.indexOf('lastname')] || values[headers.indexOf('last name')] || '',
                    role: values[headers.indexOf('role')] || '',
                    department: values[headers.indexOf('department')] || '',
                    // Look for 'whatsapp' or 'phone' or 'phonenumber'
                    phoneNumber: values[headers.indexOf('whatsapp')] || values[headers.indexOf('phone')] || values[headers.indexOf('phonenumber')] || '',
                    status: 'pending'
                };

                // Allow if email OR phone is present (for WhatsApp invites via bulk, we might need a similar dummy email logic?)
                // The backend bulk endpoint 'bulk_invite_from_csv' validates email strictly: "if not email or '@' not in email: ... Invalid email".
                // So if I upload a CSV without Email, the backend will reject it.
                // I need to intercept and inject dummy emails in `handleBulkInvite` or here?
                // `handleBulkInvite` sends `csv_content` string.
                // So I must Modify the `serverCsv` string if I want to support phone-only CSVs.
                // OR I rely on the user to put dummy emails in CSV.
                // But user wants "WhatsApp" header.
                // If I modify `serverCsv` here, `handleBulkInvite` will use it.

                // Let's stick to parsing for `parsedStaff` display first.
                if (staffMember.email || staffMember.phoneNumber) {
                    staff.push(staffMember);
                }
            }

            setParsedStaff(staff);
        };

        reader.readAsText(file);
    };

    const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

    const handleBulkInvite = async () => {
        if (!csvText) return;

        // If we want to support no-email CSVs, we need to regenerate the CSV content with dummy emails if missing.
        // We can reconstruct it from `parsedStaff`?
        // Let's do a quick pass if `parsedStaff` has items with missing emails but present phone.
        let payloadCsv = csvText;
        if (parsedStaff.some(p => !p.email && p.phoneNumber)) {
            // Rebuild CSV with dummy emails
            const header = "email,first_name,last_name,role,department,phone";
            const rows = parsedStaff.map(p => {
                const e = p.email || `wa.${p.phoneNumber.replace(/[^0-9]/g, '')}@no-email.com`;
                return `${e},${p.firstName},${p.lastName},${p.role},${p.department},${p.phoneNumber}`;
            });
            payloadCsv = [header, ...rows].join('\n');
        }

        setIsLoading(true);
        try {
            const resp = await fetch(`${API_BASE}/invitations/bulk/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ type: 'csv', csv_content: payloadCsv }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data?.detail || 'Bulk invite failed');
            }
            alert(`Processed ${data.success + data.failed} invites. Success: ${data.success}, Failed: ${data.failed}`);

            if (data.invitations && data.invitations.length > 0) {
                // Map phone numbers from parsedStaff to the results
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const enrichedInvites = data.invitations.map((invite: any) => {
                    const originalStr = parsedStaff.find(p =>
                        (p.email && p.email.toLowerCase() === invite.email.toLowerCase()) ||
                        (!p.email && `wa.${p.phoneNumber.replace(/[^0-9]/g, '')}@no-email.com`.toLowerCase() === invite.email.toLowerCase())
                    );
                    return {
                        ...invite,
                        phone: originalStr?.phoneNumber || ''
                    };
                });
                setBulkInviteResults(enrichedInvites);
            }

            setUploadedFile(null);
            setParsedStaff([]);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Bulk invite failed';
            alert(message);
        } finally {
            setIsLoading(false);
        }
    };

    const downloadTemplate = () => {
        // Excel-friendly: include delimiter directive and use BOM + CRLF
        // USER REQUEST: clearly say WhatsApp instead of 'Phone'
        const lines = [
            'sep=,',
            'email,firstname,lastname,role,department,whatsapp',
            'example@email.com,John,Doe,WAITER,Kitchen,+1234567890'
        ];
        const csv = lines.join('\r\n');
        const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
        const blob = new Blob([BOM, csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'staff-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const removeStaffMember = (id: number) => {
        setParsedStaff(parsedStaff.filter(s => s.id !== id));
    };

    const selectedRoleData = ROLES.find(r => r.value === role);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    {/* <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.history.back()}
                            className="rounded-full hover:bg-gray-200"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Add Staff</h1>
                        </div>
                    </div> */}
                </div>

                {/* Tab Selector */}
                <div className="flex gap-2 bg-white rounded-2xl p-2 shadow-sm border border-gray-200 w-fit">
                    <button
                        type="button"
                        onClick={() => setActiveTab('single')}
                        className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'single'
                            ? 'bg-green-900 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <User className="w-4 h-4 inline-block mr-2" />
                        Single Invite
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('bulk')}
                        className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'bulk'
                            ? 'bg-green-900 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Users className="w-4 h-4 inline-block mr-2" />
                        Bulk Upload
                    </button>
                </div>

                {/* Single Invite Form */}
                {activeTab === 'single' && (
                    <Card className="shadow-sm border-gray-200 rounded-2xl">
                        <CardHeader className="border-b border-gray-100 pb-6">
                            <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                <div className="p-2 bg-purple-100 rounded-xl">
                                    <Users className="w-5 h-5 text-purple-600" />
                                </div>
                                Staff Information
                            </CardTitle>
                            <CardDescription>
                                Fill in the details to send an invitation
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                    Email Address {inviteViaWhatsapp && <span className="text-gray-400 font-normal">(Optional)</span>}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Hamza.Hadni@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`rounded-xl ${errors.email ? "border-red-500" : ""}`}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-600">{errors.email}</p>
                                )}
                            </div>

                            {/* Name Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first-name" className="text-sm font-medium text-gray-700">
                                        First Name
                                    </Label>
                                    <Input
                                        id="first-name"
                                        placeholder="John"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className={`rounded-xl ${errors.firstName ? "border-red-500" : ""}`}
                                    />
                                    {errors.firstName && (
                                        <p className="text-sm text-red-600">{errors.firstName}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="last-name" className="text-sm font-medium text-gray-700">
                                        Last Name
                                    </Label>
                                    <Input
                                        id="last-name"
                                        placeholder="Sammy"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className={`rounded-xl ${errors.lastName ? "border-red-500" : ""}`}
                                    />
                                    {errors.lastName && (
                                        <p className="text-sm text-red-600">{errors.lastName}</p>
                                    )}
                                </div>
                            </div>

                            {/* Role and Phone */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                                        Role
                                    </Label>
                                    <Select value={role} onValueChange={setRole}>
                                        <SelectTrigger className={`w-full rounded-xl ${errors.role ? "border-red-500" : ""}`}>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLES.map((roleOption) => (
                                                <SelectItem key={roleOption.value} value={roleOption.value}>
                                                    {roleOption.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.role && (
                                        <p className="text-sm text-red-600">{errors.role}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                                        Phone Number {(inviteViaWhatsapp) && <span className="text-red-500">*</span>}
                                    </Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+212 (555) 000-0000"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className={`rounded-xl ${errors.phone ? "border-red-500" : ""}`}
                                    />
                                    {errors.phone && (
                                        <p className="text-sm text-red-600">{errors.phone}</p>
                                    )}
                                </div>
                            </div>

                            {/* Preview Card */}
                            {(firstName || lastName || email || phoneNumber) && (
                                <div className="bg-gradient-to-br from-green-50 to-indigo-50 rounded-2xl p-6 border border-green-100">
                                    <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-14 w-14 border-2 border-white shadow-md">
                                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-green-900 text-white text-lg font-semibold">
                                                {firstName?.[0]?.toUpperCase() || '?'}
                                                {lastName?.[0]?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 text-lg">
                                                {firstName || 'First'} {lastName || 'Last'}
                                            </p>
                                            <p className="text-sm text-gray-600 truncate">
                                                {/* Show Phone if it's a WhatsApp invite OR if phone is present and email is empty */}
                                                {(inviteViaWhatsapp || !email) && phoneNumber ? phoneNumber : (email || 'email@example.com')}
                                            </p>
                                            {selectedRoleData && (
                                                <Badge className={`${selectedRoleData.color} text-xs mt-2`}>
                                                    {selectedRoleData.label}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-4 pt-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="whatsapp-invite"
                                        checked={inviteViaWhatsapp}
                                        onChange={(e) => setInviteViaWhatsapp(e.target.checked)}
                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4"
                                    />
                                    <Label htmlFor="whatsapp-invite" className="text-sm text-gray-700 cursor-pointer select-none flex items-center gap-2">
                                        <MessageCircle className="w-4 h-4 text-green-600" />
                                        Send invite link via WhatsApp
                                    </Label>
                                </div>

                                <Button
                                    onClick={handleInvite}
                                    disabled={isLoading}
                                    className="w-full rounded-xl bg-gradient-to-r from-green-900 to-green-900 hover:from-blue-900 hover:to-indigo-700 text-white h-12 font-medium shadow-md"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Send Invitation
                                        </>
                                    )}
                                </Button>
                            </div>

                        </CardContent>
                    </Card>
                )}

                {/* Bulk Upload */}
                {activeTab === 'bulk' && (
                    <div className="space-y-6">
                        {/* Upload Section */}
                        <Card className="shadow-sm border-gray-200 rounded-2xl">
                            <CardHeader className="border-b border-gray-100 pb-6">
                                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                    <div className="p-2 bg-green-100 rounded-xl">
                                        <FileSpreadsheet className="w-5 h-5 text-green-900" />
                                    </div>
                                    Bulk Staff Upload
                                </CardTitle>
                                <CardDescription>
                                    Upload a CSV file with multiple staff members
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">

                                {/* Download Template */}
                                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-green-800 rounded-xl">
                                            <Download className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-1">Download Template</h3>
                                            <p className="text-sm text-gray-600 mb-3">
                                                Get started with our CSV template. Fill in staff details and upload below.
                                            </p>
                                            <Button
                                                onClick={downloadTemplate}
                                                variant="outline"
                                                className="rounded-xl border-blue-300 hover:bg-blue-100"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download Template
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Upload Area */}
                                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-400 transition-colors">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mb-4">
                                            <Upload className="w-8 h-8 text-blue-600" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 mb-2">
                                            {uploadedFile ? uploadedFile.name : 'Click to upload CSV file'}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            or drag and drop your file here
                                        </p>
                                    </label>
                                </div>

                            </CardContent>
                        </Card>

                        {/* Parsed Staff List */}
                        {parsedStaff.length > 0 && (
                            <Card className="shadow-sm border-gray-200 rounded-2xl">
                                <CardHeader className="border-b border-gray-100 pb-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xl font-semibold">
                                                Parsed Staff Members
                                            </CardTitle>
                                            <CardDescription>
                                                {parsedStaff.length} staff members ready to invite
                                            </CardDescription>
                                        </div>
                                        <Button
                                            onClick={handleBulkInvite}
                                            disabled={isLoading}
                                            className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    Inviting...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4 mr-2" />
                                                    Invite All ({parsedStaff.length})
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        {parsedStaff.map((staff) => {
                                            const roleData = ROLES.find(r => r.value === staff.role.toUpperCase());
                                            return (
                                                <div key={staff.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                                    <Avatar className="h-12 w-12">
                                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold">
                                                            {staff.firstName?.[0]?.toUpperCase() || '?'}
                                                            {staff.lastName?.[0]?.toUpperCase() || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-900">
                                                            {staff.firstName} {staff.lastName}
                                                        </p>
                                                        <p className="text-sm text-gray-600 truncate">
                                                            {staff.email}
                                                        </p>
                                                        {roleData && (
                                                            <Badge className={`${roleData.color} text-xs mt-1`}>
                                                                {roleData.label}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeStaffMember(staff.id)}
                                                        className="rounded-full hover:bg-red-100"
                                                    >
                                                        <X className="h-4 w-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {activeTab === 'bulk' && bulkInviteResults.length > 0 && (
                    <Card className="shadow-sm border-gray-200 rounded-2xl mt-6">
                        <CardHeader className="border-b border-gray-100 pb-6">
                            <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                <div className="p-2 bg-green-100 rounded-xl">
                                    <MessageCircle className="w-5 h-5 text-green-700" />
                                </div>
                                Send WhatsApp Invites
                            </CardTitle>
                            <CardDescription>
                                Successfully created invitations. Click to send via WhatsApp.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-3">
                                {bulkInviteResults.map((invite) => {
                                    // invite object comes from backend StaffInvitationSerializer
                                    // It might not have phone directly if it's in extra_data, 
                                    // but let's check how backend saves it. 
                                    // The backend `StaffInvitation` has `extra_data`.
                                    // But `StaffInvitationSerializer` fields are ['id', 'email', 'role', ... 'invitation_token'] 
                                    // It does NOT explicitly include `extra_data` in the default fields in the serializer I saw earlier (lines 28-30 of serializers.py).
                                    // Wait, the backend serializer I read was:
                                    // fields = ['id', 'email', 'role', 'restaurant', 'invited_by', 'invitation_token', 'is_accepted', 'created_at', 'expires_at']
                                    // So `extra_data` or `phone` might be missing in the response unless I request it or inferred it.
                                    // The bulk invite returns `StaffInvitationSerializer(inv).data`.
                                    // If `extra_data` is not in fields, I can't get the phone number to send the WhatsApp message!
                                    // I need to patch the backend serializer OR rely on the user manually inputting it? No, that defeats the purpose.
                                    // Actually, let's assume I can't easily change the backend *right now* partially because the plan said backend is manual/skipped.
                                    // BUT, I can rely on the fact that I just uploaded the CSV with phone numbers!
                                    // The `bulkInviteResults` usually has the order preserved? Or I can match by Email.

                                    // Let's match by email from the `parsedStaff` if possible? But `parsedStaff` is cleared.
                                    // I should NOT clear `parsedStaff` immediately if I want to match. 
                                    // Or better, I should keep `parsedStaff` until I'm done.

                                    // Let's update the strategy:
                                    // 1. We know the email from `invite.email`.
                                    // 2. We can try to find the phone number from the original CSV upload if we persisted it?
                                    //    But I cleared it. 
                                    //    Let's *not* clear parsedStaff? Or store the phone mapping.

                                    // Correct approach:
                                    // I will modify the previous step to NOT clear `parsedStaff` if there are results, OR save metadata.
                                    // But wait! `StaffInvitation` model has `extra_data`. 
                                    // `StaffInvitationSerializer` in `mizan-backend/accounts/serializers.py` did NOT have `extra_data` in fields.
                                    // So the frontend won't get the phone number back.

                                    // Quick fix: I will modify `handleBulkInvite` to SAVE the phone number mapping (Email -> Phone) in a state before clearing/sending.

                                    return (
                                        <div key={invite.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div>
                                                <p className="font-semibold text-gray-900">{invite.email}</p>
                                                <p className="text-sm text-gray-500">{invite.role}</p>
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    const token = invite.invitation_token;
                                                    const baseUrl = window.location.origin;
                                                    const link = `${baseUrl}/accept-invitation?token=${token}`;
                                                    const msg = encodeURIComponent(`You are invited to Mizan! Join here: ${link}`);

                                                    // Use enriched phone number if available
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    const phone = (invite as any).phone;

                                                    if (phone) {
                                                        const cleanPhone = phone.replace(/[^0-9]/g, '');
                                                        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                                                    } else {
                                                        window.open(`https://wa.me/?text=${msg}`, '_blank');
                                                    }
                                                }}
                                                variant="outline"
                                                className="border-green-600 text-green-700 hover:bg-green-50"
                                            >
                                                <MessageCircle className="w-4 h-4 mr-2" />
                                                Send WhatsApp
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

            </div>
        </div>
    );
};

export default AddStaff;