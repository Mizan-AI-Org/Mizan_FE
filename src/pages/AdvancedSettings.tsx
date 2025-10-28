import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { AuthContextType } from '../contexts/AuthContext.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Settings, 
  MapPin, 
  CreditCard, 
  Zap,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface GeolocationData {
  latitude: number;
  longitude: number;
  radius: number;
  geofence_enabled: boolean;
  geofence_polygon: Array<[number, number]>;
}

interface POSSettings {
  pos_provider: string;
  pos_merchant_id: string;
  pos_is_connected: boolean;
}

interface AISettings {
  enabled: boolean;
  ai_provider: string;
  features_enabled: Record<string, boolean>;
}

export default function AdvancedSettings() {
  const { user } = useAuth() as AuthContextType;
  const [isLoading, setIsLoading] = useState(false);
  const [showAPIKey, setShowAPIKey] = useState(false);
  
  // Geolocation state
  const [geolocation, setGeolocation] = useState<GeolocationData>({
    latitude: 0,
    longitude: 0,
    radius: 500,
    geofence_enabled: true,
    geofence_polygon: []
  });
  
  // POS state
  const [posSettings, setPosSettings] = useState<POSSettings>({
    pos_provider: 'NONE',
    pos_merchant_id: '',
    pos_is_connected: false
  });
  const [posAPIKey, setPosAPIKey] = useState('');
  const [posTestingConnection, setPosTestingConnection] = useState(false);
  const [posConnectionStatus, setPosConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  
  // AI Assistant state
  const [aiSettings, setAiSettings] = useState<AISettings>({
    enabled: true,
    ai_provider: 'GROQ',
    features_enabled: {
      insights: true,
      recommendations: true,
      reports: true
    }
  });
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Load geolocation settings
      const geoResponse = await fetch(`${API_BASE}/settings/geolocation/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (geoResponse.ok) {
        setGeolocation(await geoResponse.json());
      }
      
      // Load POS settings
      const posResponse = await fetch(`${API_BASE}/settings/pos_integration/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (posResponse.ok) {
        const data = await posResponse.json();
        setPosSettings(data);
      }
      
      // Load AI settings
      const aiResponse = await fetch(`${API_BASE}/settings/ai_assistant_config/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (aiResponse.ok) {
        setAiSettings(await aiResponse.json());
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    }
  };
  
  const updateGeolocation = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/settings/geolocation/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(geolocation)
      });
      
      if (response.ok) {
        toast.success('Geolocation settings updated');
      } else {
        throw new Error('Failed to update');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update geolocation');
    } finally {
      setIsLoading(false);
    }
  };
  
  const testPosConnection = async () => {
    setPosTestingConnection(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/settings/test_pos_connection/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pos_provider: posSettings.pos_provider,
          pos_merchant_id: posSettings.pos_merchant_id,
          pos_api_key: posAPIKey
        })
      });
      
      const data = await response.json();
      if (data.connected) {
        setPosConnectionStatus('connected');
        toast.success('POS connection successful');
      } else {
        setPosConnectionStatus('error');
        toast.error('POS connection failed: ' + data.message);
      }
    } catch (error: any) {
      setPosConnectionStatus('error');
      toast.error('Connection test failed: ' + error.message);
    } finally {
      setPosTestingConnection(false);
    }
  };
  
  const updatePosSettings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/settings/pos_integration/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pos_provider: posSettings.pos_provider,
          pos_merchant_id: posSettings.pos_merchant_id,
          pos_api_key: posAPIKey
        })
      });
      
      if (response.ok) {
        toast.success('POS settings updated');
        await testPosConnection();
      } else {
        throw new Error('Failed to update');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update POS settings');
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateAiSettings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/settings/ai_assistant_config/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(aiSettings)
      });
      
      if (response.ok) {
        toast.success('AI Assistant settings updated');
      } else {
        throw new Error('Failed to update');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update AI settings');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Advanced Settings
        </h1>
        <p className="text-gray-600 mt-2">Configure geolocation, POS integration, and AI features</p>
      </div>
      
      <Tabs defaultValue="geolocation" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="geolocation" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Geolocation</span>
          </TabsTrigger>
          <TabsTrigger value="pos" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">POS</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">AI Assistant</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Geolocation Tab */}
        <TabsContent value="geolocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Geolocation</CardTitle>
              <CardDescription>
                Set your restaurant location and geofence perimeter for staff tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    value={geolocation.latitude}
                    onChange={(e) => setGeolocation({...geolocation, latitude: parseFloat(e.target.value)})}
                    placeholder="40.7128"
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., 40.7128 for New York</p>
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    value={geolocation.longitude}
                    onChange={(e) => setGeolocation({...geolocation, longitude: parseFloat(e.target.value)})}
                    placeholder="-74.0060"
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., -74.0060 for New York</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="radius">Geofence Radius (meters)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="radius"
                    type="number"
                    value={geolocation.radius}
                    onChange={(e) => setGeolocation({...geolocation, radius: parseFloat(e.target.value)})}
                    placeholder="500"
                  />
                  <span className="text-sm text-gray-600 font-semibold">m</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Current: {geolocation.radius}m</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="geofence-enabled"
                  checked={geolocation.geofence_enabled}
                  onChange={(e) => setGeolocation({...geolocation, geofence_enabled: e.target.checked})}
                  className="h-4 w-4"
                />
                <Label htmlFor="geofence-enabled" className="cursor-pointer">
                  Enable Geofence Monitoring
                </Label>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Use Google Maps or a mapping service to find your exact coordinates, 
                  then set an appropriate radius (typically 300-1000m for restaurants).
                </p>
              </div>
              
              <Button onClick={updateGeolocation} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Geolocation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* POS Integration Tab */}
        <TabsContent value="pos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>POS Integration Settings</CardTitle>
              <CardDescription>
                Connect your POS system for real-time transaction tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="pos-provider">POS Provider</Label>
                <select
                  id="pos-provider"
                  value={posSettings.pos_provider}
                  onChange={(e) => setPosSettings({...posSettings, pos_provider: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="NONE">Not Configured</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="SQUARE">Square</option>
                  <option value="CLOVER">Clover</option>
                  <option value="CUSTOM">Custom API</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="pos-merchant">Merchant ID</Label>
                <Input
                  id="pos-merchant"
                  value={posSettings.pos_merchant_id}
                  onChange={(e) => setPosSettings({...posSettings, pos_merchant_id: e.target.value})}
                  placeholder="Enter your merchant ID"
                />
              </div>
              
              <div>
                <Label htmlFor="pos-api-key">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="pos-api-key"
                      type={showAPIKey ? "text" : "password"}
                      value={posAPIKey}
                      onChange={(e) => setPosAPIKey(e.target.value)}
                      placeholder="Enter your API key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAPIKey(!showAPIKey)}
                      className="absolute right-3 top-2.5 text-gray-600"
                    >
                      {showAPIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={updatePosSettings} 
                  disabled={isLoading || posSettings.pos_provider === 'NONE'}
                  className="flex-1"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save & Test
                </Button>
              </div>
              
              {posConnectionStatus !== 'idle' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  posConnectionStatus === 'connected' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {posConnectionStatus === 'connected' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800">POS connection successful</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-red-800">POS connection failed</span>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Assistant Configuration</CardTitle>
              <CardDescription>
                Enable AI-powered insights and recommendations for your restaurant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ai-enabled"
                  checked={aiSettings.enabled}
                  onChange={(e) => setAiSettings({...aiSettings, enabled: e.target.checked})}
                  className="h-4 w-4"
                />
                <Label htmlFor="ai-enabled" className="cursor-pointer">
                  Enable AI Assistant
                </Label>
              </div>
              
              <div>
                <Label htmlFor="ai-provider">AI Provider</Label>
                <select
                  id="ai-provider"
                  value={aiSettings.ai_provider}
                  onChange={(e) => setAiSettings({...aiSettings, ai_provider: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="GROQ">Groq (Recommended)</option>
                  <option value="OPENAI">OpenAI</option>
                  <option value="CLAUDE">Claude</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <Label>Enabled Features</Label>
                {Object.entries(aiSettings.features_enabled).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`feature-${feature}`}
                      checked={enabled}
                      onChange={(e) => setAiSettings({
                        ...aiSettings,
                        features_enabled: {
                          ...aiSettings.features_enabled,
                          [feature]: e.target.checked
                        }
                      })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`feature-${feature}`} className="cursor-pointer capitalize">
                      {feature}
                    </Label>
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Features:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li><strong>Insights:</strong> AI-powered analytics of your restaurant data</li>
                    <li><strong>Recommendations:</strong> Smart suggestions for optimization</li>
                    <li><strong>Reports:</strong> Automated report generation</li>
                  </ul>
                </p>
              </div>
              
              <Button onClick={updateAiSettings} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save AI Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}