import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Upload, 
  Wifi, 
  WifiOff, 
  Loader2, 
  Plus,
  Calendar,
  DollarSign,
  Receipt,
  FileText
} from 'lucide-react';

interface SalesEntry {
  date: string;
  amount: number;
  orders: number;
  paymentMethod: string;
}

export default function POSIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [salesData, setSalesData] = useState<SalesEntry[]>([]);
  const [manualEntry, setManualEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    orders: '',
    paymentMethod: 'cash'
  });
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsConnecting(true);
    // Simulate API connection
    setTimeout(() => {
      setIsConnected(true);
      setIsConnecting(false);
      toast({
        title: 'POS Connected',
        description: 'Successfully connected to your POS system.',
      });
    }, 2000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    toast({
      title: 'POS Disconnected',
      description: 'Disconnected from POS system.',
    });
  };

  const handleManualEntry = () => {
    if (!manualEntry.amount || !manualEntry.orders) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const newEntry: SalesEntry = {
      date: manualEntry.date,
      amount: parseFloat(manualEntry.amount),
      orders: parseInt(manualEntry.orders),
      paymentMethod: manualEntry.paymentMethod
    };

    setSalesData([newEntry, ...salesData]);
    setManualEntry({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      orders: '',
      paymentMethod: 'cash'
    });

    toast({
      title: 'Sales data added',
      description: 'Manual sales entry has been recorded.',
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file.',
        variant: 'destructive',
      });
      return;
    }

    // Simulate CSV processing
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target?.result as string;
      // Simple CSV parsing (in real app, use proper CSV library)
      const lines = csvData.split('\n').slice(1); // Skip header
      const entries: SalesEntry[] = lines
        .filter(line => line.trim())
        .map(line => {
          const [date, amount, orders, paymentMethod] = line.split(',');
          return {
            date: date.trim(),
            amount: parseFloat(amount.trim()),
            orders: parseInt(orders.trim()),
            paymentMethod: paymentMethod?.trim() || 'cash'
          };
        });

      setSalesData([...entries, ...salesData]);
      toast({
        title: 'Data imported',
        description: `Imported ${entries.length} sales entries.`,
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            POS Integration
          </CardTitle>
          <CardDescription>
            Connect your Point of Sale system or manually input sales data for better analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div className="flex items-center space-x-3">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-success" />
              ) : (
                <WifiOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {isConnected ? 'Connected to Square POS' : 'Not Connected'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isConnected 
                    ? 'Real-time data sync enabled' 
                    : 'Connect your POS for automatic data sync'
                  }
                </p>
              </div>
            </div>
            <div>
              {isConnected ? (
                <Button onClick={handleDisconnect} variant="outline">
                  Disconnect
                </Button>
              ) : (
                <Button onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect POS'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="upload">File Upload</TabsTrigger>
          <TabsTrigger value="history">Sales History</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Manual Sales Entry
              </CardTitle>
              <CardDescription>
                Add sales data manually when POS integration is not available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sales-date">Date</Label>
                  <Input
                    id="sales-date"
                    type="date"
                    value={manualEntry.date}
                    onChange={(e) => setManualEntry({...manualEntry, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sales-amount">Total Sales ($)</Label>
                  <Input
                    id="sales-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={manualEntry.amount}
                    onChange={(e) => setManualEntry({...manualEntry, amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orders-count">Number of Orders</Label>
                  <Input
                    id="orders-count"
                    type="number"
                    placeholder="0"
                    value={manualEntry.orders}
                    onChange={(e) => setManualEntry({...manualEntry, orders: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <select
                    id="payment-method"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={manualEntry.paymentMethod}
                    onChange={(e) => setManualEntry({...manualEntry, paymentMethod: e.target.value})}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleManualEntry} className="w-full">
                Add Sales Entry
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Bulk Data Upload
              </CardTitle>
              <CardDescription>
                Upload sales data from CSV files exported from your POS system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Drop your CSV file here or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Button onClick={() => document.getElementById('csv-upload')?.click()}>
                  Choose File
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">CSV Format:</p>
                <p>Date, Amount, Orders, Payment Method</p>
                <p>Example: 2024-01-15, 1250.50, 45, card</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="w-5 h-5 mr-2" />
                Sales History
              </CardTitle>
              <CardDescription>
                View recorded sales data from all sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salesData.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No sales data recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{new Date(entry.date).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">{entry.orders} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${entry.amount.toFixed(2)}</p>
                        <Badge variant="outline" className="text-xs">
                          {entry.paymentMethod}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}