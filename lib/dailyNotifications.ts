import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SecureLogger } from './security';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailyNotificationConfig {
  enabled: boolean;
  tipNotificationTime: { hour: number; minute: number };
  questionNotificationTime: { hour: number; minute: number };
}

const DEFAULT_CONFIG: DailyNotificationConfig = {
  enabled: true,
  tipNotificationTime: { hour: 9, minute: 0 }, // 9:00 AM
  questionNotificationTime: { hour: 18, minute: 0 }, // 6:00 PM
};

const STORAGE_KEYS = {
  CONFIG: '@daily_notifications_config',
  LAST_TIP_DATE: '@last_tip_notification_date',
  LAST_QUESTION_DATE: '@last_question_notification_date',
};

const TIP_MESSAGES = [
  {
    title: "💡 Tipp des Tages!",
    body: "Entdecke heute einen neuen medizinischen Tipp in der KP Med App!"
  },
  {
    title: "🩺 Dein täglicher Lerntipp!",
    body: "Verpasse nicht den heutigen Lerntipp für deine medizinische Ausbildung!"
  },
  {
    title: "📚 Wissen für heute!",
    body: "Ein neuer Tipp wartet auf dich - öffne KP Med und lerne etwas Neues!"
  },
  {
    title: "⭐ Tipp des Tages verfügbar!",
    body: "Erweitere dein medizinisches Wissen mit dem heutigen Tipp!"
  },
  {
    title: "🔬 Medizin-Tipp für dich!",
    body: "Dein täglicher Lerntipp ist bereit - schau jetzt in die KP Med App!"
  }
];

const QUESTION_MESSAGES = [
  {
    title: "❓ Tagesfrage wartet!",
    body: "Beantworte die heutige Frage und teste dein medizinisches Wissen!"
  },
  {
    title: "🧠 Quiz-Zeit!",
    body: "Die tägliche Frage des Tages ist bereit - stelle dein Können unter Beweis!"
  },
  {
    title: "📝 Deine tägliche Herausforderung!",
    body: "Eine neue Frage wartet darauf, von dir beantwortet zu werden!"
  },
  {
    title: "🎯 Teste dein Wissen!",
    body: "Die Frage des Tages ist da - zeig, was du gelernt hast!"
  },
  {
    title: "💪 Tägliche Lernkontrolle!",
    body: "Überprüfe dein medizinisches Wissen mit der heutigen Frage!"
  }
];

export class DailyNotificationManager {
  private static instance: DailyNotificationManager;
  private config: DailyNotificationConfig = DEFAULT_CONFIG;
  private isInitialized = false;

  static getInstance(): DailyNotificationManager {
    if (!DailyNotificationManager.instance) {
      DailyNotificationManager.instance = new DailyNotificationManager();
    }
    return DailyNotificationManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem(STORAGE_KEYS.CONFIG);
      if (savedConfig) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
      }

      // Check if we need to schedule notifications
      await this.checkAndScheduleNotifications();
      
