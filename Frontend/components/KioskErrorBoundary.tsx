import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
}

class KioskErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Kiosk Error:', error, errorInfo);
    }

    private handleReset = () => {
        // Aggressively clear state on crash to prevent data leak
        const lang = localStorage.getItem('selectedLanguage');
        const voice = localStorage.getItem('voice_enabled');
        
        localStorage.clear();
        sessionStorage.clear();

        if (lang) localStorage.setItem('selectedLanguage', lang);
        if (voice) localStorage.setItem('voice_enabled', voice);

        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 rounded-3xl border-2 border-red-200 text-slate-800 p-8 text-center select-none">
                    <div className="bg-red-100 p-6 rounded-full mb-6">
                        <AlertTriangle size={64} className="text-red-600 animate-pulse" />
                    </div>
                    <h1 className="text-3xl font-black mb-4 text-slate-900">Terminal Recovering</h1>
                    <p className="text-xl text-slate-600 mb-8 max-w-xl">
                        The system encountered an unexpected error. For your security, all active session data has been cleared.
                    </p>
                    <button 
                        onClick={this.handleReset}
                        className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xl transition-all active:scale-95 shadow-lg shadow-blue-200"
                    >
                        <RefreshCw size={24} />
                        Restart Session
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default KioskErrorBoundary;