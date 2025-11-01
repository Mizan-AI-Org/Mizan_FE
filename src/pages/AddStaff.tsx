import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Users, Mail, User, Upload, Download, FileSpreadsheet, X, Check } from "lucide-react";
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
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [parsedStaff, setParsedStaff] = useState<StaffMember[]>([]);

    const validateForm = () => {
        const newErrors: FormErrors = {};

        if (!email) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = "Email is invalid";
        }

        if (!firstName) newErrors.firstName = "First name is required";
        if (!lastName) newErrors.lastName = "Last name is required";
        if (!role) newErrors.role = "Role is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInviteStaff = async () => {
        if (!validateForm()) return;

        setIsLoading(true);

        setTimeout(() => {
            alert(`Invitation sent to ${firstName} ${lastName} (${email})`);

            setEmail('');
            setFirstName('');
            setLastName('');
            setRole('');
            setPhoneNumber('');
            setErrors({});
            setIsLoading(false);
        }, 1500);
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
                    phoneNumber: values[headers.indexOf('phone')] || values[headers.indexOf('phonenumber')] || '',
                    status: 'pending'
                };

                if (staffMember.email) {
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
        setIsLoading(true);
        try {
            const resp = await fetch(`${API_BASE}/invitations/bulk/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ type: 'csv', csv_content: csvText }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data?.detail || 'Bulk invite failed');
            }
            alert(`Processed ${data.success + data.failed} invites. Success: ${data.success}, Failed: ${data.failed}`);
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
        const lines = [
            'sep=,',
            'email,firstname,lastname,role,department,phone',
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
                                    Email Address
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
                                        Phone Number (Optional)
                                    </Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+212 (555) 000-0000"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Preview Card */}
                            {(firstName || lastName || email) && (
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
                                                {email || 'email@example.com'}
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
                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={handleInviteStaff}
                                    disabled={isLoading}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-green-900 to-green-900 hover:from-blue-900 hover:to-indigo-700 text-white h-12 font-medium shadow-md"
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

            </div>
        </div>
    );
};

export default AddStaff;