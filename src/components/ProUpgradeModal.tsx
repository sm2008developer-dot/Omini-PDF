/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Crown,
  CheckCircle2,
  Zap,
  ShieldCheck,
  CreditCard,
  Lock,
  Tag,
  ExternalLink,
  AlertCircle,
  Clock,
  RefreshCw,
  Gift,
  Check,
  Copy,
} from 'lucide-react';
import { api, User } from '../utils/api.js';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: (updatedUser: User) => void;
  reason?: string;
}

export const ZAPPAY_PANEL_URL = 'https://panel.zappay.shop/pay.html?id=f66a2d52';

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
  reason,
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

  // ZapPay Order & Payment State
  const [zapOrderId, setZapOrderId] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string>(ZAPPAY_PANEL_URL);
  const [manualOrderId, setManualOrderId] = useState<string>('');
  const [hasClickedGateway, setHasClickedGateway] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<'pending' | 'checking' | 'failed' | 'success' | null>(null);
  const [isPendingRetry, setIsPendingRetry] = useState(false);

  // Success Receipt
  const [successReceipt, setSuccessReceipt] = useState<{
    orderId: string;
    paymentId: string;
    amount: number;
    paymentMethod: string;
  } | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or reload order
  const initOrder = async (vCode?: string) => {
    try {
      setIsLoadingOrder(true);
      setError(null);
      const orderData = await api.createPaymentOrder(vCode);
      if (orderData.zapOrderId) {
        setZapOrderId(orderData.zapOrderId);
        setManualOrderId(orderData.zapOrderId);
      }
      if (orderData.paymentUrl) {
        setPaymentUrl(orderData.paymentUrl);
      }
    } catch (err) {
      console.warn('Failed to pre-generate ZapPay order:', err);
    } finally {
      setIsLoadingOrder(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setLiveStatus(null);
      setError(null);
      setVoucherError(null);
      setSuccessReceipt(null);
      setHasClickedGateway(false);
      setAppliedVoucher(null);
      setVoucherCodeInput('');
      setIsPendingRetry(false);
      return;
    }

    initOrder();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen]);

  // Polling for live payment confirmation when user clicked gateway
  useEffect(() => {
    const candidateId = manualOrderId.trim() || zapOrderId;
    if (!isOpen || !hasClickedGateway || !candidateId || candidateId.startsWith('ORD_') || appliedVoucher?.isFree) {
      return;
    }

    setLiveStatus('checking');

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await api.checkPaymentStatus(candidateId);
        if (res.success && res.status === 'success') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setLiveStatus('success');
          // Auto-trigger verified activation
          handleFinalVerification(candidateId);
        } else if (res.status === 'failed' || res.status === 'timeout') {
          setLiveStatus('failed');
          setError('Payment was cancelled or failed on ZapPay. Please click the button to retry.');
        }
      } catch {
        // Keep waiting silently
      }
    }, 3500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [hasClickedGateway, manualOrderId, zapOrderId, isOpen, appliedVoucher]);

  // Apply Coupon / Voucher Code
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

        // If partial discount voucher, update the payment link amount
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

  // Check ZapPay status on demand
  const handleQuickStatusCheck = async () => {
    const candidate = manualOrderId.trim() || zapOrderId;
    if (!candidate) {
      setError('Please enter or initiate a ZapPay Order ID first.');
      return;
    }
    try {
      setLiveStatus('checking');
      setError(null);
      const res = await api.checkPaymentStatus(candidate);
      if (res.status === 'success') {
        setLiveStatus('success');
        handleFinalVerification(candidate);
      } else if (res.status === 'pending') {
        setLiveStatus('pending');
        setError('Payment is still PENDING on ZapPay. If you just approved the UPI request, please wait a few seconds and check again.');
      } else {
        setLiveStatus('failed');
        setError(`ZapPay reported order status: "${res.status}". Please complete payment on ZapPay.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not query ZapPay status';
      setError(msg);
      setLiveStatus('failed');
    }
  };

  // Final verification & activation
  const handleFinalVerification = async (targetIdToVerify?: string) => {
    if (!user) {
      setError('Please log in first to activate your Pro subscription.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setIsPendingRetry(false);

    const activeId = targetIdToVerify || manualOrderId.trim() || zapOrderId;

    try {
      const verifyRes = await api.verifyPayment({
        zapOrderId: appliedVoucher?.isFree ? undefined : activeId,
        utrNumber: manualOrderId.trim() || undefined,
        promoCode: appliedVoucher ? appliedVoucher.code : undefined,
      });

      setSuccessReceipt({
        orderId: verifyRes.transaction.paymentId,
        paymentId: verifyRes.transaction.paymentId,
        amount: verifyRes.transaction.amount,
        paymentMethod: verifyRes.transaction.paymentMethod,
      });

      onSuccess(verifyRes.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment verification failed.';
      setError(msg);
      setLiveStatus('failed');
      if (msg.toLowerCase().includes('pending')) {
        setIsPendingRetry(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const displayPrice = appliedVoucher ? appliedVoucher.finalPrice : 99;
  const isFreeVoucher = appliedVoucher?.isFree ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100">
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

            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              Verified • 30-Day Pro Activated
            </span>

            <h3 className="text-2xl font-black text-slate-900 mt-3">Subscription Activated!</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-sm mx-auto">
              Your account now has <strong>30 Days of Unlimited Pro Access</strong> across all PDF tools and Gemini AI intelligence.
            </p>

            <div className="my-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Reference:</span>
                <span className="font-mono font-bold text-indigo-700">{successReceipt.paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-semibold text-slate-800">{successReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pass Validity:</span>
                <span className="font-bold text-slate-800">30 Full Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-emerald-600">
                  {successReceipt.amount === 0 ? 'FREE (100% Voucher Applied)' : `₹${successReceipt.amount}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">{user?.email}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md cursor-pointer"
            >
              Start Using Pro Tools
            </button>
          </div>
        ) : (
          /* Checkout View */
          <div>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider mb-2.5 shadow-sm">
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                <span>30-Day Pro Subscription Pass</span>
              </div>

              <h2 className="text-2xl font-black tracking-tight">Upgrade to Omini PDF Pro</h2>

              <div className="mt-2 flex items-baseline justify-center gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-white">
                  ₹{displayPrice}
                </span>
                <span className="text-slate-400 text-sm line-through">₹499</span>
                <span className="text-xs bg-indigo-900/60 border border-indigo-400/40 text-indigo-200 px-2.5 py-0.5 rounded-full font-semibold">
                  / 30 Days Full Access
                </span>
              </div>

              {appliedVoucher && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                  <Gift className="w-3.5 h-3.5" />
                  <span>Coupon {appliedVoucher.code} Active ({appliedVoucher.discountPercent}% OFF)</span>
                </div>
              )}

              {user && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Account: <strong className="text-white">{user.email}</strong></span>
                </div>
              )}

              {reason && (
                <p className="mt-2 text-xs bg-rose-500/20 text-rose-200 rounded-lg py-1 px-3 inline-block font-medium">
                  {reason}
                </p>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* Feature Checklist */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Unlimited</strong> PDF Operations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Unlimited</strong> AI Queries</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Priority Gemini 3.8 Flash</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>ZIP Downloads &amp; Metadata</span>
                </div>
              </div>

              {/* Coupon Code Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Have a Coupon / Promo Code?</span>
                  </span>
                  {appliedVoucher && (
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove Coupon
                    </button>
                  )}
                </div>

                {!appliedVoucher ? (
                  <form onSubmit={handleApplyVoucher} className="flex gap-2">
                    <input
                      type="text"
                      value={voucherCodeInput}
                      onChange={(e) => {
                        setVoucherCodeInput(e.target.value);
                        setVoucherError(null);
                      }}
                      placeholder="Enter code (e.g. OMINI99 or PROPASS50)"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase font-mono bg-white"
                    />
                    <button
                      type="submit"
                      disabled={isValidatingVoucher || !voucherCodeInput.trim()}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isValidatingVoucher ? 'Checking...' : 'Apply'}
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                      <div>
                        <span className="font-bold">{appliedVoucher.code}</span> applied: {appliedVoucher.discountPercent}% OFF!
                      </div>
                    </div>
                    <span className="font-extrabold text-emerald-700">
                      {appliedVoucher.isFree ? 'FREE' : `Pay ₹${appliedVoucher.finalPrice}`}
                    </span>
                  </div>
                )}

                {voucherError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{voucherError}</span>
                  </p>
                )}
              </div>

              {/* ZapPay Real Gateway Section (Only if not 100% Free) */}
              {!isFreeVoucher ? (
                <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 p-5 rounded-2xl border-2 border-indigo-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                        ⚡
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Official ZapPay Gateway</h4>
                        <p className="text-[11px] text-slate-500">UPI, PhonePe, GPay, Paytm &amp; QR</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      ₹{displayPrice} Instant UPI
                    </span>
                  </div>

                  {/* Step 1: Open Payment Link */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                        <span>Pay ₹{displayPrice} on ZapPay:</span>
                      </span>
                      {zapOrderId && (
                        <span className="text-[11px] font-mono text-slate-500 truncate max-w-[170px]" title={zapOrderId}>
                          Order: {zapOrderId}
                        </span>
                      )}
                    </div>

                    <a
                      href={paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        setHasClickedGateway(true);
                        setError(null);
                      }}
                      className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:brightness-105 shadow-md shadow-indigo-600/25 transition-all cursor-pointer text-center group"
                    >
                      <span>Click to Pay ₹{displayPrice} on ZapPay</span>
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </a>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
                      <span>UPI QR, PhonePe, GooglePay, Paytm</span>
                      <a
                        href={ZAPPAY_PANEL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Direct Panel Link
                      </a>
                    </div>
                  </div>

                  {/* Step 2: Verification Input & Check */}
                  <div className="space-y-2 pt-2 border-t border-indigo-100">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                        <span>ZapPay Order ID:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {hasClickedGateway && (
                          <span className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Auto-checking
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleQuickStatusCheck}
                          className="text-[11px] text-indigo-700 font-semibold hover:underline cursor-pointer"
                        >
                          Check Status
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={manualOrderId}
                        onChange={(e) => {
                          setManualOrderId(e.target.value);
                          setError(null);
                        }}
                        placeholder="Paste ZapPay Order ID (ZP...) or confirmation URL"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono bg-white pr-16"
                      />
                      {manualOrderId && (
                        <button
                          type="button"
                          onClick={() => setManualOrderId('')}
                          className="absolute right-2.5 top-2 text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 leading-normal">
                      Order ID is automatically filled. If you paid on the direct link or on your phone, paste the Order ID (starts with ZP) or confirmation link here.
                    </p>
                  </div>
                </div>
              ) : (
                /* 100% Free Voucher Banner */
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-1">
                  <div className="inline-flex p-2 rounded-full bg-emerald-100 text-emerald-600 mb-1">
                    <Gift className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-emerald-900 text-sm">100% Free Pro Pass Ready!</h4>
                  <p className="text-xs text-emerald-700">
                    Voucher <strong>{appliedVoucher?.code}</strong> grants 30 days of unlimited Pro access without any payment.
                  </p>
                </div>
              )}

              {/* Error Box */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold">Verification Notice: </span>
                    <span>{error}</span>
                    {isPendingRetry && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => handleFinalVerification()}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Re-check ZapPay Confirmation</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => handleFinalVerification()}
                disabled={isProcessing || isLoadingOrder}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 hover:brightness-105 shadow-md shadow-rose-500/25 transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying with Server...</span>
                  </>
                ) : isFreeVoucher ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Activate Free 30-Day Pro Now (₹0)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify &amp; Activate 30-Day Pro (₹{displayPrice})</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Live ZapPay Verification
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  30 Days Full Access
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
