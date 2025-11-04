import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import Webcam from 'react-webcam';
import { Camera } from 'lucide-react';

const PinLogin: React.FC = () => {
    const [pin, setPin] = useState('');
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const webcamRef = React.useRef<Webcam>(null);
    const navigate = useNavigate();
    const { loginWithPin } = useAuth(); // Assuming useAuth provides a loginWithPin function
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLatitude(position.coords.latitude);
                    setLongitude(position.coords.longitude);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    toast.error("Unable to retrieve your location for verification.");
                }
            );
        } else {
            toast.error("Geolocation is not supported by your browser.");
        }
    }, []);

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const image = webcamRef.current.getScreenshot();
            setImageSrc(image);
        }
    }, [webcamRef]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length !== 4) {
            toast.error("PIN must be 4 digits.");
            return;
        }

        if (!imageSrc) {
            toast.error("Please capture your photo.");
            return;
        }

        if (latitude === null || longitude === null) {
            toast.error("Please allow location access for verification.");
            return;
        }

        try {
            await loginWithPin(pin, null, imageSrc, latitude, longitude);
            toast.success("Login successful!");
            navigate('/staff-dashboard'); // Redirect to staff dashboard after successful login
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "PIN login failed.";
            toast.error(message);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
            <Card className="w-full max-w-md bg-white/5 border-gray-700 shadow-xl backdrop-blur-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold text-white">Staff PIN Login</CardTitle>
                    <CardDescription className="text-gray-400">Enter your 4-digit PIN and capture your photo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="pin" className="text-lg text-gray-300">PIN Code</Label>
                            <Input
                                id="pin"
                                name="pin"
                                type="password"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="h-12 text-center text-xl tracking-widest bg-gray-800 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="● ● ● ●"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-lg text-gray-300">Facial Verification</Label>
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-600 bg-gray-800 flex items-center justify-center">
                                {imageSrc ? (
                                    <img src={imageSrc} alt="Captured" className="w-full h-full object-cover" />
                                ) : (
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                                    />
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={capture}
                                    className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/30 text-white"
                                >
                                    <Camera className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-colors duration-200">
                            Login
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default PinLogin;
