import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-red-600">Something went wrong.</CardTitle>
                            <CardDescription>We're sorry for the inconvenience. Please try again later.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {this.state.error && (
                                <div className="bg-red-50 border border-red-200 p-3 rounded-md text-sm text-red-800">
                                    <p className="font-semibold">Error:</p>
                                    <p>{this.state.error.toString()}</p>
                                </div>
                            )}
                            {this.state.errorInfo && (
                                <details className="text-sm text-gray-700">
                                    <summary className="cursor-pointer text-blue-600">Details</summary>
                                    <pre className="mt-2 p-2 bg-gray-50 rounded-md overflow-auto max-h-40">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}
                            <Button onClick={() => window.location.reload()} className="w-full">
                                Reload Page
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
