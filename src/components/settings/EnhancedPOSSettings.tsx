import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plug,
  Settings,
  RefreshCw,
  Webhook,
  Key,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface POSProvider {
  id: string;
  name: string;
  logo: string;
  requiresApiKey: boolean;
  requiresWebhook: boolean;
  supportsTaxSync: boolean;
  supportsInventorySync: boolean;
}

const posProviders: POSProvider[] = [
  {
    id: 'square',
    name: 'Square',
    logo: '⬛',
    requiresApiKey: true,
    requiresWebhook: true,
    supportsTaxSync: true,
    supportsInventorySync: true,
  },
  {
    id: 'toast',
    name: 'Toast',
    logo: '🍞',
    requiresApiKey: true,
    requiresWebhook: true,
    supportsTaxSync: true,
    supportsInventorySync: true,
  },
  {
    id: 'clover',
    name: 'Clover',
    logo: '🍀',
    requiresApiKey: true,
    requiresWebhook: false,
    supportsTaxSync: true,
    supportsInventorySync: false,
  },
  {
    id: 'lightspeed',
    name: 'Lightspeed',
    logo: '⚡',
    requiresApiKey: true,
    requiresWebhook: true,
    supportsTaxSync: true,
    supportsInventorySync: true,
  },
  {
    id: 'shopify',
    name: 'Shopify POS',
    logo: '🛍️',
    requiresApiKey: true,
    requiresWebhook: true,
    supportsTaxSync: false,
    supportsInventorySync: true,
  },
];

interface EnhancedPOSSettingsProps {
  onSave?: (settings: any) => void;
}

export default function EnhancedPOSSettings({ onSave }: EnhancedPOSSettingsProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState('15');
  const [syncSales, setSyncSales] = useState(true);
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncTaxes, setSyncTaxes] = useState(true);
  const [syncPayments, setSyncPayments] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const provider = posProviders.find((p) => p.id === selectedProvider);

  const handleConnect = () => {
    if (!selectedProvider) {
      toast.error('Please select a POS provider');
      return;
    }
    if (provider?.requiresApiKey && !apiKey) {
      toast.error('API Key is required');
      return;
    }

    // Simulate connection
    setIsConnected(true);
    setLastSyncTime(new Date());
    toast.success(`Successfully connected to ${provider?.name}`);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setApiKey('');
    setApiSecret('');
    setWebhookUrl('');
    toast.success('Disconnected from POS system');
  };

  const handleTestConnection = () => {
    toast.info('Testing connection...');
    setTimeout(() => {
      toast.success('Connection test successful!');
    }, 1500);
  };

  const handleManualSync = () => {
    toast.info('Starting manual sync...');
    setTimeout(() => {
      setLastSyncTime(new Date());
      toast.success('Sync completed successfully!');
    }, 2000);
  };

  const handleSave = () => {
    const settings = {
      provider: selectedProvider,
      apiKey,
      apiSecret,
      webhookUrl,
      autoSync,
      syncInterval: parseInt(syncInterval),
      syncSales,
      syncInventory,
      syncTaxes,
      syncPayments,
    };
    onSave?.(settings);
    toast.success('POS settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plug className="w-5 h-5 mr-2" />
            POS Provider
          </CardTitle>
          <CardDescription>Select and configure your Point of Sale system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pos-provider">Select Provider</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger id="pos-provider">
                <SelectValue placeholder="Choose a POS provider" />
              </SelectTrigger>
              <SelectContent>
                {posProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex items-center">
                      <span className="mr-2">{provider.logo}</span>
                      {provider.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isConnected && provider && (
            <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <div>
                  <p className="font-medium text-success">Connected to {provider.name}</p>
                  {lastSyncTime && (
                    <p className="text-sm text-muted-foreground">
                      Last synced: {lastSyncTime.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <Button onClick={handleDisconnect} variant="outline" size="sm">
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProvider && !isConnected && (
        <Tabs defaultValue="credentials" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="sync">Sync Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="credentials" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  API Credentials
                </CardTitle>
                <CardDescription>
                  Enter your {provider?.name} API credentials to establish connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {provider?.requiresApiKey && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="api-key">API Key *</Label>
                      <Input
                        id="api-key"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api-secret">API Secret</Label>
                      <Input
                        id="api-secret"
                        type="password"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Enter your API secret (optional)"
                      />
                    </div>
                  </>
                )}

                {provider?.requiresWebhook && (
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://your-domain.com/webhook"
                    />
                    <p className="text-xs text-muted-foreground">
                      Configure this URL in your {provider?.name} dashboard for real-time updates
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleConnect} className="flex-1">
                    Connect to {provider?.name}
                  </Button>
                  <Button onClick={handleTestConnection} variant="outline">
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Synchronization Settings
                </CardTitle>
                <CardDescription>Configure what data to sync and how often</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
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
                    <Label htmlFor="sync-interval">Sync Interval (minutes)</Label>
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

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sales Data</Label>
                      <p className="text-xs text-muted-foreground">Sync orders and transactions</p>
                    </div>
                    <Switch checked={syncSales} onCheckedChange={setSyncSales} />
                  </div>

                  {provider?.supportsInventorySync && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Inventory Levels</Label>
                        <p className="text-xs text-muted-foreground">
                          Keep inventory in sync
                        </p>
                      </div>
                      <Switch checked={syncInventory} onCheckedChange={setSyncInventory} />
                    </div>
                  )}

                  {provider?.supportsTaxSync && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Tax Rates</Label>
                        <p className="text-xs text-muted-foreground">Sync tax configurations</p>
                      </div>
                      <Switch checked={syncTaxes} onCheckedChange={setSyncTaxes} />
                    </div>
                  )}

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
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Advanced Configuration
                </CardTitle>
                <CardDescription>Fine-tune your POS integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location-id">Location ID</Label>
                  <Input
                    id="location-id"
                    placeholder="Enter location ID (if applicable)"
                  />
                  <p className="text-xs text-muted-foreground">
                    For multi-location setups, specify which location to sync
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="merchant-id">Merchant ID</Label>
                  <Input
                    id="merchant-id"
                    placeholder="Enter merchant ID (if applicable)"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Retry Failed Syncs</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically retry failed synchronizations
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Log Sync Activity</Label>
                    <p className="text-xs text-muted-foreground">
                      Keep detailed logs of all sync operations
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {isConnected && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Sync Management
            </CardTitle>
            <CardDescription>Manage your data synchronization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={handleManualSync} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Manual Sync
              </Button>
              <Button onClick={handleSave} className="w-full">
                Save Settings
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground">Sales Synced</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground">Items Synced</p>
                <p className="text-2xl font-bold">456</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground">Last Sync</p>
                <p className="text-sm font-medium">2 min ago</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="default" className="mt-1">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}