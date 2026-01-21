import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface LiveDateTimeProps {
    showDate?: boolean;
    showTime?: boolean;
}

export const LiveDateTime: React.FC<LiveDateTimeProps> = ({
    showDate = true,
    showTime = true
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5 whitespace-nowrap">
            {showDate && (
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">{formatDate(currentTime)}</span>
                </div>
            )}
            {showDate && showTime && <div className="w-px h-4 bg-border" />}
            {showTime && (
                <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span className="font-mono tabular-nums">{formatTime(currentTime)}</span>
                </div>
            )}
        </div>
    );
};

export default LiveDateTime;
