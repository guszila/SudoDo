import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductTour({ steps, onComplete, lang }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const updateRect = () => {
    // Find the first visible element matching the selector
    const elements = document.querySelectorAll(steps[currentStep].target);
    const target = Array.from(elements).find(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    });

    if (target) {
      // Ensure element is in view if possible
      if (currentStep > 0 && currentStep !== steps.length - 1) { // dont scroll on first or last randomly
         target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      const rect = target.getBoundingClientRect();
      setTargetRect({
        x: rect.left - 8,
        y: rect.top - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        rx: steps[currentStep].borderRadius || 16,
        top: rect.top,
        bottom: rect.bottom,
      });
    } else {
      // If target not found or not visible, we can either wait or gracefully skip.
      // We just set null to hide it temporarily.
      setTargetRect(null);
    }
  };

  useEffect(() => {
    // Small delay to ensure DOM is fully rendered before calculating rect
    const timer = setTimeout(updateRect, 100);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    const observer = new MutationObserver(updateRect);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      observer.disconnect();
    };
  }, [currentStep]);

  const step = steps[currentStep];
  
  // Decide where to put tooltip so it doesn't fall off screen
  const spaceBelow = targetRect ? window.innerHeight - targetRect.bottom : window.innerHeight / 2;
  const showTooltipBelow = targetRect ? (spaceBelow > 250 || targetRect.top < 200) : true;

  return (
    <div className="fixed inset-0 z-[10000]">
      {/* Dim Overlay with SVG Mask to cut out the spotlight */}
      <svg width="100%" height="100%" className="absolute inset-0 pointer-events-auto">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <motion.rect 
                fill="black"
                initial={false}
                animate={{
                  x: targetRect.x,
                  y: targetRect.y,
                  width: targetRect.width,
                  height: targetRect.height,
                  rx: targetRect.rx
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#spotlight-mask)" />
      </svg>
      
      {/* Animated Border Glow around the spotlight */}
      {targetRect && (
        <motion.div
          className="absolute pointer-events-none border-2 border-[var(--theme-accent)]"
          initial={false}
          animate={{
            left: targetRect.x,
            top: targetRect.y,
            width: targetRect.width,
            height: targetRect.height,
            borderRadius: targetRect.rx,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            boxShadow: '0 0 25px var(--theme-accent-border)',
          }}
        />
      )}
      
      {/* Tooltip Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: showTooltipBelow ? -20 : 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute pointer-events-auto bg-white dark:bg-slate-900 border-2 border-[var(--theme-accent-border)] p-6 rounded-2xl w-[90%] max-w-sm left-1/2 -translate-x-1/2 shadow-2xl"
          style={targetRect ? {
            top: showTooltipBelow ? targetRect.bottom + 20 : undefined,
            bottom: !showTooltipBelow ? (window.innerHeight - targetRect.top) + 20 : undefined,
          } : {
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Arrow pointing to target */}
          {targetRect && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-900 border-[var(--theme-accent-border)] transform rotate-45"
              style={{
                top: showTooltipBelow ? -9 : undefined,
                bottom: !showTooltipBelow ? -9 : undefined,
                borderTopWidth: showTooltipBelow ? 2 : 0,
                borderLeftWidth: showTooltipBelow ? 2 : 0,
                borderBottomWidth: !showTooltipBelow ? 2 : 0,
                borderRightWidth: !showTooltipBelow ? 2 : 0,
              }}
            />
          )}

          <div className="relative z-10">
            <h3 className="font-extrabold text-xl mb-3 flex items-center gap-3 text-[var(--theme-accent)]">
              {step.icon} {step.title}
            </h3>
            <p className="text-[15px] font-medium text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {step.content}
            </p>
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold opacity-40">
                {currentStep + 1} / {steps.length}
              </span>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button 
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {lang === 'en' ? 'Back' : 'ย้อนกลับ'}
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (currentStep < steps.length - 1) {
                      setCurrentStep(prev => prev + 1);
                    } else {
                      onComplete();
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[var(--theme-accent)] text-white shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  {currentStep < steps.length - 1 ? (lang === 'en' ? 'Next' : 'ถัดไป') : (lang === 'en' ? 'Start Using!' : 'เริ่มใช้งาน!')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
