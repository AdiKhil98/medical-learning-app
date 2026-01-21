// Audio Library Types

export type AudioLibraryType = 'fsp_audio' | 'kp_audio';

export interface AudioTopic {
  id: string;
  slug: string;
  title_de: string;
  fachgebiet: string;
  bereich?: string;
  priority?: string;
  audio_url: string;
  duration_seconds?: number;
  source_table?: 'fsp_bibliothek' | 'fsp_anamnese' | 'fsp_fachbegriffe' | 'kp_medical_content';
}

export interface AudioSubscription {
  id: string;
  user_id: string;
  library_type: AudioLibraryType;
  status: 'active' | 'cancelled' | 'expired';
  starts_at: string;
  expires_at: string;
  created_at: string;
}

export interface AudioSubscriptionStatus {
  hasAccess: boolean;
  subscription: AudioSubscription | null;
  loading: boolean;
  error: string | null;
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  playbackRate: number;
}

export interface AudioPlayerControls {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  skipForward: (seconds?: number) => Promise<void>;
  skipBackward: (seconds?: number) => Promise<void>;
}

// Fachgebiet configuration for audio topics
export interface FachgebietConfig {
  gradient: [string, string];
  icon: string;
}

// Pricing information
export interface AudioPricing {
  fsp_audio: {
    price: number;
    currency: string;
    period: string;
  };
  kp_audio: {
    price: number;
    currency: string;
    period: string;
  };
}

export const AUDIO_PRICING: AudioPricing = {
  fsp_audio: {
    price: 7,
    currency: 'EUR',
    period: 'month',
  },
  kp_audio: {
    price: 10,
    currency: 'EUR',
    period: 'month',
  },
};
