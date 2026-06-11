export type AlertCandidate = {
  id: string;
  readAt?: string | null;
  targetUserId?: string | null;
};

export function shouldAlertForNotification(
  event: AlertCandidate,
  userId: string,
  alertedIds: Set<string>
) {
  return (
    event.targetUserId === userId &&
    !event.readAt &&
    !alertedIds.has(event.id)
  );
}

export async function playNotificationTone(context?: AudioContext) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const audioContext = context || (AudioContextClass ? new AudioContextClass() : undefined);

    if (!audioContext) {
      return false;
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.13, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    gain.connect(audioContext.destination);

    [660, 880].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const start = now + index * 0.13;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + 0.2);
    });

    return true;
  } catch {
    return false;
  }
}
