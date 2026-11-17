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
  Mail,
  HardDrive,
  Cloud,
  ArrowRight,
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
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  if (!isOpen) return null;

  const mapFirebaseError = (err: { code?: string; message?: string }): string => {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was closed. You can try again or use Quick Email Sync below.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network connection issue. Please check your internet connection or use Quick Email Sync below.';
    }
    if (code === 'auth/popup-blocked' || code === 'auth/unauthorized-domain' || code === 'auth/operation-not-supported-in-this-environment') {
      setShowEmailFallback(true);
      return 'Google popup is restricted on this preview domain or browser. Use Quick Email Sync right below or continue without login.';
    }
    return err?.message || 'Google sign-in unavailable right now. Use Quick Email Sync below or continue as guest.';
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res.redirected) {
        return;
      }
      if (!res.user) {
        setError('Could not complete Google Sign-In. Try Quick Email Sync below.');
        setShowEmailFallback(true);
        return;
      }
      try {
        const sessionRes = await api.syncFirebaseSession(res.user);
        onSuccess(sessionRes?.user || res.user);
      } catch {
        api.setUserEmail(res.user.email);
        onSuccess(res.user);
      }
      onClose();
    } catch (err: unknown) {
      console.warn('Google sign-in error:', err);
      setError(mapFirebaseError((err || {}) as { code?: string; message?: string }));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickEmailSync = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.syncAccountSession(nameInput.trim() || cleanEmail.split('@')[0], cleanEmail);
      onSuccess(res.user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in with email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[94vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-[#FFE3EE]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors z-10 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Banner */}
        <div className="bg-gradient-to-br from-[#24212A] via-[#3B1226] to-[#550B2E] p-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 mb-2.5 shadow-lg p-1.5 backdrop-blur-xs">
            <img src="/logo.png" alt="Omini PDF Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="mb-1.5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1FA971] text-white">
              100% Optional Login
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">
            Sign In to Omini PDF
          </h2>
          <p className="text-xs text-rose-100/90 mt-1 max-w-xs mx-auto leading-relaxed">
            {redirectReason || 'Signing in is completely optional — sign in to save history to your account, or use all PDF tools right away with Local Storage.'}
          </p>
        </div>

        {/* Main Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D9364F]" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl text-sm font-bold text-[#24212A] bg-white hover:bg-[#FFF4F8] border-2 border-[#FFE3EE] hover:border-[#E83E8C] shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-3 active:scale-[0.99]"
          >
            {loading && !showEmailFallback ? (
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

          {/* Toggle or Always-Available Quick Email Account Sync */}
          <div className="border border-[#FFE3EE] rounded-2xl p-3.5 bg-[#FFF4F8]/70">
            {!showEmailFallback ? (
              <button
                type="button"
                onClick={() => setShowEmailFallback(true)}
                className="w-full text-xs font-bold text-[#C92B72] hover:text-[#E83E8C] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Popup blocked or prefer email? Quick Sign-In with Email</span>
              </button>
            ) : (
              <form onSubmit={handleQuickEmailSync} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#24212A] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#E83E8C]" />
                    <span>Quick Account Sync (No Password)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmailFallback(false)}
                    className="text-[11px] text-[#77717B] hover:text-[#24212A] cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your Name (optional)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#FFE3EE] bg-white focus:outline-hidden focus:border-[#E83E8C]"
                />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#FFE3EE] bg-white focus:outline-hidden focus:border-[#E83E8C]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E83E8C] to-[#C92B72] hover:brightness-105 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>Sign In &amp; Save History to Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

          {/* Explicit History Storage Explanation */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-[#77717B] space-y-2">
            <div className="flex items-start gap-2">
              <Cloud className="w-4 h-4 text-[#E83E8C] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong className="text-[#24212A]">If Logged In:</strong> Your PDF processing history is saved to your{' '}
                <strong className="text-[#24212A]">Account</strong> for synced access.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <HardDrive className="w-4 h-4 text-[#1FA971] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong className="text-[#24212A]">Without Login (Guest):</strong> Your PDF history saves automatically in your{' '}
                <strong className="text-[#24212A]">Browser Local Storage</strong> — no account needed!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#24212A] bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Continue Without Login (Save History Locally)
          </button>
        </div>

        {/* Benefits Footer */}
        <div className="bg-[#FFF4F8] p-3.5 border-t border-[#FFE3EE] flex items-center justify-around text-[11px] text-[#77717B]">
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
            <span>Optional Login</span>
          </div>
        </div>
      </div>
    </div>
  );
};
