/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { User, api } from '../utils/api.js';
import { loginWithGoogle } from '../lib/firebaseService.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'login' | 'register';
  redirectReason?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  redirectReason,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const mapFirebaseError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in was cancelled. Please try again.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network connection issue. Please check your internet connection.';
    }
    if (code === 'auth/popup-blocked') {
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    }
    return err?.message || 'Authentication error. Please try again with Google.';
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginWithGoogle();
      try {
        const sessionRes = await api.syncFirebaseSession(res.user);
        if (sessionRes?.user) {
          onSuccess(sessionRes.user);
        } else {
          onSuccess(res.user);
        }
      } catch (syncErr) {
        console.warn('Backend session sync notice:', syncErr);
        api.setUserEmail(res.user.email);
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      setError(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden bg-white rounded-3xl shadow-2xl border border-[#FFE3EE]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Banner */}
        <div className="bg-gradient-to-br from-[#24212A] via-[#3B1226] to-[#550B2E] p-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 mb-3 shadow-lg p-1.5 backdrop-blur-xs">
            <img src="/logo.png" alt="Omini PDF Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">
            Sign In to Omini PDF
          </h2>
          <p className="text-xs text-rose-100/90 mt-1 max-w-xs mx-auto leading-relaxed">
            {redirectReason || 'Save your PDF document processing history across devices with 1-click Google Sign-In.'}
          </p>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D9364F]" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-[#24212A] bg-white hover:bg-[#FFF4F8] border-2 border-[#FFE3EE] hover:border-[#E83E8C] shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-3 active:scale-[0.99]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#E83E8C] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="p-3.5 rounded-2xl bg-[#FFF4F8] border border-[#FFE3EE] text-xs text-[#77717B] space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#24212A]">
                <Zap className="w-4 h-4 text-[#E83E8C]" />
                <span>Fast &amp; Passwordless</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                All 11 PDF tools are 100% free and unlimited. Sign in optionally to sync your document processing history.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Footer */}
        <div className="bg-[#FFF4F8] p-4 border-t border-[#FFE3EE] flex items-center justify-around text-[11px] text-[#77717B]">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1FA971]" />
            <span>100% Free</span>
          </div>
          <div className="flex items-center gap-1">
            <InfinityIcon className="w-3.5 h-3.5 text-[#E83E8C]" />
            <span>Unlimited PDF Ops</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C92B72]" />
            <span>Saved History</span>
          </div>
        </div>
      </div>
    </div>
  );
};
