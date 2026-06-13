import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Delete } from 'lucide-react';

export default function CalculatorWidget({ isOpen, onClose, lang = 'th' }) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [prevValue, setPrevValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const inputDigit = (digit) => {
    if (waitingForNewValue) {
      setDisplay(String(digit));
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDot = () => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
    setPrevValue(null);
    setOperator(null);
    setWaitingForNewValue(false);
  };

  const deleteLast = () => {
    if (waitingForNewValue) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  };

  const performOperation = (nextOperator) => {
    const inputValue = parseFloat(display);

    if (prevValue == null) {
      setPrevValue(inputValue);
      setEquation(`${inputValue} ${nextOperator}`);
    } else if (operator) {
      const currentValue = prevValue || 0;
      let newValue = 0;

      if (operator === '+') newValue = currentValue + inputValue;
      else if (operator === '-') newValue = currentValue - inputValue;
      else if (operator === '*') newValue = currentValue * inputValue;
      else if (operator === '/') newValue = currentValue / inputValue;

      setPrevValue(newValue);
      setDisplay(String(Number(newValue.toFixed(8)))); // handle precision
      
      if (nextOperator === '=') {
        setEquation('');
        setOperator(null);
        setWaitingForNewValue(true);
        return;
      } else {
        setEquation(`${newValue} ${nextOperator}`);
      }
    }

    setWaitingForNewValue(true);
    setOperator(nextOperator);
  };

  const handleOperatorClick = (op) => {
    performOperation(op);
  };

  const Button = ({ children, onClick, variant = 'default', className = '' }) => {
    let baseClass = "text-xl font-bold h-16 rounded-[20px] transition-all active:scale-95 flex items-center justify-center ";
    
    if (variant === 'default') {
      baseClass += "bg-white/10 hover:bg-white/20 text-main shadow-sm border border-white/5";
    } else if (variant === 'operator') {
      baseClass += "bg-primary-500/20 hover:bg-primary-500/30 text-primary-500 shadow-sm border border-primary-500/10";
    } else if (variant === 'accent') {
      baseClass += "bg-primary-500 hover:bg-primary-600 text-white shadow-md";
    } else if (variant === 'clear') {
      baseClass += "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/10";
    }

    return (
      <button onClick={onClick} className={`${baseClass} ${className}`}>
        {children}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-[320px] rounded-[32px] overflow-hidden shadow-2xl relative"
            style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/5 dark:bg-white/5">
              <span className="font-bold text-main/80 flex items-center gap-2">
                🧮 {lang === 'en' ? 'Calculator' : 'เครื่องคิดเลข'}
              </span>
              <button 
                onClick={onClose}
                className="p-1.5 bg-black/10 dark:bg-white/10 rounded-full hover:bg-black/20 dark:hover:bg-white/20 transition-colors text-main/70"
              >
                <X size={18} />
              </button>
            </div>

            {/* Display */}
            <div className="p-6 bg-black/5 dark:bg-white/5">
              <div className="text-right text-main/50 h-6 text-sm font-medium tracking-wider">
                {equation}
              </div>
              <div className="text-right text-4xl font-black text-main overflow-hidden text-ellipsis whitespace-nowrap tracking-tight">
                {display}
              </div>
            </div>

            {/* Keypad */}
            <div className="p-5 grid grid-cols-4 gap-3 bg-white/5 dark:bg-[#121212]/50">
              <Button variant="clear" onClick={clear}>AC</Button>
              <Button variant="clear" onClick={deleteLast}><Delete size={20} /></Button>
              <Button variant="operator" onClick={() => handleOperatorClick('/')}>÷</Button>
              <Button variant="operator" onClick={() => handleOperatorClick('*')}>×</Button>

              <Button onClick={() => inputDigit(7)}>7</Button>
              <Button onClick={() => inputDigit(8)}>8</Button>
              <Button onClick={() => inputDigit(9)}>9</Button>
              <Button variant="operator" onClick={() => handleOperatorClick('-')}>-</Button>

              <Button onClick={() => inputDigit(4)}>4</Button>
              <Button onClick={() => inputDigit(5)}>5</Button>
              <Button onClick={() => inputDigit(6)}>6</Button>
              <Button variant="operator" onClick={() => handleOperatorClick('+')}>+</Button>

              <div className="col-span-3 grid grid-cols-3 gap-3">
                <Button onClick={() => inputDigit(1)}>1</Button>
                <Button onClick={() => inputDigit(2)}>2</Button>
                <Button onClick={() => inputDigit(3)}>3</Button>
                <Button className="col-span-2" onClick={() => inputDigit(0)}>0</Button>
                <Button onClick={inputDot}>.</Button>
              </div>
              <Button variant="accent" onClick={() => handleOperatorClick('=')} className="h-[calc(4rem*2+0.75rem)]">=</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
