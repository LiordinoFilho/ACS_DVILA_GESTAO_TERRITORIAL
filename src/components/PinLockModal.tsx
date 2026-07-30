import React, { useState } from 'react';
import { Lock, Shield, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  onUnlockSuccess: () => void;
  correctPin: string;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onUnlockSuccess,
  correctPin,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (enteredPin.length < 4) {
      const newPin = enteredPin + num;
      setEnteredPin(newPin);
      setError('');

      if (newPin.length === 4) {
        if (newPin === correctPin) {
          setEnteredPin('');
          onUnlockSuccess();
        } else {
          setError('PIN Incorreto. Tente novamente.');
          setEnteredPin('');
        }
      }
    }
  };

  const handleDelete = () => {
    setEnteredPin(prev => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-xs w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center text-white flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mb-4">
          <KeyRound className="h-7 w-7 text-indigo-400" />
        </div>

        <h3 className="text-lg font-black mb-1">Aplicativo Protegido</h3>
        <p className="text-xs text-slate-400 mb-6">Digite seu PIN de 4 dígitos para acessar o ACS D'Vila</p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  isFilled
                    ? 'bg-indigo-500 border-indigo-400 scale-110 shadow-sm'
                    : 'bg-slate-800 border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="mb-4 text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[220px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-lg font-black text-white border border-slate-700/60 transition active:scale-95 flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}

          <div />

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-lg font-black text-white border border-slate-700/60 transition active:scale-95 flex items-center justify-center cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700/40 transition active:scale-95 flex items-center justify-center cursor-pointer"
          >
            Apagar
          </button>
        </div>
      </div>
    </div>
  );
};
