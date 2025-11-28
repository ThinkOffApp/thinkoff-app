import { RefreshCw, X, Smartphone, Monitor } from 'lucide-react';

interface SyncPromptProps {
  onEnable: () => void;
  onSkip: () => void;
}

export default function SyncPrompt({ onEnable, onSkip }: SyncPromptProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sync Conversations</h2>
              <p className="text-sm text-text-secondary">Keep your chats in sync</p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-6">
          <p className="text-text-primary">
            Would you like to sync your Full Mode conversations between the Android app and web?
          </p>

          <div className="flex items-center justify-center gap-4 py-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-emerald-400" />
              </div>
              <span className="text-xs text-text-secondary">Android App</span>
            </div>

            <div className="flex items-center gap-1">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" style={{ animationDuration: '3s' }} />
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Monitor className="w-7 h-7 text-blue-400" />
              </div>
              <span className="text-xs text-text-secondary">Web App</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm text-text-secondary">
            <p>When enabled:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Your Full Mode conversation history syncs across devices</li>
              <li>Start a chat on your phone, continue on web</li>
              <li>Your credits and usage stats stay in sync</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-text-primary hover:bg-white/20 transition-colors font-medium"
          >
            Maybe Later
          </button>
          <button
            onClick={onEnable}
            className="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Enable Sync
          </button>
        </div>
      </div>
    </div>
  );
}
