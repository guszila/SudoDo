import { createContext, useContext, useState, useEffect } from 'react';
import { getUserSettings, updateUserSettings } from '../services/userService';
import { useToast } from './ToastContext';

const SettingsContext = createContext();

export function useSettings() {
  return useContext(SettingsContext);
}

const DEFAULT_SETTINGS = {
  socialSecurity: false,
  showInIncome: false,
  darkMode: false,
  themeMode: 'system',
  language: 'th',
  weekStart: 'อาทิตย์',
  notifyTasks: true,
  notifyShifts: true,
  notifyStreak: false,
  jobs: []
};

export function SettingsProvider({ children, user }) {
  const { showToast } = useToast();
  
  const [settings, setSettings] = useState(() => {
    if (!user?.uid) return DEFAULT_SETTINGS;
    try {
      const cached = localStorage.getItem(`sudodo_settings_${user.uid}`);
      if (cached) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
      }
    } catch {
      // Ignore cache error
    }
    return DEFAULT_SETTINGS;
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (!user?.uid) return true;
    return !localStorage.getItem(`sudodo_settings_${user.uid}`);
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadSettings = async () => {
      const data = await getUserSettings(user.uid);
      if (data && data.themeMode === undefined && data.darkMode !== undefined) {
        data.themeMode = data.darkMode ? 'dark' : 'light';
      }
      setSettings(prev => {
        const next = { ...prev, ...data };
        try {
          localStorage.setItem(`sudodo_settings_${user.uid}`, JSON.stringify(next));
        } catch {
          // Ignore cache save error
        }
        return next;
      });
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
        
        // Sync notification settings to OneSignal Tags
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(function(OneSignal) {
            const tags = {};
            if (newSettings.notifyTasks !== undefined) tags.notifyTasks = newSettings.notifyTasks ? "true" : "false";
            if (newSettings.notifyShifts !== undefined) tags.notifyShifts = newSettings.notifyShifts ? "true" : "false";
            if (newSettings.notifyStreak !== undefined) tags.notifyStreak = newSettings.notifyStreak ? "true" : "false";
            
            if (Object.keys(tags).length > 0) {
              OneSignal.User.addTags(tags);
            }
          });
        }
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
