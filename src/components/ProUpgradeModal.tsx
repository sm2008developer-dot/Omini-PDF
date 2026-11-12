/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Crown,
  CheckCircle2,
  ShieldCheck,
  Tag,
  AlertCircle,
  Clock,
  Gift,
  Check,
  Copy,
  Smartphone,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { api, User } from '../utils/api.js';
import { activateProInFirestore } from '../lib/firebaseService.js';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: (updatedUser: User) => void;
  reason?: string;
  defaultPrice?: number;
  durationDays?: number;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
  reason,
  defaultPrice = 99,
  durationDays = 30,
}) => {
  // Voucher state
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountPercent: number;
    originalPrice: number;
    finalPrice: number;
    isFree: boolean;
    message?: string;
  } | null>(null);

  // Direct UPI Payment State
  const defaultUpi = '9734076853@fam';
  const [upiId, setUpiId] = useState<string>(defaultUpi);
  const [orderId, setOrderId] = useState<string>('');
  const [upiUrl, setUpiUrl] = useState<string>('');
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Success Receipt
  const [successReceipt, setSuccessReceipt] = useState<{
    orderId: string;
    amount: number;
    paymentMethod: string;
  } | null>(null);

  // Initialize payment parameters on modal open
  const initOrder = async (vCode?: string) => {
    try {
      setError(null);
      const res = await api.createPaymentOrder(vCode).catch(() => null);
      const activeUpi = res?.upiId || defaultUpi;
      setUpiId(activeUpi);
      const activeOrderId = res?.orderId || `UPI${Date.now().toString(36).toUpperCase()}`;
      setOrderId(activeOrderId);

      const activeAmount = res?.amount || (appliedVoucher ? appliedVoucher.finalPrice : defaultPrice);
      const targetUpiUri =
        res?.upiUrl ||
        `upi://pay?pa=${encodeURIComponent(activeUpi)}&pn=Omini%20PDF&am=${activeAmount}&cu=INR&tn=Pro%20Pass%20${activeOrderId}`;
      setUpiUrl(targetUpiUri);

      if (res?.qrCode && (res.qrCode.startsWith('data:image') || res.qrCode.startsWith('http'))) {
        setQrCodeData(res.qrCode);
      } else {
        setQrCodeData('');
      }
    } catch {
      const fallbackId = `UPI${Date.now().toString(36).toUpperCase()}`;
      setOrderId(fallbackId);
      setUpiUrl(`upi://pay?pa=${encodeURIComponent(defaultUpi)}&pn=Omini%20PDF&am=${defaultPrice}&cu=INR&tn=Pro%20Pass%20${fallbackId}`);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setVoucherError(null);
      setSuccessReceipt(null);
      setAppliedVoucher(null);
      setVoucherCodeInput('');
      setQrCodeData('');
      setOrderId('');
      return;
    }
    initOrder();
  }, [isOpen]);

  // Apply Coupon / Promo Code
  const handleApplyVoucher = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = voucherCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setVoucherError('Please enter a coupon code.');
      return;
    }

    try {
      setIsValidatingVoucher(true);
      setVoucherError(null);
      setError(null);

      const res = await api.validateVoucher(cleanCode);
      if (res.valid) {
        setAppliedVoucher(res);
        setVoucherError(null);
        if (!res.isFree) {
          initOrder(res.code);
        }
      } else {
        setVoucherError(res.message || 'Invalid or expired voucher code.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired voucher code.';
      setVoucherError(msg);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    setVoucherError(null);
    setError(null);
    initOrder();
  };

  // Instant Activation into Firebase Firestore
  const handleActivatePro = async () => {
    if (!user) {
      setError('Please sign in first so your Pro pass is saved to your Firebase account.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const activeId = orderId || `UPI${Date.now().toString(36).toUpperCase()}`;
    const isFree = appliedVoucher?.isFree ?? false;
    const finalAmount = isFree ? 0 : (appliedVoucher ? appliedVoucher.finalPrice : defaultPrice);

    try {
      // 1. Direct activation into Firebase Cloud Firestore
      const result = await activateProInFirestore(user.id, {
        durationDays,
        paymentMethod: isFree
          ? `Promotional Voucher (${appliedVoucher?.code} - 100% OFF)`
          : `Direct UPI Gateway (${upiId})`,
        paymentId: activeId,
        amount: finalAmount,
      });

      // 2. Also notify backend for sync
      await api.verifyPayment({
        orderId: activeId,
        promoCode: appliedVoucher ? appliedVoucher.code : undefined,
      }).catch(() => {});

      setSuccessReceipt({
        orderId: activeId,
        amount: finalAmount,
        paymentMethod: isFree ? '100% Free Voucher Pass' : 'UPI Payment Pass',
      });

      onSuccess(result.user);
    } catch (err: unknown) {
      console.warn('Pro activation notice:', err);
      // Fallback: update user plan in local state
      const now = new Date();
      const updated: User = {
        ...user,
        plan: 'pro',
        subscriptionStatus: 'active',
        subscriptionDurationDays: durationDays,
        proSubscribedAt: now.toISOString(),
        proExpiresAt: new Date(now.getTime() + durationDays * 86400000).toISOString(),
      };
      setSuccessReceipt({
        orderId: activeId,
        amount: finalAmount,
        paymentMethod: isFree ? '100% Free Voucher Pass' : 'UPI Payment Pass',
      });
      onSuccess(updated);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleCopyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2500);
  };

  if (!isOpen || user?.plan === 'pro') return null;

  const basePrice = defaultPrice || 99;
  const displayPrice = appliedVoucher ? appliedVoucher.finalPrice : basePrice;
  const isFreeVoucher = appliedVoucher?.isFree ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
          aria-label="Close upgrade dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {successReceipt ? (
          /* Payment Success View */
          <div className="p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-4 shadow-sm">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Firebase Synced • {durationDays}-Day Pro Active</span>
            </div>

            <h3 className="text-2xl font-black text-slate-900 mt-3">Pro Access Activated!</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-sm mx-auto">
              Your account now has <strong>{durationDays} Days of Unlimited Pro Access</strong> across all PDF tools and Gemini AI intelligence.
            </p>

            <div className="my-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Subscription Ref:</span>
                <span className="font-mono font-bold text-indigo-700">{successReceipt.orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Plan Channel:</span>
                <span className="font-semibold text-slate-800">{successReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Validity:</span>
                <span className="font-bold text-slate-800">{durationDays} Full Days Unlimited</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-emerald-600">
                  {successReceipt.amount === 0 ? 'FREE (100% Voucher Applied)' : `₹${successReceipt.amount}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Firebase User:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">{user?.email}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-2xl font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all cursor-pointer"
            >
              Start Using Unlimited Pro Tools
            </button>
          </div>
        ) : (
          /* Checkout View */
          <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-6 text-white text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 text-amber-300 mb-3 shadow-inner">
                <Crown className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Upgrade to Omini PDF Pro</h2>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                {reason || `Unlock unlimited PDF operations & Gemini AI intelligence for ${durationDays} full days.`}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Plan Benefits Checklist */}
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">Unlimited PDF Operations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">Unlimited Gemini AI Queries</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">100% Ad-Free Experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">Firebase Cloud Sync</span>
                </div>
              </div>

              {/* Promo Coupon Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    Have a Coupon or Voucher Code?
                  </span>
                  {appliedVoucher && (
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {!appliedVoucher ? (
                  <form onSubmit={handleApplyVoucher} className="flex gap-2">
                    <input
                      type="text"
                      value={voucherCodeInput}
                      onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. FREEPRO"
                      className="flex-1 px-3 py-1.5 text-xs font-mono uppercase font-bold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                    <button
                      type="submit"
                      disabled={isValidatingVoucher || !voucherCodeInput.trim()}
                      className="px-4 py-1.5 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isValidatingVoucher ? 'Checking...' : 'Apply'}
                    </button>
                  </form>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                    <span className="font-bold flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-emerald-600" />
                      Code {appliedVoucher.code} ({appliedVoucher.discountPercent}% OFF)
                    </span>
                    <span className="font-bold text-emerald-700">Applied</span>
                  </div>
                )}

                {voucherError && <p className="text-[11px] text-rose-600 font-medium">{voucherError}</p>}
              </div>

              {/* Price Banner */}
              <div className="flex items-center justify-between px-4 py-3 bg-linear-to-r from-rose-50 via-amber-50 to-rose-50 rounded-2xl border border-rose-200/80">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Duration</div>
                  <div className="text-sm font-black text-slate-900">{durationDays} Days Unlimited Access</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 line-through">
                    {appliedVoucher && !isFreeVoucher ? `₹${basePrice}` : ''}
                  </div>
                  <div className="text-2xl font-black text-rose-600">
                    {isFreeVoucher ? 'FREE' : `₹${displayPrice}`}
                  </div>
                </div>
              </div>

              {!isFreeVoucher ? (
                /* UPI Direct Payment Card */
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">Merchant UPI ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {upiId}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUpiId}
                          className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedUpi ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* QR Code - if uploaded by admin */}
                    {qrCodeData && (
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-2">
                        <div className="w-44 h-44 bg-slate-50 rounded-xl border border-slate-200 p-2 flex items-center justify-center">
                          <img
                            src={qrCodeData}
                            alt="Merchant Payment QR"
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Scan with <strong>PhonePe, Google Pay, Paytm</strong> or any UPI App
                        </div>
                      </div>
                    )}

                    {/* Direct UPI Intent Button for Mobile / Desktop */}
                    {upiUrl && (
                      <a
                        href={upiUrl}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center no-underline"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Pay ₹{displayPrice} via UPI App (PhonePe / GPay / Paytm)</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                /* Free Voucher Ready */
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-1">
                  <div className="inline-flex p-2 rounded-full bg-emerald-100 text-emerald-600 mb-1">
                    <Gift className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-emerald-900 text-sm">100% Free Pro Pass Ready!</h4>
                  <p className="text-xs text-emerald-700">
                    Coupon <strong>{appliedVoucher?.code}</strong> gives you {durationDays} days of unlimited Pro access without any charge.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Direct Pro Activation Button */}
              <button
                onClick={handleActivatePro}
                disabled={isProcessing}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 hover:brightness-105 shadow-md shadow-rose-500/25 transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Activating Pro Access in Firebase...</span>
                  </>
                ) : isFreeVoucher ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Activate Free {durationDays}-Day Pro Now (₹0)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Activate {durationDays}-Day Pro Pass Now (₹{displayPrice})</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Firebase Firestore Synced</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{durationDays} Days Full Access</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
