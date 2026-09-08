import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  ArrowRight,
  X
} from 'lucide-react';

export const CheckoutSagaModal = ({ event, seat, quote, isOpen, onClose, onBookingSuccess }) => {
  const { user, terminal } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('888');

  // Saga Orchestration States
  const [sagaState, setSagaState] = useState('IDLE'); // 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
  const [activeStep, setActiveStep] = useState(0);
  const [sagaDetails, setSagaDetails] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 min hold

  useEffect(() => {
    if (!isOpen) return;
    setSagaState('IDLE');
    setActiveStep(0);
    setErrorMessage(null);
    setSecondsRemaining(300);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMessage('Seat reservation hold expired. Please re-select your seat.');
          setSagaState('FAILED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !seat || !quote) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const stepsList = [
    { title: 'Distributed Concurrency Lock', desc: 'Verify seat hold & prevent race conditions' },
    { title: 'Dynamic Price Guarantee', desc: 'Freeze calculated surge & early-bird rates' },
    { title: 'Payment Gateway Authorization', desc: 'Protected by microservice Circuit Breaker' },
    { title: 'Issue Ticket & Broadcast', desc: 'Emit BookingConfirmed event & create digital ticket' }
  ];

  const handleExecuteCheckout = async () => {
    setSagaState('PROCESSING');
    setErrorMessage(null);
    setActiveStep(1);

    try {
      // Step 1: Distributed Lock
      await new Promise((r) => setTimeout(r, 600));
      setActiveStep(2);

      // Step 2: Dynamic Price Lock
      await new Promise((r) => setTimeout(r, 600));
      setActiveStep(3);

      // Step 3: Payment Processing & Finalize
      const res = await api.post('/bookings/checkout', {
        eventId: event.id,
        seatId: seat.id,
        paymentMethod,
        terminalLabel: terminal.terminalLabel
      });

      setActiveStep(4);
      await new Promise((r) => setTimeout(r, 600));

      setSagaState('SUCCESS');
      setSagaDetails(res.data.booking.sagaSteps || []);
      
      // Notify parent after brief celebration
      setTimeout(() => {
        onBookingSuccess(res.data.booking);
      }, 1200);

    } catch (err) {
      console.error('Saga execution failed:', err);
      setSagaState('FAILED');
      const errText = err.response?.data?.error || err.message;
      setErrorMessage(errText);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        {sagaState !== 'PROCESSING' && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-emerald-600 to-cyan-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Saga Checkout Coordinator</h2>
              <p className="text-xs text-slate-400 font-mono">
                Booking for <span className="text-emerald-400">{user?.email}</span>
              </p>
            </div>
          </div>

          {/* Reservation Timer */}
          <div className={`px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-2 ${
            secondsRemaining < 60
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
              : 'bg-slate-800 border-slate-700 text-emerald-400'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>Hold TTL: {formatTime(secondsRemaining)}</span>
          </div>
        </div>

        {/* Seat & Price Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">{event.title}</div>
            <div className="text-lg font-black text-white">
              Seat {seat.id} <span className="text-xs font-mono font-medium text-slate-400">({seat.tierId.toUpperCase()})</span>
            </div>
            <div className="text-xs text-cyan-400 font-mono mt-0.5">
              Terminal: {terminal.terminalLabel}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400 font-mono">Total Due</div>
            <div className="text-2xl font-black text-emerald-400">
              ${quote.finalPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {/* SAGA Transaction Workflow Step-by-Step Visualization */}
        <div className="mb-6 space-y-2.5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Saga Transaction Pipeline:</span>
            {sagaState === 'PROCESSING' && (
              <span className="text-[11px] font-mono text-cyan-400 animate-pulse">
                Executing Step {activeStep} of 4...
              </span>
            )}
          </div>

          <div className="space-y-2">
            {stepsList.map((step, idx) => {
              const stepNumber = idx + 1;
              const isDone = activeStep > stepNumber || sagaState === 'SUCCESS';
              const isCurrent = activeStep === stepNumber && sagaState === 'PROCESSING';
              const isFailedAtThisStep = sagaState === 'FAILED' && activeStep === stepNumber;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs font-mono transition-all duration-300 flex items-center justify-between ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                      : isCurrent
                      ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-md shadow-cyan-500/20 scale-[1.01]'
                      : isFailedAtThisStep
                      ? 'bg-rose-950/40 border-rose-500 text-rose-300'
                      : 'bg-slate-900/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-cyan-500 text-white animate-spin'
                        : isFailedAtThisStep
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isFailedAtThisStep ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        stepNumber
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{step.title}</div>
                      <div className="text-[11px] text-slate-400 font-sans">{step.desc}</div>
                    </div>
                  </div>

                  <div>
                    {isDone && <span className="text-emerald-400 text-[11px] font-bold">COMPLETED</span>}
                    {isCurrent && <span className="text-cyan-400 text-[11px] font-bold animate-pulse">RUNNING...</span>}
                    {isFailedAtThisStep && <span className="text-rose-400 text-[11px] font-bold">FAILED</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Failure & Compensating Rollback Feedback */}
        {sagaState === 'FAILED' && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs space-y-2 animate-shake">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Saga Failed: Compensating Rollback Executed</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {errorMessage || 'Transaction could not be completed.'}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 font-mono">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Compensating action: Temporary distributed lock released. Seat is safely available again.</span>
            </div>
          </div>
        )}

        {/* Mock Payment Method Inputs (Visible when IDLE or FAILED) */}
        {sagaState !== 'SUCCESS' && sagaState !== 'PROCESSING' && (
          <div className="space-y-4 mb-6 pt-4 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Payment Details (Simulated Test Card)
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  className="px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="CVV"
                  className="px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              onClick={handleExecuteCheckout}
              disabled={secondsRemaining <= 0}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Confirm & Authorize Payment (${quote.finalPrice.toFixed(2)})</span>
            </button>
          </div>
        )}

        {sagaState === 'SUCCESS' && (
          <div className="p-6 text-center space-y-3 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl animate-fadeIn">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-white">Payment Authorized & Ticket Issued!</h3>
            <p className="text-xs text-slate-300">
              Saga completed across all microservices. Generating digital pass...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
