import { Settings, Coins, LogIn, LogOut, Loader2, Smartphone, Sun, Moon, Cpu, Cloud, History } from 'lucide-react';
import { useMemo } from 'react';

interface HeaderProps {
  credits: number;
  isLoggedIn: boolean;
  isLoggingIn?: boolean;
  isDarkMode: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onSettings: () => void;
  onToggleDarkMode: () => void;
  onHistoryClick: () => void;
  showActiveIcon?: boolean;
  mode: 'local' | 'full';
  onSetMode: (mode: 'local' | 'full') => void;
  themeColor: string;
  onSetThemeColor: (color: string) => void;
}

export default function Header({ credits, isLoggedIn, isLoggingIn, isDarkMode, onLogin, onLogout, onSettings, onToggleDarkMode, onHistoryClick, showActiveIcon, mode, onSetMode, themeColor, onSetThemeColor }: HeaderProps) {
  // Detect if user is on Android device
  const isAndroid = useMemo(() => {
    return /Android/i.test(navigator.userAgent);
  }, []);

  // Use production Play Store for Android, testing link for others
  const downloadUrl = isAndroid
    ? 'https://play.google.com/store/apps/details?id=com.chatwithlocalai.app'
    : 'https://play.google.com/apps/testing/com.chatwithlocalai.app';

  const colors = [
    { id: 'fuchsia', value: '#FF00FF', label: 'Fuchsia' },
    { id: 'hotpink', value: '#FF69B4', label: 'Hot Pink' },
    { id: 'magenta', value: '#FF00CC', label: 'Magenta' },
    { id: 'lightfuchsia', value: '#FF77FF', label: 'Light' },
    { id: 'deepfuchsia', value: '#C71585', label: 'Deep' },
    { id: 'lime', value: '#32CD32', label: 'Lime' },
    { id: 'yellow', value: '#FFD700', label: 'Gold' },
    { id: 'orange', value: '#FFA500', label: 'Orange' },
  ];

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-bg-surface/50 backdrop-blur-md border-b border-white/5 mb-6 rounded-2xl sticky top-0 z-50 h-[88px]">
      {/* Logo & Brand & Color Selector */}
      <div className="flex items-center gap-4 h-full relative group">
        <div className="relative flex items-center">
          <div className={`transition-all duration-500 ease-in-out flex items-center justify-center ${showActiveIcon ? 'w-16 h-16' : 'w-12 h-12'} group-hover:scale-110`}>
            <img
              src="/app-icon.png"
              alt="ThinkOff"
              className={`w-full h-full object-contain transition-all duration-500 ${showActiveIcon ? 'animate-neon-pulse' : ''}`}
            />
          </div>

          {/* Color Selector Popup on Hover */}
          <div className="absolute left-0 top-full mt-2 p-3 glass-card rounded-xl flex flex-col gap-2 min-w-[140px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 translate-y-2 group-hover:translate-y-0">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 px-1">Pick a Color</span>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => onSetThemeColor(color.id)}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-125 ${themeColor === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-card' : ''}`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent hidden sm:block">
          ThinkOff
        </h1>
      </div>

      {/* Mode Switcher - Centered */}
      <div className="hidden md:flex glass-panel p-1 rounded-xl gap-1 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <button
          onClick={() => onSetMode('local')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-xs ${mode === 'local'
            ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/25'
            : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Local</span>
        </button>
        <button
          onClick={() => onSetMode('full')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-xs ${mode === 'full'
            ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/25'
            : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>Full</span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-3 h-full">
        {/* Mobile Mode Switcher (visible only on small screens) */}
        <div className="md:hidden flex glass-panel p-1 rounded-lg gap-1 mr-2">
          <button
            onClick={() => onSetMode(mode === 'local' ? 'full' : 'local')}
            className="p-1.5 rounded-lg bg-white/5 text-primary"
          >
            {mode === 'local' ? <Cpu className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
          </button>
        </div>

        {/* Get App button */}
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 text-white rounded-lg transition-all shadow-lg shadow-primary/25 font-semibold text-xs sm:text-sm"
        >
          <Smartphone className="w-4 h-4" />
          <span className="hidden sm:inline">Get App</span>
        </a>

        {/* Credits */}
        {isLoggedIn && credits >= 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">€{credits.toFixed(2)}</span>
          </div>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-text-secondary" />
          )}
        </button>

        {/* History */}
        <button
          onClick={onHistoryClick}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Conversation History"
        >
          <History className="w-5 h-5 text-text-secondary" />
        </button>

        {/* Settings */}
        <button
          onClick={onSettings}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-text-secondary" />
        </button>

        {/* Auth button */}
        {isLoggedIn ? (
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors font-semibold border border-red-500/20 text-xs sm:text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        ) : (
          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed rounded-lg transition-all shadow-lg shadow-primary/25 font-semibold text-white text-xs sm:text-sm"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>{isLoggingIn ? 'Signing in...' : 'Sign In'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
