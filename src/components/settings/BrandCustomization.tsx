import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Palette,
  Upload,
  Image as ImageIcon,
  Type,
  Save,
  Eye,
  Download,
  QrCode,
} from 'lucide-react';
import { toast } from 'sonner';

export default function BrandCustomization() {
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#155e3e');
  const [secondaryColor, setSecondaryColor] = useState('#f59e0b');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [qrCodeData, setQrCodeData] = useState('https://your-restaurant.com/menu');

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoUrl(e.target?.result as string);
        toast.success('Logo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    toast.success('Brand settings saved successfully!');
  };

  const handleGenerateQR = () => {
    toast.success('QR code generated! You can download it below.');
  };

  const fonts = [
    'Inter',
    'Roboto',
    'Poppins',
    'Montserrat',
    'Playfair Display',
    'Lora',
    'Open Sans',
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="logo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="logo">Logo & Images</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="qr">QR Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="logo" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" />
                Restaurant Logo
              </CardTitle>
              <CardDescription>
                Upload your restaurant logo for use across the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {logoUrl && (
                <div className="flex justify-center p-8 bg-secondary rounded-lg">
                  <img
                    src={logoUrl}
                    alt="Restaurant Logo"
                    className="max-h-32 object-contain"
                  />
                </div>
              )}

              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Drop your logo here or click to browse
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button onClick={() => document.getElementById('logo-upload')?.click()}>
                  Choose File
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Recommended size: 512x512 pixels</p>
                <p>• Supported formats: PNG, JPG, SVG</p>
                <p>• Maximum file size: 2MB</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Brand Information</CardTitle>
              <CardDescription>Add your restaurant's tagline and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g., Fresh Food, Fresh Vibes"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell customers about your restaurant..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="w-5 h-5 mr-2" />
                Brand Colors
              </CardTitle>
              <CardDescription>
                Customize your restaurant's color scheme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#155e3e"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for buttons, links, and primary actions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#f59e0b"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for secondary elements and accents
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent-color"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#10b981"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for highlights and special elements
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Color Preview</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div
                      className="h-24 rounded-lg"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <p className="text-xs text-center text-muted-foreground">Primary</p>
                  </div>
                  <div className="space-y-2">
                    <div
                      className="h-24 rounded-lg"
                      style={{ backgroundColor: secondaryColor }}
                    />
                    <p className="text-xs text-center text-muted-foreground">Secondary</p>
                  </div>
                  <div className="space-y-2">
                    <div
                      className="h-24 rounded-lg"
                      style={{ backgroundColor: accentColor }}
                    />
                    <p className="text-xs text-center text-muted-foreground">Accent</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-secondary rounded-lg">
                <h4 className="font-medium mb-2">Preview</h4>
                <div className="space-y-2">
                  <Button style={{ backgroundColor: primaryColor }} className="w-full">
                    Primary Button
                  </Button>
                  <Button
                    style={{ backgroundColor: secondaryColor }}
                    className="w-full"
                  >
                    Secondary Button
                  </Button>
                  <Badge style={{ backgroundColor: accentColor }}>Accent Badge</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Type className="w-5 h-5 mr-2" />
                Typography
              </CardTitle>
              <CardDescription>Choose fonts for your brand</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="font-family">Primary Font</Label>
                <select
                  id="font-family"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {fonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              <Separator />

              <div className="space-y-4 p-4 bg-secondary rounded-lg">
                <h4 className="font-medium">Typography Preview</h4>
                <div style={{ fontFamily }} className="space-y-2">
                  <h1 className="text-4xl font-bold">Heading 1</h1>
                  <h2 className="text-3xl font-semibold">Heading 2</h2>
                  <h3 className="text-2xl font-medium">Heading 3</h3>
                  <p className="text-base">
                    This is a paragraph of body text. It shows how your chosen font will
                    look in regular content.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This is smaller text, often used for captions and descriptions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="w-5 h-5 mr-2" />
                QR Code Generator
              </CardTitle>
              <CardDescription>
                Generate QR codes for table ordering, menu access, and more
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qr-data">QR Code URL</Label>
                <Input
                  id="qr-data"
                  value={qrCodeData}
                  onChange={(e) => setQrCodeData(e.target.value)}
                  placeholder="https://your-restaurant.com/menu"
                />
              </div>

              <Button onClick={handleGenerateQR} className="w-full">
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR Code
              </Button>

              <div className="flex justify-center p-8 bg-secondary rounded-lg">
                <div className="text-center space-y-4">
                  <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center border-2 border-border">
                    <QrCode className="w-32 h-32 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    QR code will appear here
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quick Actions</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQrCodeData('https://your-restaurant.com/menu')}
                  >
                    Menu QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQrCodeData('https://your-restaurant.com/order')}
                  >
                    Order QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQrCodeData('https://your-restaurant.com/wifi')}
                  >
                    WiFi QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQrCodeData('https://your-restaurant.com/feedback')}
                  >
                    Feedback QR
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-4">
        <Button onClick={handleSave} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          Save Brand Settings
        </Button>
        <Button variant="outline" className="flex-1">
          <Eye className="w-4 h-4 mr-2" />
          Preview Changes
        </Button>
      </div>
    </div>
  );
}