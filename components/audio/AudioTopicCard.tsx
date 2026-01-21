import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AudioTopic } from '@/types/audio';

interface AudioTopicCardProps {
  topic: AudioTopic;
  onPress: () => void;
  hasAccess: boolean;
  priorityColors?: { [key: string]: string };
}

// Default priority colors
const defaultPriorityColors: { [key: string]: string } = {
  '+++': '#ef4444',
  '++': '#f59e0b',
  '+': '#22c55e',
};

export function AudioTopicCard({
  topic,
  onPress,
  hasAccess,
  priorityColors = defaultPriorityColors,
}: AudioTopicCardProps) {
  const priority = topic.bereich || topic.priority;
  const priorityColor = priority ? priorityColors[priority] || '#64748b' : '#6366f1';

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Priority badge if available */}
      {priority && (
        <View style={[styles.priorityPill, { backgroundColor: priorityColor }]}>
          <Text style={styles.priorityText}>{priority}</Text>
        </View>
      )}

      {/* Audio icon */}
      <View style={styles.audioIconContainer}>
        {hasAccess ? (
          <Ionicons name="headset" size={20} color="#6366f1" />
        ) : (
          <Ionicons name="lock-closed" size={20} color="#94a3b8" />
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, !hasAccess && styles.titleLocked]} numberOfLines={2}>
        {topic.title_de}
      </Text>

      {/* Duration if available */}
      {topic.duration_seconds && (
        <View style={styles.durationContainer}>
          <Ionicons name="time-outline" size={12} color="#94a3b8" />
          <Text style={styles.durationText}>{formatDuration(topic.duration_seconds)}</Text>
        </View>
      )}

      {/* Arrow indicator */}
      <View style={styles.arrowContainer}>
        {hasAccess ? (
          <Ionicons name="play-circle" size={22} color="#6366f1" />
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
    }),
  },
  priorityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  audioIconContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 20,
    paddingRight: 30,
    marginBottom: 8,
  },
  titleLocked: {
    color: '#64748b',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 14,
    right: 14,
  },
});
