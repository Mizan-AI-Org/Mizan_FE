import React from 'react';
import { WifiOff, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OfflineWarningProps {
    onReconnectAttempt?: () => void;
}

const OfflineWarning: React.FC<OfflineWarningProps> = ({ onReconnectAttempt }) => {
    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center justify-center text-red-600">
                        <WifiOff className="w-8 h-8 mr-2" />
                        You are Offline!
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        It looks like your device is currently disconnected from the internet.
                        Some features may not be available.
                    </p>
                    <p className="text-sm text-gray-500">
                        Don't worry, we'll automatically try to sync your data once you're back online.
                    </p>
                    {onReconnectAttempt && (
                        <Button onClick={onReconnectAttempt} className="mt-4">
                            <AlertCircle className="w-4 h-4 mr-2" /> Try to Reconnect
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OfflineWarning;
