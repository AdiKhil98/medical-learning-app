import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

interface UseSimulationTimerProps {
  isActive: boolean;
  onTimeUp?: () => void;
}

export function useSimulationTimer({ isActive, onTimeUp }: UseSimulationTimerProps) {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up!
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeRemaining]);

  const handleTimeUp = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Call the optional callback first
    if (onTimeUp) {
      onTimeUp();
    }

    // Show alert and redirect
    Alert.alert(
      'Zeit abgelaufen',
      'Sie haben das Zeitlimit der Simulation überschritten, die Bewertung wird an Ihren Fortschrittsbereich gesendet.',
      [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/(tabs)/progress');
          }
        }
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setTimeRemaining(30 * 60);
  };

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isTimeUp: timeRemaining === 0,
    resetTimer
  };
}