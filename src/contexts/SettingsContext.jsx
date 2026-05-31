import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserSettings, updateUserSettings } from '../services/userService';
import { useToast } from './ToastContext';

const SettingsContext = createContext();

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children, user }) {
  const { showToast } = useToast();
  
  const [settings, setSettings] = useState({
    socialSecurity: false,
    showInIncome: false,
    darkMode: false,
    language: 'th',
    weekStart: 'อาทิตย์',
    notifyTasks: true,
    notifyShifts: true,
    notifyStreak: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings({
    socialSecurity: false,
    showInIncome: false,
    darkMode: false,
    language: 'th',
    weekStart: 'อาทิตย์',
    notifyTasks: true,
    notifyShifts: true,
    notifyStreak: false
      });
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      setIsLoading(true);
      const data = await getUserSettings(user.uid);
      setSettings(prev => ({ ...prev, ...data }));
      setIsLoading(false);
    };

    loadSettings();
  }, [user]);

  const updateSettings = async (newSettings) => {
    const previousSettings = { ...settings };
    setSettings(prev => ({ ...prev, ...newSettings }));
    
    if (user) {
      try {
        await updateUserSettings(user.uid, newSettings);
      } catch (error) {
        console.error("Failed to save settings:", error);
        setSettings(previousSettings);
        showToast("เกิดข้อผิดพลาดในการบันทึกการตั้งค่า", { duration: 3000 });
      }
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}
