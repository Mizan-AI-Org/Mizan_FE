import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import i18n from '@/i18n';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/** Browser extensions / dnd-kit / Radix portals can throw NotFoundError DOM races - ignore those. */
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

    private errorId: string | null = null;

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (isBenignDomRace(error)) {
            console.warn("Ignored benign DOM race:", error.message);
            return;
        }
        // Full error + component stack only ever goes to the console (dev tools,
        // Sentry breadcrumbs, etc.) - never rendered to the page in production.
        this.errorId = Math.random().toString(36).slice(2, 10);
        console.error(`Uncaught error [${this.errorId}]:`, error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            const isDev = import.meta.env.DEV;
            return (
                <div className="flex items-center justify-center min-h-screen p-4">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-red-600">{i18n.t("error.boundary.title")}</CardTitle>
                            <CardDescription>{i18n.t("error.boundary.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isDev && this.state.error && (
                                <div className="bg-red-50 border border-red-200 p-3 rounded-md text-sm text-red-800">
                                    <p className="font-semibold">{i18n.t("error.boundary.dev_error")}</p>
                                    <p>{this.state.error.toString()}</p>
                                </div>
                            )}
                            {isDev && this.state.errorInfo && (
                                <details className="text-sm text-gray-700">
                                    <summary className="cursor-pointer text-blue-600">{i18n.t("error.boundary.component_stack")}</summary>
                                    <pre className="mt-2 p-2 bg-gray-50 rounded-md overflow-auto max-h-40">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}
                            {!isDev && this.errorId && (
                                <p className="text-xs text-gray-500">
                                    {i18n.t("error.boundary.reference", { id: this.errorId })}
                                </p>
                            )}
                            <Button onClick={() => window.location.reload()} className="w-full">
                                {i18n.t("error.boundary.reload")}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

/** Inline recovery for a single settings section - keeps the rest of the page usable. */
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
            {i18n.t("error.section.display_glitch", {
              label: this.props.label || i18n.t("error.section.this_section"),
            })}
          </p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => this.setState({ hasError: false })}
          >
            {i18n.t("common.try_again")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
