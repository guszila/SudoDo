import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import OneSignalService from '../../services/OneSignalService';

export default function OneSignalVerificationModal({ lang }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if already shown
    if (localStorage.getItem('onesignal_verified_shown') === 'true') {
      return;
    }

    const checkSubscription = (subId) => {
      if (subId && !subId.startsWith('local-')) {
        setIsOpen(true);
      }
    };

    // Check immediately if OneSignalService is initialized
    setTimeout(() => {
        checkSubscription(OneSignalService.getSubscriptionId());
    }, 2000); // Give it some time to fetch

    // Listen for changes
    const unsubscribe = OneSignalService.onSubscriptionChange((subId) => {
      checkSubscription(subId);
    });

    return () => unsubscribe();
  }, []);

  const handleGotIt = async () => {
    setIsOpen(false);
    localStorage.setItem('onesignal_verified_shown', 'true');
    // Request push permission as required by the AI prompt
    await OneSignalService.requestPermission();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-white dark:bg-[#1a1a2e] rounded-3xl p-6 shadow-2xl border border-white/20"
          >
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-blue-500" />
            </div>
            
            <h3 className="text-xl font-bold text-center text-[#1a1a2e] dark:text-white mb-2">
              Your OneSignal SDK integration is complete!
            </h3>
            
            <p className="text-center text-[#888780] dark:text-[#A0A0A0] text-sm mb-6 leading-relaxed">
              You can now send Push Notifications & In-App Messages through OneSignal. Tap below to enable push notifications.
            </p>
            
            <button 
              onClick={handleGotIt}
              className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-bold text-[15px] hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30 active:scale-95"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
