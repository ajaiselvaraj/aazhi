import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SecureSessionProps {
  children: React.ReactNode;
  isLockedDown: boolean;
  isLoading: boolean;
}

export const SecureSessionHUD: React.FC<SecureSessionProps> = ({ 
  children, 
  isLockedDown, 
  isLoading 
}) => {
  return (
    <div className="relative min-h-screen bg-gray-900 text-slate-100 overflow-hidden">
      
      {/* 1. Background System Lockdown (Chromatic Aberration Effect) */}
      <AnimatePresence>
        {isLockedDown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1, 
              // Simulating Chromatic Aberration using multi-layered box shadows
              textShadow: "2px 0 red, -2px 0 blue",
              filter: "contrast(120%) saturate(150%) hue-rotate(-10deg)" 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 pointer-events-none bg-red-900/10 mix-blend-color-burn"
          />
        )}
      </AnimatePresence>

      {/* 2. Soft Pulsing 'Secure Session' HUD Indicator */}
      <div className="absolute top-4 right-6 z-40 flex items-center space-x-2">
        <motion.div
          animate={{
            boxShadow: ["0 0 0 0 rgba(16, 185, 129, 0.4)", "0 0 0 8px rgba(16, 185, 129, 0)"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-3 h-3 bg-emerald-500 rounded-full"
        />
        <span className="text-xs font-mono tracking-widest text-emerald-400">
          SECURE_SESSION: ACTIVE
        </span>
      </div>

      {/* 3. Skeleton Loader or Main Content */}
      <main className="p-10 relative z-10">
        {isLoading ? <IntegritySkeleton /> : children}
      </main>

      {/* 4. Security Lockdown Modal */}
      <AnimatePresence>
        {isLockedDown && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <div className="bg-slate-900 border border-red-500/50 p-8 rounded-lg shadow-[0_0_40px_rgba(220,38,38,0.2)] max-w-md w-full text-center">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold font-mono text-red-400 mb-2">SYSTEM LOCKDOWN</h2>
              <p className="text-sm text-slate-400 mb-6 font-mono">
                Suspicious action intercepted. Security verification required to restore session integrity.
              </p>
              <button className="w-full py-2 bg-red-600 hover:bg-red-500 transition-colors rounded text-white font-semibold tracking-wide">
                Verify Identity
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const IntegritySkeleton = () => (
  <div className="w-full max-w-4xl mx-auto space-y-6">
    <div className="flex items-center space-x-4 mb-8">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
      <span className="text-sm font-mono text-emerald-500 uppercase tracking-widest animate-pulse">Verifying Integrity & Decoding Payload...</span>
    </div>
    {[...Array(3)].map((_, i) => (
      <motion.div key={i} initial={{ opacity: 0.5 }} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }} className="w-full h-24 bg-slate-800 rounded border border-slate-700/50" />
    ))}
  </div>
);