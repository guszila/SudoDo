import { useState, useEffect } from 'react';

/**
 * Hook to detect virtual keyboard opening and measure keyboard height on mobile devices.
 * Uses window.visualViewport with fallback to window resizing and input focus.
 */
export function useVirtualKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const visualViewport = window.visualViewport;

    const updateKeyboardState = () => {
      if (visualViewport) {
        // Calculate offset between window innerHeight and visualViewport bottom
        const offsetBottom = window.innerHeight - (visualViewport.height + visualViewport.offsetTop);
        
        // Threshold: mobile keyboards are at least 150px tall (ignores address bar URL retracts)
        if (offsetBottom > 120) {
          const clamped = Math.min(Math.round(offsetBottom), Math.round(window.innerHeight * 0.7));
          setKeyboardHeight(clamped);
          setIsKeyboardOpen(true);
        } else {
          setKeyboardHeight(0);
          setIsKeyboardOpen(false);
        }
      } else {
        // Fallback for browsers without visualViewport API
        const activeEl = document.activeElement;
        const isInputFocused = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);
        if (isInputFocused) {
          setIsKeyboardOpen(true);
        } else {
          setIsKeyboardOpen(false);
          setKeyboardHeight(0);
        }
      }
    };

    if (visualViewport) {
      visualViewport.addEventListener('resize', updateKeyboardState);
      visualViewport.addEventListener('scroll', updateKeyboardState);
    } else {
      window.addEventListener('resize', updateKeyboardState);
    }

    const onFocusIn = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        setTimeout(updateKeyboardState, 300);
      }
    };

    const onFocusOut = () => {
      setTimeout(updateKeyboardState, 150);
    };

    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('focusout', onFocusOut);

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', updateKeyboardState);
        visualViewport.removeEventListener('scroll', updateKeyboardState);
      } else {
        window.removeEventListener('resize', updateKeyboardState);
      }
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen };
}
