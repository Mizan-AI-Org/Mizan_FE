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

/** Browser extensions / dnd-kit / Radix portals can throw NotFoundError DOM races — ignore those. */
function isBenignDomRace(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error || "");
    const name = error instanceof Error ? error.name : "";
    return (
        name === "NotFoundError" ||
        /Failed to execute 'removeChild' on 'Node'/i.test(msg) ||
        /Failed to execute 'insertBefore' on 'Node'/i.test(msg) ||
        /The node to be removed is not a child of this node/i.test(msg) ||
        /The node before which the new node is to be inserted is not a child of this node/i.test(msg)
    );
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        if (isBenignDomRace(error)) {
            return { hasError: false, error: null, errorInfo: null };
        }
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (isBenignDomRace(error)) {
            console.warn("Ignored benign DOM race:", error.message);
            return;
        }
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
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

/** Inline recovery for a single settings section — keeps the rest of the page usable. */
export class SectionErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    if (isBenignDomRace(error)) return { hasError: false };
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (isBenignDomRace(error)) {
      console.warn("Ignored benign DOM race in section:", error.message);
      return;
    }
    console.error("Section error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          <p className="font-semibold">
            {this.props.label || "This section"} hit a display glitch.
          </p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
