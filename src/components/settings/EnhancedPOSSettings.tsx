import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plug,
  RefreshCw,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

interface POSProvider {
  id: string;
  name: string;
  logo: string;
  supportsOAuth: boolean;
  supportsTaxSync: boolean;
  supportsInventorySync: boolean;
}

const posProviders: POSProvider[] = [
  {
    id: 'square',
    name: 'Square',
    logo: '⬛',
    supportsOAuth: true,
    supportsTaxSync: true,
    supportsInventorySync: true,
  },
  {
    id: 'toast',
    name: 'Toast',
    logo: '🍞',
    supportsOAuth: false,
    supportsTaxSync: true,
    supportsInventorySync: true,
  },
  {
    id: 'clover',
    name: 'Clover',
    logo: '🍀',
    supportsOAuth: false,
    supportsTaxSync: true,
    supportsInventorySync: false,
  },
];

interface ConnectionStatus {
  provider: string;
  is_connected: boolean;
  merchant_id: string | null;
  location_id: string | null;
  last_sync: string | null;
}

interface EnhancedPOSSettingsProps {
  onSave?: (settings: any) => void;
}

export default function EnhancedPOSSettings({ onSave }: EnhancedPOSSettingsProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState('15');
  const [syncSales, setSyncSales] = useState(true);
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncTaxes, setSyncTaxes] = useState(true);
  const [syncPayments, setSyncPayments] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isConnected = connectionStatus?.is_connected ?? false;
  const connectedProvider = posProviders.find((p) => p.id === connectionStatus?.provider?.toLowerCase());
  const provider = posProviders.find((p) => p.id === selectedProvider);

  useEffect(() => {
    fetchConnectionStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.get('pos_connected') === 'true') {
      toast.success('POS connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
      fetchConnectionStatus();
    }
    if (params.get('pos_error')) {
      toast.error(`POS connection failed: ${params.get('pos_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const authHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  });

  const fetchConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const resp = await fetch(`${API_BASE}/pos/connection-status/`, { headers: authHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        setConnectionStatus(data);
        if (data?.provider && data.provider !== 'NONE') {
          setSelectedProvider(data.provider.toLowerCase());
        }
      }
    } catch (err) {
      console.error('Failed to fetch POS status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthConnect = async (providerId: string) => {
    if (providerId !== 'square') {
      toast.info(`${posProviders.find(p => p.id === providerId)?.name} integration coming soon. Currently only Square is supported via OAuth.`);
      return;
    }

    try {
      setIsConnecting(true);
      const resp = await fetch(`${API_BASE}/pos/square/authorize/`, { headers: authHeaders() });
      const data = await resp.json();
      if (resp.ok && data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || 'Failed to generate authorization URL.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Connection failed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      const resp = await fetch(`${API_BASE}/pos/square/disconnect/`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast.success('POS disconnected.');
        setConnectionStatus(null);
        setSelectedProvider('');
      } else {
        toast.error(data.error || 'Failed to disconnect.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await fetch(`${API_BASE}/pos/sync/menu/`, { method: 'POST', headers: authHeaders() });
      await fetch(`${API_BASE}/pos/sync/orders/`, { method: 'POST', headers: authHeaders() });
      toast.success('Sync started. Data will be updated shortly.');
      setTimeout(fetchConnectionStatus, 3000);
    } catch (err: any) {
      toast.error('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading POS settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {isConnected && connectedProvider && (
        <Card className="shadow-soft border-success/30">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-success" />
                <div>
                  <p className="font-semibold text-success">
                    Connected to {connectedProvider.logo} {connectedProvider.name}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {connectionStatus?.merchant_id && (
                      <Badge variant="outline" className="text-xs">
                        Merchant: {connectionStatus.merchant_id}
                      </Badge>
                    )}
                    {connectionStatus?.location_id && (
                      <Badge variant="outline" className="text-xs">
                        Location: {connectionStatus.location_id}
                      </Badge>
                    )}
                  </div>
                  {connectionStatus?.last_sync && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Token expires: {new Date(connectionStatus.last_sync).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                size="sm"
                disabled={isDisconnecting}
              >
                {isDisconnecting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Selection (when not connected) */}
      {!isConnected && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plug className="w-5 h-5 mr-2" />
              Connect Your POS
            </CardTitle>
            <CardDescription>
              Connect your POS system so Miya can pull sales data, analyze trends, and generate prep lists.
              Each restaurant's data is completely isolated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {posProviders.map((prov) => (
                <button
                  key={prov.id}
                  onClick={() => setSelectedProvider(prov.id)}
                  className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${
                    selectedProvider === prov.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <span className="text-3xl">{prov.logo}</span>
                  <span className="font-medium">{prov.name}</span>
                  {prov.supportsOAuth && (
                    <Badge variant="secondary" className="text-xs">OAuth</Badge>
                  )}
                  {!prov.supportsOAuth && (
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  )}
                </button>
              ))}
            </div>

            {selectedProvider && (
              <div className="pt-4">
                <Separator className="mb-4" />
                {provider?.supportsOAuth ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900 dark:text-blue-100">Secure OAuth Connection</p>
                        <p className="text-blue-700 dark:text-blue-300 mt-1">
                          You'll be redirected to {provider.name} to authorize Mizan AI. We never see your
                          {provider.name} password. Your data is encrypted and isolated to your restaurant only.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleOAuthConnect(selectedProvider)}
                      className="w-full"
                      size="lg"
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4 mr-2" />
                      )}
                      Connect to {provider.name}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-100">{provider?.name} integration coming soon</p>
                      <p className="text-amber-700 dark:text-amber-300 mt-1">
                        Square is currently the only supported POS. We're working on {provider?.name} next.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync Management (when connected) */}
      {isConnected && (
        <>
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="w-5 h-5 mr-2" />
                Sync Settings
              </CardTitle>
              <CardDescription>Configure what data to sync and how often</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Sync</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync data at regular intervals
                  </p>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>

              {autoSync && (
                <div className="space-y-2">
                  <Label htmlFor="sync-interval">Sync Interval</Label>
                  <Select value={syncInterval} onValueChange={setSyncInterval}>
                    <SelectTrigger id="sync-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Every 5 minutes</SelectItem>
                      <SelectItem value="15">Every 15 minutes</SelectItem>
                      <SelectItem value="30">Every 30 minutes</SelectItem>
                      <SelectItem value="60">Every hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Data to Sync</h4>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <Label>Sales & Orders</Label>
                    <p className="text-xs text-muted-foreground">Orders, payments, and transactions</p>
                  </div>
                  <Switch checked={syncSales} onCheckedChange={setSyncSales} />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <Label>Menu & Catalog</Label>
                    <p className="text-xs text-muted-foreground">Keep menu items in sync with POS</p>
                  </div>
                  <Switch checked={syncInventory} onCheckedChange={setSyncInventory} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tax Rates</Label>
                    <p className="text-xs text-muted-foreground">Sync tax configurations</p>
                  </div>
                  <Switch checked={syncTaxes} onCheckedChange={setSyncTaxes} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Payment Methods</Label>
                    <p className="text-xs text-muted-foreground">
                      Sync payment method data
                    </p>
                  </div>
                  <Switch checked={syncPayments} onCheckedChange={setSyncPayments} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Manual Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={handleManualSync}
                  variant="outline"
                  className="flex-1"
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Sync Now
                </Button>
                <Button
                  onClick={() => {
                    const settings = {
                      provider: selectedProvider,
                      autoSync,
                      syncInterval: parseInt(syncInterval),
                      syncSales,
                      syncInventory,
                      syncTaxes,
                      syncPayments,
                    };
                    onSave?.(settings);
                    toast.success('Sync settings saved!');
                  }}
                  className="flex-1"
                >
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
