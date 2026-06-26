import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, RotateCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class KioskErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('❌ [KioskErrorBoundary] Caught exception:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    private handleBack = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.history.back();
    };

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            const isDev = (import.meta as any).env?.DEV || true; // Show diagnostics in dev or terminal debug mode
            return (
                <div className="flex flex-col items-center justify-center min-h-[500px] h-full w-full bg-slate-50 rounded-3xl border-2 border-red-200 text-slate-800 p-8 text-center select-none overflow-y-auto custom-scrollbar">
                    <div className="bg-red-100 p-6 rounded-full mb-6">
                        <AlertTriangle size={64} className="text-red-600 animate-bounce" />
                    </div>
                    <h1 className="text-3xl font-black mb-2 text-slate-900">Unable to load Department Services.</h1>
                    <p className="text-lg font-bold text-red-600 mb-8 max-w-2xl bg-red-50 p-4 rounded-2xl border border-red-100">
                        Reason: {this.state.error?.message || "An unexpected system exception occurred."}
                    </p>

                    {/* Action Buttons (Phase 12) */}
                    <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                        <button 
                            onClick={this.handleReset}
                            className="flex items-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg shadow-blue-200"
                        >
                            <RefreshCw size={20} />
                            Retry
                        </button>
                        <button 
                            onClick={this.handleBack}
                            className="flex items-center gap-2 px-6 py-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl font-bold text-lg transition-all active:scale-95"
                        >
                            <ArrowLeft size={20} />
                            Back
                        </button>
                        <button 
                            onClick={this.handleReload}
                            className="flex items-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg"
                        >
                            <RotateCw size={20} />
                            Reload Terminal
                        </button>
                    </div>

                    {/* Dev Diagnostics Panel (Phase 8) */}
                    {isDev && this.state.error && (
                        <div className="w-full max-w-4xl text-left bg-slate-900 text-slate-200 p-6 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner border border-slate-700 space-y-3">
                            <div className="border-b border-slate-700 pb-2">
                                <span className="text-red-400 font-bold">Diagnostics (Phase 8):</span>
                            </div>
                            <div>
                                <strong className="text-cyan-400">Message: </strong>
                                <span>{this.state.error.message}</span>
                            </div>
                            <div>
                                <strong className="text-cyan-400">Route / URL: </strong>
                                <span>{typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</span>
                            </div>
                            {this.state.error.stack && (
                                <div>
                                    <strong className="text-cyan-400">Stack Trace:</strong>
                                    <pre className="mt-1 text-slate-400 whitespace-pre-wrap">{this.state.error.stack}</pre>
                                </div>
                            )}
                            {this.state.errorInfo?.componentStack && (
                                <div>
                                    <strong className="text-cyan-400">Component Stack:</strong>
                                    <pre className="mt-1 text-amber-300/80 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children as ReactNode;
    }
}

export default KioskErrorBoundary;