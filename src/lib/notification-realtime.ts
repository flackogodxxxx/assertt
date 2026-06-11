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
export async function showNativeNotification(
  title: string,
  body: string,
  demandId?: string
) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  const workOsTitle = `WorkOS • ${title}`;
  const options: NotificationOptions = {
    body,
    data: { url: demandId ? `/crm/demandas/${demandId}` : "/crm" },
    icon: "/assets/mkt-cropped.png",
    tag: demandId ? `workos-demand-${demandId}` : undefined
  };

  const spawnNotification = () => {
    try {
      const n = new Notification(workOsTitle, options);
      n.onclick = () => {
        window.focus();
        const targetUrl = (options.data as { url?: string } | undefined)?.url;
        if (targetUrl) {
          window.location.assign(targetUrl);
        }
        n.close();
      };
    } catch (err) {
      console.error("Failed to spawn notification directly:", err);
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          if (regs.length > 0) {
            regs[0].showNotification(workOsTitle, options);
          }
        }).catch(console.error);
      }
    }
  };

  try {
    if (Notification.permission === "granted") {
      spawnNotification();
    }
  } catch (error) {
    console.error("Failed to request native notification:", error);
  }
}
