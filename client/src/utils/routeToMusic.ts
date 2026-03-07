/**
 * Route information for music generation
 */
export interface Route {
  distance: number; // Distance in kilometers
  duration: number; // Duration in minutes
  mode: 'drive' | 'walk';
}

/**
 * Playlist configuration based on route
 */
export interface PlaylistConfig {
  trackCount: number;
  bpmRange: {
    min: number;
    max: number;
  };
  mood: string;
}

/**
 * Converts route information into a playlist configuration
 * 
 * @param route - Route object containing distance, duration, and mode
 * @returns Playlist configuration with track count, BPM range, and mood
 */
export function routeToMusic(route: Route): PlaylistConfig {
  const { distance, duration, mode } = route;

  // Calculate average track length (typical song is 3-4 minutes)
  const averageTrackLength = 3.5;
  const trackCount = Math.ceil(duration / averageTrackLength);

  // Determine BPM range based on mode and pace
  let bpmRange: { min: number; max: number };
  let mood: string;

  if (mode === 'drive') {
    // Driving: moderate to high energy
    const speed = distance / (duration / 60); // km/h
    
    if (speed > 80) {
      // Highway/fast driving
      bpmRange = { min: 120, max: 140 };
      mood = 'energetic';
    } else if (speed > 50) {
      // City driving
      bpmRange = { min: 100, max: 120 };
      mood = 'upbeat';
    } else {
      // Slow/traffic driving
      bpmRange = { min: 80, max: 100 };
      mood = 'chill';
    }
  } else {
    // Walking: pace-based
    const pace = distance / (duration / 60); // km/h
    
    if (pace > 6) {
      // Fast walking/jogging
      bpmRange = { min: 130, max: 150 };
      mood = 'motivational';
    } else if (pace > 4) {
      // Normal walking
      bpmRange = { min: 100, max: 120 };
      mood = 'steady';
    } else {
      // Slow walking/strolling
      bpmRange = { min: 70, max: 90 };
      mood = 'relaxed';
    }
  }

  return {
    trackCount,
    bpmRange,
    mood,
  };
}
