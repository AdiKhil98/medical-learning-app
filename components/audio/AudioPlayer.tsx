import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/utils/logger';
import type { AudioPlaybackState } from '@/types/audio';

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  subtitle?: string;
  onPlaybackStatusUpdate?: (status: AudioPlaybackState) => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
const SKIP_SECONDS = 15;

export function AudioPlayer({ audioUrl, title, subtitle, onPlaybackStatusUpdate }: AudioPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Initialize audio
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Set audio mode for background playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // Create and load sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false, rate: playbackRate, shouldCorrectPitch: true },
          onPlaybackStatusChange
        );

        soundRef.current = sound;
        setIsLoading(false);
        logger.info('[AudioPlayer] Audio loaded successfully');
      } catch (err) {
        logger.error('[AudioPlayer] Error loading audio:', err);
        setError('Fehler beim Laden des Audios');
        setIsLoading(false);
      }
    };

    initAudio();

    // Cleanup
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [audioUrl]);

  const onPlaybackStatusChange = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          logger.error('[AudioPlayer] Playback error:', status.error);
          setError('Wiedergabefehler');
        }
        return;
      }

      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);
      setPositionMillis(status.positionMillis);
      setDurationMillis(status.durationMillis || 0);

      if (onPlaybackStatusUpdate) {
        onPlaybackStatusUpdate({
          isPlaying: status.isPlaying,
          isLoading: false,
          isBuffering: status.isBuffering,
          positionMillis: status.positionMillis,
          durationMillis: status.durationMillis || 0,
          playbackRate: status.rate,
        });
      }
    },
    [onPlaybackStatusUpdate]
  );

  const togglePlayPause = async () => {
    if (!soundRef.current) return;

    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (err) {
      logger.error('[AudioPlayer] Play/pause error:', err);
    }
  };

  const seekTo = async (position: number) => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.setPositionAsync(position);
    } catch (err) {
      logger.error('[AudioPlayer] Seek error:', err);
    }
  };

  const skipForward = async () => {
    if (!soundRef.current) return;

    const newPosition = Math.min(positionMillis + SKIP_SECONDS * 1000, durationMillis);
    await seekTo(newPosition);
  };

  const skipBackward = async () => {
    if (!soundRef.current) return;

    const newPosition = Math.max(positionMillis - SKIP_SECONDS * 1000, 0);
    await seekTo(newPosition);
  };

  const cyclePlaybackRate = async () => {
    if (!soundRef.current) return;

    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    const newRate = PLAYBACK_RATES[nextIndex];

    try {
      await soundRef.current.setRateAsync(newRate, true);
      setPlaybackRate(newRate);
    } catch (err) {
      logger.error('[AudioPlayer] Rate change error:', err);
    }
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.albumArt}>
          <Ionicons name="headset" size={64} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </LinearGradient>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={durationMillis || 1}
          value={positionMillis}
          onSlidingComplete={seekTo}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#e2e8f0"
          thumbTintColor="#6366f1"
          disabled={isLoading}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
          <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Playback rate button */}
        <TouchableOpacity style={styles.rateButton} onPress={cyclePlaybackRate} activeOpacity={0.7}>
          <Text style={styles.rateText}>{playbackRate}x</Text>
        </TouchableOpacity>

        {/* Skip backward */}
        <TouchableOpacity style={styles.skipButton} onPress={skipBackward} activeOpacity={0.7} disabled={isLoading}>
          <Ionicons name="play-back" size={28} color="#64748b" />
          <Text style={styles.skipText}>{SKIP_SECONDS}</Text>
        </TouchableOpacity>

        {/* Play/Pause button */}
        <TouchableOpacity style={styles.playButton} onPress={togglePlayPause} activeOpacity={0.8} disabled={isLoading}>
          <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.playButtonGradient}>
            {isLoading || isBuffering ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={36}
                color="#fff"
                style={isPlaying ? undefined : { marginLeft: 4 }}
              />
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Skip forward */}
        <TouchableOpacity style={styles.skipButton} onPress={skipForward} activeOpacity={0.7} disabled={isLoading}>
          <Ionicons name="play-forward" size={28} color="#64748b" />
          <Text style={styles.skipText}>{SKIP_SECONDS}</Text>
        </TouchableOpacity>

        {/* Placeholder for symmetry */}
        <View style={styles.rateButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  albumArt: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  timeText: {
    fontSize: 14,
    color: '#64748b',
    fontVariant: ['tabular-nums'],
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  rateButton: {
    width: 48,
    height: 32,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  skipButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: -4,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  playButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 12,
    textAlign: 'center',
  },
});
