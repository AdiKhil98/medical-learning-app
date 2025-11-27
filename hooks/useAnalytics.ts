/**
 * React Hooks for Analytics
 *
 * Convenient hooks for tracking events in React components
 */

import { useEffect, useCallback } from 'react';
import { usePathname } from 'expo-router';
import { analytics, AnalyticsEvent, AnalyticsProperties, trackEvent } from '@/utils/analytics';

/**
 * Hook to track page views automatically
 */
export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      analytics.trackPageView(pathname);
    }
  }, [pathname]);
}

/**
 * Hook to track events
 */
export function useTrackEvent() {
  return useCallback((event: AnalyticsEvent | string, properties?: AnalyticsProperties) => {
    trackEvent(event, properties);
  }, []);
}

/**
 * Hook to track component mount/unmount
 */
export function useComponentTracking(componentName: string, properties?: AnalyticsProperties) {
  const track = useTrackEvent();

  useEffect(() => {
    track('component_mounted', {
      component: componentName,
      ...properties,
    });

    return () => {
      track('component_unmounted', {
        component: componentName,
        ...properties,
      });
    };
  }, [componentName, properties, track]);
}

/**
 * Hook to track user interactions
 */
export function useInteractionTracking(interactionType: string) {
  const track = useTrackEvent();

  return useCallback(
    (target: string, properties?: AnalyticsProperties) => {
      track('user_interaction', {
        interaction_type: interactionType,
        target,
        ...properties,
      });
    },
    [interactionType, track]
  );
}

/**
 * Hook to track timing events (e.g., how long a task took)
 */
export function useTimingTracking(eventName: string) {
  const track = useTrackEvent();

  return useCallback(() => {
    const startTime = Date.now();

    return (properties?: AnalyticsProperties) => {
      const duration = Date.now() - startTime;
      track(eventName, {
        duration_ms: duration,
        duration_seconds: Math.round(duration / 1000),
        ...properties,
      });
    };
  }, [eventName, track]);
}

/**
 * Hook to track study session
 */
export function useStudySessionTracking() {
  const track = useTrackEvent();
  const startTiming = useTimingTracking(AnalyticsEvent.STUDY_SESSION_COMPLETED);

  const startSession = useCallback(
    (properties?: AnalyticsProperties) => {
      track(AnalyticsEvent.STUDY_SESSION_STARTED, properties);
      return startTiming();
    },
    [track, startTiming]
  );

  const completeSession = useCallback(
    (endSession: (props?: AnalyticsProperties) => void, properties?: AnalyticsProperties) => {
      endSession(properties);
    },
    []
  );

  const abandonSession = useCallback(
    (properties?: AnalyticsProperties) => {
      track(AnalyticsEvent.STUDY_SESSION_ABANDONED, properties);
    },
    [track]
  );

  return {
    startSession,
    completeSession,
    abandonSession,
  };
}

/**
 * Hook to track quiz/test progress
 */
export function useQuizTracking() {
  const track = useTrackEvent();
  const startTiming = useTimingTracking(AnalyticsEvent.QUIZ_COMPLETED);

  const startQuiz = useCallback(
    (quizId: string, properties?: AnalyticsProperties) => {
      track(AnalyticsEvent.QUIZ_STARTED, {
        quiz_id: quizId,
        ...properties,
      });
      return startTiming();
    },
    [track, startTiming]
  );

  const answerQuestion = useCallback(
    (questionId: string, isCorrect: boolean, properties?: AnalyticsProperties) => {
      track(AnalyticsEvent.QUIZ_QUESTION_ANSWERED, {
        question_id: questionId,
        is_correct: isCorrect,
        ...properties,
      });
    },
    [track]
  );

  const completeQuiz = useCallback(
    (
      endQuiz: (props?: AnalyticsProperties) => void,
      quizId: string,
      score: number,
      totalQuestions: number,
      properties?: AnalyticsProperties
    ) => {
      endQuiz({
        quiz_id: quizId,
        score,
        total_questions: totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        ...properties,
      });
    },
    []
  );

  return {
    startQuiz,
    answerQuestion,
    completeQuiz,
  };
}

/**
 * Hook to track flashcard interactions
 */
export function useFlashcardTracking() {
  const track = useTrackEvent();

  const viewFlashcard = useCallback(
    (flashcardId: string, properties?: AnalyticsProperties) => {
      track(AnalyticsEvent.FLASHCARD_VIEWED, {
        flashcard_id: flashcardId,
        ...properties,
      });
    },
    [track]
  );

  const answerFlashcard = useCallback(
    (flashcardId: string, wasCorrect: boolean, properties?: AnalyticsProperties) => {
      track(AnalyticsEvent.FLASHCARD_ANSWERED, {
        flashcard_id: flashcardId,
        was_correct: wasCorrect,
        ...properties,
      });
    },
    [track]
  );

  const createFlashcard = useCallback(
    (properties?: AnalyticsProperties) => {
      track(AnalyticsEvent.FLASHCARD_CREATED, properties);
    },
    [track]
  );

  return {
    viewFlashcard,
    answerFlashcard,
    createFlashcard,
  };
}

/**
 * Hook to track errors
 */
export function useErrorTracking() {
  const track = useTrackEvent();

  return useCallback(
    (error: Error, context?: AnalyticsProperties) => {
      track(AnalyticsEvent.ERROR_OCCURRED, {
        error_message: error.message,
        error_name: error.name,
        error_stack: error.stack?.substring(0, 500), // Limit stack trace length
        ...context,
      });
    },
    [track]
  );
}
