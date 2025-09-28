import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload, Loader2, ChefHat, Clock, Users, X } from 'lucide-react';

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface Recipe {
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: string;
  difficulty: string;
  servings: number;
}

interface MenuItem {
  name: string;
  price: string;
  description?: string;
  recipe: Recipe;
}

interface MenuCategory {
  name: string;
  items: MenuItem[];
}

interface MenuData {
  categories: MenuCategory[];
}

export default function MenuScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    await processImage(file);
  };

  const processImage = async (file: File) => {
    setIsScanning(true);
    setMenuData(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string;

        try {
          console.log('Sending image to menu scanner...');
          const { data, error } = await supabase.functions.invoke('menu-scanner', {
            body: { image: base64Image }
          });

          if (error) {
            throw error;
          }

          if (data.error) {
            throw new Error(data.error);
          }

          setMenuData(data.menuData);
          toast({
            title: 'Menu scanned successfully!',
            description: 'Your menu has been analyzed and recipes have been generated.',
          });
        } catch (error) {
          console.error('Error processing menu:', error);
          toast({
            title: 'Failed to scan menu',
            description: error instanceof Error ? error.message : 'An error occurred while processing the menu.',
            variant: 'destructive',
          });
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: 'Error reading file',
        description: 'Failed to read the image file.',
        variant: 'destructive',
      });
      setIsScanning(false);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOpen(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera access denied',
        description: 'Please allow camera access to take photos of your menu.',
        variant: 'destructive',
      });
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'menu-photo.jpg', { type: 'image/jpeg' });
            
            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
              setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
            
            closeCamera();
            await processImage(file);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-success';
      case 'medium': return 'bg-warning';
      case 'hard': return 'bg-destructive';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            Menu Scanner
          </CardTitle>
          <CardDescription>
            Upload a photo of your physical menu to automatically generate digital menu items with recipes and ingredient lists
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Menu preview"
                  className="w-full max-w-md mx-auto rounded-lg border"
                />
              </div>
            )}

            {isCameraOpen && (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full max-w-md mx-auto rounded-lg border"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-4 mt-4 justify-center">
                  <Button
                    onClick={capturePhoto}
                    disabled={isScanning}
                    className="flex-1 max-w-32"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                  <Button
                    onClick={closeCamera}
                    variant="outline"
                    disabled={isScanning}
                    className="flex-1 max-w-32"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning || isCameraOpen}
                variant="outline"
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <Button
                onClick={openCamera}
                disabled={isScanning || isCameraOpen}
                variant="outline"
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </div>

            {isScanning && (
              <div className="flex items-center justify-center p-8">
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Analyzing menu and generating recipes...
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {menuData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Scanned Menu Results</h3>
            <Badge variant="secondary">
              {menuData.categories.reduce((total, cat) => total + cat.items.length, 0)} items found
            </Badge>
          </div>

          {menuData.categories.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="space-y-4 p-4 bg-secondary rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-base">{item.name}</h4>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">{item.price}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getDifficultyColor(item.recipe.difficulty)}>
                              {item.recipe.difficulty}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium flex items-center mb-2">
                            <ChefHat className="w-4 h-4 mr-1" />
                            Ingredients
                          </h5>
                          <ul className="space-y-1 text-sm">
                            {item.recipe.ingredients.map((ingredient, ingIndex) => (
                              <li key={ingIndex} className="flex justify-between">
                                <span>{ingredient.name}</span>
                                <span className="text-muted-foreground">
                                  {ingredient.quantity} {ingredient.unit}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h5 className="font-medium mb-2">Instructions</h5>
                          <ol className="space-y-1 text-sm list-decimal list-inside">
                            {item.recipe.instructions.map((instruction, instIndex) => (
                              <li key={instIndex} className="text-muted-foreground">
                                {instruction}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {item.recipe.prepTime}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {item.recipe.servings} serving{item.recipe.servings !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}