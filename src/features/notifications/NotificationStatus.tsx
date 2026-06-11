import { BellRing, MonitorUp, Volume2, Wifi, WifiOff } from "lucide-react";
import { useNotification } from "../../contexts/NotificationContext";

export function NotificationStatus() {
  const {
    connectionState,
    preferences,
    remoteEnabled,
    requestDesktopPermission,
    testNotification,
    updatePreferences
  } = useNotification();
  const connected = remoteEnabled && connectionState === "connected";

  return (
    <section className="mb-3 border-y border-carbon-800 py-3">
      <div className="flex items-center justify-between gap-3 px-2">
        <span
          className={`inline-flex items-center gap-2 text-xs font-bold ${
            connected ? "text-signal-300" : "text-amber-300"
          }`}
        >
          {connected ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
          {connected
            ? "Realtime conectado"
            : !remoteEnabled
              ? "Modo local"
              : connectionState === "offline"
              ? "Sem conexão"
              : "Reconectando"}
        </span>
        <button
          className="inline-flex min-h-8 items-center gap-2 border border-carbon-700 px-2 text-[0.7rem] font-bold text-carbon-300 hover:text-carbon-100"
          onClick={() => void testNotification()}
          type="button"
        >
          <BellRing className="size-3.5" />
          Testar
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 px-2">
        <button
          aria-pressed={preferences.soundEnabled}
          className={`inline-flex min-h-9 items-center justify-center gap-2 border px-2 text-xs font-bold ${
            preferences.soundEnabled
              ? "border-signal-300/30 text-signal-300"
              : "border-carbon-800 text-carbon-500"
          }`}
          onClick={() =>
            void updatePreferences({ soundEnabled: !preferences.soundEnabled })
          }
          type="button"
        >
          <Volume2 className="size-4" />
          Som
        </button>
        <button
          aria-pressed={preferences.desktopEnabled}
          className={`inline-flex min-h-9 items-center justify-center gap-2 border px-2 text-xs font-bold ${
            preferences.desktopEnabled
              ? "border-accent-300/30 text-accent-300"
              : "border-carbon-800 text-carbon-500"
          }`}
          onClick={() =>
            preferences.desktopEnabled
              ? void updatePreferences({ desktopEnabled: false })
              : void requestDesktopPermission()
          }
          type="button"
        >
          <MonitorUp className="size-4" />
          Desktop
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1 px-2">
        {[
          ["assignmentEnabled", "Atribuições"],
          ["reviewEnabled", "Revisões"],
          ["deadlineEnabled", "Prazos"]
        ].map(([key, label]) => {
          const preferenceKey = key as
            | "assignmentEnabled"
            | "reviewEnabled"
            | "deadlineEnabled";
          const enabled = preferences[preferenceKey];
          return (
            <button
              aria-pressed={enabled}
              className={`min-h-8 border px-2 text-[0.68rem] font-bold ${
                enabled
                  ? "border-carbon-600 bg-carbon-800 text-carbon-200"
                  : "border-carbon-800 text-carbon-600"
              }`}
              key={key}
              onClick={() => void updatePreferences({ [preferenceKey]: !enabled })}
              type="button"
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
