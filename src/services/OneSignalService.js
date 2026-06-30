import OneSignal from 'react-onesignal';

const APP_ID = '1c241aae-959f-40bd-9db0-ec3adca93b3c';

class OneSignalService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize(uid) {
    if (this.isInitialized) {
      if (uid) {
        await OneSignal.login(uid);
      }
      return;
    }

    try {
      await OneSignal.init({
        appId: APP_ID,
        safari_web_id: "web.onesignal.auto.5a2165c8-9d94-4308-bfd9-99a8484077b6",
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false, 
        },
      });
      this.isInitialized = true;
      
      if (uid) {
        await OneSignal.login(uid);
      }
    } catch (error) {
      console.error('OneSignal Init Error', error);
    }
  }

  async logout() {
    if (this.isInitialized) {
      await OneSignal.logout();
    }
  }

  async requestPermission() {
    if (!this.isInitialized) return false;
    
    if (OneSignal.Notifications && OneSignal.Notifications.requestPermission) {
       await OneSignal.Notifications.requestPermission();
    } else if (OneSignal.Slidedown) {
       await OneSignal.Slidedown.promptPush();
    }
    
    return OneSignal.Notifications?.permission === true;
  }
  
  hasPermission() {
    if (!this.isInitialized) return false;
    return OneSignal.Notifications?.permission === true;
  }

  async updateTags(settings) {
    if (!this.isInitialized || !OneSignal.User) return;
    
    const tags = {};
    if (settings.notifyTasks !== undefined) {
      tags.notifyTasks = settings.notifyTasks ? 'true' : 'false';
    }
    if (settings.notifyShifts !== undefined) {
      tags.notifyShifts = settings.notifyShifts ? 'true' : 'false';
    }
    if (settings.notifyStreak !== undefined) {
      tags.notifyStreak = settings.notifyStreak ? 'true' : 'false';
    }
    
    if (Object.keys(tags).length > 0) {
      OneSignal.User.addTags(tags);
    }
  }

  onSubscriptionChange(callback) {
     if (!this.isInitialized) return () => {};
     if (OneSignal.User && OneSignal.User.PushSubscription) {
         const listener = () => {
             const subId = OneSignal.User.PushSubscription.id;
             callback(subId);
         };
         OneSignal.User.PushSubscription.addEventListener("change", listener);
         return () => {
             OneSignal.User.PushSubscription.removeEventListener("change", listener);
         };
     }
     return () => {};
  }
  
  getSubscriptionId() {
      if (this.isInitialized && OneSignal.User && OneSignal.User.PushSubscription) {
          return OneSignal.User.PushSubscription.id;
      }
      return null;
  }
}

export default new OneSignalService();