      this.isInitialized = true;
      SecureLogger.log('Daily notification manager initialized');
    } catch (error) {
      SecureLogger.error('Failed to initialize daily notifications', error);
    }
  }

  async updateConfig(newConfig: Partial<DailyNotificationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
      
      // Reschedule notifications with new config
      if (this.config.enabled) {
        await this.scheduleAllNotifications();
      } else {
        await this.cancelAllNotifications();
      }
      
      SecureLogger.log('Daily notification config updated');
    } catch (error) {
      SecureLogger.error('Failed to update daily notification config', error);
      throw error;
    }
  }

  getConfig(): DailyNotificationConfig {
    return { ...this.config };
  }

  private async checkAndScheduleNotifications(): Promise<void> {
    if (!this.config.enabled) {
      SecureLogger.log('Daily notifications are disabled');
      return;
    }

    if (Platform.OS === 'web') {
      SecureLogger.log('Daily notifications not supported on web platform');
      return;
    }

    const today = new Date().toDateString();

    // Check tip notification
    const lastTipDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_TIP_DATE);
    if (lastTipDate !== today) {
      await this.scheduleTipNotification();
    }

    // Check question notification
    const lastQuestionDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_QUESTION_DATE);
    if (lastQuestionDate !== today) {
      await this.scheduleQuestionNotification();
    }
  }

  private async scheduleAllNotifications(): Promise<void> {
    await this.cancelAllNotifications();
    await this.scheduleTipNotification();
    await this.scheduleQuestionNotification();
  }

  private async scheduleTipNotification(): Promise<void> {
    try {
      const message = this.getRandomMessage(TIP_MESSAGES);
      const { hour, minute } = this.config.tipNotificationTime;

      const scheduledDate = new Date();
      scheduledDate.setHours(hour, minute, 0, 0);

      // If the time has already passed today, schedule for tomorrow
      if (scheduledDate <= new Date()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { 
            type: 'daily_tip',
            date: scheduledDate.toDateString()
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: 'date',
          date: scheduledDate,
          repeats: false,
        } as Notifications.DateTriggerInput,
        identifier: 'daily_tip_notification',
      });

      await AsyncStorage.setItem(STORAGE_KEYS.LAST_TIP_DATE, scheduledDate.toDateString());
      SecureLogger.log(`Daily tip notification scheduled for ${scheduledDate.toLocaleString('de-DE')}`);
      
      if (__DEV__) {
        console.log(`📅 Daily tip scheduled for: ${scheduledDate.toLocaleString('de-DE')}`);
        console.log(`💡 Message: ${message.title} - ${message.body}`);
      }
    } catch (error) {
      SecureLogger.error('Failed to schedule tip notification', error);
    }
  }

  private async scheduleQuestionNotification(): Promise<void> {
    try {
      const message = this.getRandomMessage(QUESTION_MESSAGES);
      const { hour, minute } = this.config.questionNotificationTime;

      const scheduledDate = new Date();
      scheduledDate.setHours(hour, minute, 0, 0);

      // If the time has already passed today, schedule for tomorrow
      if (scheduledDate <= new Date()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { 
            type: 'daily_question',
            date: scheduledDate.toDateString()
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: 'date',
          date: scheduledDate,
          repeats: false,
        } as Notifications.DateTriggerInput,
        identifier: 'daily_question_notification',
      });

      await AsyncStorage.setItem(STORAGE_KEYS.LAST_QUESTION_DATE, scheduledDate.toDateString());
      SecureLogger.log(`Daily question notification scheduled for ${scheduledDate.toLocaleString('de-DE')}`);
      
      if (__DEV__) {
        console.log(`📅 Daily question scheduled for: ${scheduledDate.toLocaleString('de-DE')}`);
        console.log(`❓ Message: ${message.title} - ${message.body}`);
      }
    } catch (error) {
      SecureLogger.error('Failed to schedule question notification', error);
    }
  }

  private getRandomMessage(messages: Array<{ title: string; body: string }>): { title: string; body: string } {
    const index = Math.floor(Math.random() * messages.length);
    return messages[index];
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync('daily_tip_notification');
      await Notifications.cancelScheduledNotificationAsync('daily_question_notification');
      SecureLogger.log('All daily notifications cancelled');
    } catch (error) {
      SecureLogger.error('Failed to cancel daily notifications', error);
    }
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      return scheduled.filter(notification => 
        notification.identifier === 'daily_tip_notification' || 
        notification.identifier === 'daily_question_notification'
      );
    } catch (error) {
      SecureLogger.error('Failed to get scheduled notifications', error);
      return [];
    }
  }

  // Manual trigger for testing
  async sendTestTipNotification(): Promise<void> {
    try {
      const message = this.getRandomMessage(TIP_MESSAGES);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title + " (Test)",
          body: message.body,
          data: { type: 'daily_tip', test: true },
          sound: true,
        },
        trigger: { type: 'timeInterval', seconds: 1 } as Notifications.TimeIntervalTriggerInput,
      });
      
      SecureLogger.log('Test tip notification sent');
    } catch (error) {
      SecureLogger.error('Failed to send test tip notification', error);
      throw error;
    }
  }

  async sendTestQuestionNotification(): Promise<void> {
    try {
      const message = this.getRandomMessage(QUESTION_MESSAGES);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title + " (Test)",
          body: message.body,
          data: { type: 'daily_question', test: true },
          sound: true,
        },
        trigger: { type: 'timeInterval', seconds: 1 } as Notifications.TimeIntervalTriggerInput,
      });
      
      SecureLogger.log('Test question notification sent');
    } catch (error) {
      SecureLogger.error('Failed to send test question notification', error);
      throw error;
    }
  }

  // Check if it's time to reschedule (call this when app becomes active)
  async checkAndRescheduleIfNeeded(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const scheduled = await this.getScheduledNotifications();
      const now = new Date();

      // Check if we need to reschedule tip notification
      const tipScheduled = scheduled.find(n => n.identifier === 'daily_tip_notification');
      if (!tipScheduled) {
        const lastTipDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_TIP_DATE);
        const today = now.toDateString();
        
        if (lastTipDate !== today) {
          await this.scheduleTipNotification();
        }
      }

      // Check if we need to reschedule question notification
      const questionScheduled = scheduled.find(n => n.identifier === 'daily_question_notification');
      if (!questionScheduled) {
        const lastQuestionDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_QUESTION_DATE);
        const today = now.toDateString();
        
        if (lastQuestionDate !== today) {
          await this.scheduleQuestionNotification();
        }
      }

      SecureLogger.log('Daily notifications check completed');
    } catch (error) {
      SecureLogger.error('Failed to check and reschedule notifications', error);
    }
  }
}

// Export singleton instance
export const dailyNotifications = DailyNotificationManager.getInstance();