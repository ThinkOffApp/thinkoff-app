import { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import ProviderSelector, { JudgeMode } from './components/ProviderSelector';
import ChatMessage from './components/ChatMessage';
import ChatInput, { ImageAttachment } from './components/ChatInput';
import ApiKeySettings, { loadApiKeys } from './components/ApiKeySettings';
import SyncPrompt from './components/SyncPrompt';
import DirectChat from './components/DirectChat';
import { Message, ComparisonResponse } from './types';
import { streamComparison, getSyncPreference, updateSyncPreference, initSession } from './services/api';
import { ApiKeys, callProvider, runLocalJudge, DirectCallResult } from './services/directApi';
import { Loader2, Shield, Zap, Trophy, MessageSquare } from 'lucide-react';
import { signInWithGoogle, signOutUser, onAuthChange, getIdToken, User } from './services/firebase';

type AppMode = 'local' | 'full';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [credits, setCredits] = useState(0);
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['openai', 'anthropic', 'google', 'grok']);
  const [judgeProvider, setJudgeProvider] = useState<string>('mistral');
  const [judgeMode, setJudgeMode] = useState<JudgeMode>('single');
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeys>(loadApiKeys());
  const [mode, setMode] = useState<AppMode>('full');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Always dark by default now
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [themeColor, setThemeColor] = useState<string>('fuchsia');
  const heroRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Theme Colors Configuration
  // Theme Colors Configuration (from Color.kt + Accents)
  const THEME_COLORS = {
    fuchsia: { primary: '#FF00FF', dark: '#C71585', gradient: 'linear-gradient(135deg, #FF00FF 0%, #C71585 100%)' },
    hotpink: { primary: '#FF69B4', dark: '#C71585', gradient: 'linear-gradient(135deg, #FF69B4 0%, #C71585 100%)' },
    magenta: { primary: '#FF00CC', dark: '#C71585', gradient: 'linear-gradient(135deg, #FF00CC 0%, #C71585 100%)' },
    lightfuchsia: { primary: '#FF77FF', dark: '#FF00FF', gradient: 'linear-gradient(135deg, #FF77FF 0%, #FF00FF 100%)' },
    deepfuchsia: { primary: '#C71585', dark: '#8B008B', gradient: 'linear-gradient(135deg, #C71585 0%, #800080 100%)' },
    lime: { primary: '#32CD32', dark: '#228B22', gradient: 'linear-gradient(135deg, #32CD32 0%, #228B22 100%)' },
    yellow: { primary: '#FFD700', dark: '#DAA520', gradient: 'linear-gradient(135deg, #FFD700 0%, #DAA520 100%)' },
    orange: { primary: '#FFA500', dark: '#FF8C00', gradient: 'linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)' },
  };

  // Apply theme colors
  useEffect(() => {
    const colors = THEME_COLORS[themeColor as keyof typeof THEME_COLORS];
    if (colors) {
      document.documentElement.style.setProperty('--primary', colors.primary);
      document.documentElement.style.setProperty('--primary-dark', colors.dark);
      document.documentElement.style.setProperty('--accent-gradient', colors.gradient);
    }
  }, [themeColor]);

  // Handle scroll events to detect when user scrolls up
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // User is "at bottom" if within 150px of the bottom
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    setUserScrolledUp(!isAtBottom);
  };

  // Scroll to bottom when messages change, but only if user hasn't scrolled up
  useEffect(() => {
    if (!userScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, userScrolledUp]);

  // Reset scroll state when user sends a new message (detected by loading state change to true)
  useEffect(() => {
    if (isLoading) {
      setUserScrolledUp(false);
    }
  }, [isLoading]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroVisible(entry.isIntersecting);
      },
      { threshold: 0.5 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, []);

  const handleToggleDarkMode = () => {
    // We enforce dark mode now, but keeping toggle for legacy support if needed
    setIsDarkMode(prev => !prev);
  };

  const toggleProvider = (providerId: string) => {
    // If clicking @ThinkOff, open the chat instead of toggling
    if (providerId === 'thinkoff') {
      if (!isLoggedIn) {
        alert('Please sign in to use @ThinkOff chat');
        return;
      }
      setChatRecipient('thinkoff');
      setShowDirectChat(true);
      return;
    }

    setSelectedProviders(prev =>
      prev.includes(providerId)
        ? prev.filter(p => p !== providerId)
        : [...prev, providerId]
    );
  };

  // Get available providers (those with API keys in local mode)
  const getAvailableProviders = () => {
    if (mode === 'full') return selectedProviders;
    return selectedProviders.filter(p => apiKeys[p as keyof ApiKeys]);
  };

  const handleSend = async (text: string, image?: ImageAttachment) => {
    const availableProviders = getAvailableProviders();

    if (availableProviders.length < 2) {
      if (mode === 'local') {
        setShowApiKeys(true);
        return;
      }
      alert('Please select at least 2 providers to compare');
      return;
    }

    // Check credits in Full Mode
    if (mode === 'full' && credits <= 0) {
      alert('You have no credits remaining. Please switch to Local Mode and use your own API keys, or sign in to get more credits.');
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text || (image ? 'What is in this image?' : ''),
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
      imageUrl: image?.preview,
      imageBase64: image?.base64,
      imageMimeType: image?.file.type,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create placeholder AI message
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      text: '',
      isUser: false,
      timestamp: new Date().toLocaleTimeString(),
      isComparison: true,
      comparisonResponses: availableProviders.map(p => ({
        provider: p,
        model: '',
        response: '',
        timestamp: new Date().toLocaleTimeString(),
      })),
    };
    setMessages(prev => [...prev, aiMessage]);

    const messageText = text || (image ? 'What is in this image?' : '');
    const imageData = image ? { base64: image.base64, mimeType: image.file.type } : undefined;

    if (mode === 'local') {
      // LOCAL MODE: Direct API calls (image not supported in local mode yet)
      await handleLocalMode(messageText, availableProviders, aiMessageId);
    } else {
      // FULL MODE: Backend streaming
      await handleFullMode(messageText, availableProviders, aiMessageId, imageData);
    }
  };

  const handleLocalMode = async (text: string, providers: string[], aiMessageId: string) => {
    const results: DirectCallResult[] = [];

    // Safety timeout
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setMessages(prev => prev.map(m =>
          m.id === aiMessageId
            ? { ...m, text: '⚠️ Request timed out. Please check your API keys and connection.' }
            : m
        ));
      }
    }, 30000); // 30s timeout

    try {
      // Call all providers in parallel
      const promises = providers.map(async (provider) => {
        const key = apiKeys[provider as keyof ApiKeys];
        if (!key) return null;

        try {
          const result = await callProvider(provider, text, key);
          results.push(result);

          // Update UI with this response
          setMessages(prev => prev.map(m =>
            m.id === aiMessageId
              ? {
                ...m,
                comparisonResponses: results.map(r => ({
                  provider: r.provider,
                  model: r.model,
                  response: r.response,
                  timestamp: new Date().toLocaleTimeString(),
                  responseTimeSeconds: r.responseTime,
                })),
              }
              : m
          ));

          return result;
        } catch (error) {
          console.error(`${provider} error:`, error);
          return null;
        }
      });

      await Promise.all(promises);
      clearTimeout(timeoutId);

      if (results.length === 0) {
        setMessages(prev => prev.map(m =>
          m.id === aiMessageId
            ? { ...m, text: '⚠️ No responses received. Please check your API keys.' }
            : m
        ));
        setIsLoading(false);
        return;
      }

      // Run local judge
      if (results.length >= 2) {
        try {
          const evaluation = await runLocalJudge(results, text, apiKeys, undefined, judgeProvider);

          setMessages(prev => prev.map(m =>
            m.id === aiMessageId
              ? {
                ...m,
                evaluation: {
                  winner: evaluation.winner,
                  reasoning: evaluation.reasoning,
                  rankings: evaluation.rankings.map(r => ({
                    ...r,
                    model: results.find(res => res.provider === r.provider)?.model || '',
                    reasoning: '',
                  })),
                },
                comparisonResponses: results.map(r => ({
                  provider: r.provider,
                  model: r.model,
                  response: r.response,
                  timestamp: new Date().toLocaleTimeString(),
                  responseTimeSeconds: r.responseTime,
                  rank: evaluation.rankings.find(er => er.provider === r.provider)?.rank,
                  score: evaluation.rankings.find(er => er.provider === r.provider)?.score,
                })),
              }
              : m
          ));
        } catch (error) {
          console.error('Judge error:', error);
          // Don't fail the whole request if judge fails, just show responses
        }
      }
    } catch (error) {
      console.error('Local mode error:', error);
    } finally {
      setIsLoading(false);
      clearTimeout(timeoutId);
    }
  };

  const handleFullMode = async (text: string, providers: string[], aiMessageId: string, imageData?: { base64: string; mimeType: string }) => {
    // Full mode requires authentication
    if (!isLoggedIn || !user) {
      setMessages(prev => prev.map(m =>
        m.id === aiMessageId
          ? { ...m, text: '⚠️ Full Mode requires sign-in. Please use Local Mode with your own API keys, or sign in to use credits.' }
          : m
      ));
      setIsLoading(false);
      return;
    }

    // Get Firebase auth token
    const authToken = await getIdToken();
    if (!authToken) {
      setMessages(prev => prev.map(m =>
        m.id === aiMessageId
          ? { ...m, text: '⚠️ Authentication error. Please sign in again.' }
          : m
      ));
      setIsLoading(false);
      return;
    }

    const responses: Record<string, ComparisonResponse> = {};

    // Safety timeout
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setMessages(prev => prev.map(m =>
          m.id === aiMessageId
            ? { ...m, text: '⚠️ Request timed out. The server might be busy.' }
            : m
        ));
      }
    }, 45000); // 45s timeout for full mode

    try {
      await streamComparison(
        user.uid,
        authToken,
        text,
        providers,
        {
          onToken: (provider, token) => {
            if (!responses[provider]) {
              responses[provider] = {
                provider,
                model: '',
                response: '',
                timestamp: new Date().toLocaleTimeString(),
              };
            }
            responses[provider].response += token;

            setMessages(prev => prev.map(m =>
              m.id === aiMessageId
                ? { ...m, comparisonResponses: Object.values(responses) }
                : m
            ));
          },
          onResponse: (provider, model, response) => {
            responses[provider] = {
              provider,
              model,
              response,
              timestamp: new Date().toLocaleTimeString(),
            };

            setMessages(prev => prev.map(m =>
              m.id === aiMessageId
                ? { ...m, comparisonResponses: Object.values(responses) }
                : m
            ));
          },
          onEvaluation: (evaluation) => {
            setLoadingStatus(''); // Clear status when evaluation is received
            setMessages(prev => prev.map(m =>
              m.id === aiMessageId
                ? {
                  ...m,
                  evaluation: {
                    winner: evaluation.winner,
                    reasoning: evaluation.reasoning,
                    rankings: evaluation.rankings.map(r => ({
                      ...r,
                      model: responses[r.provider]?.model || '',
                    })),
                  },
                  comparisonResponses: Object.values(responses).map(resp => ({
                    ...resp,
                    rank: evaluation.rankings.find(r => r.provider === resp.provider)?.rank,
                    score: evaluation.rankings.find(r => r.provider === resp.provider)?.score,
                  })),
                }
                : m
            ));
            setCredits(prev => Math.max(0, prev - 1));
          },
          onStatus: (message) => {
            setLoadingStatus(message);
          },
          onJudgeToken: (token) => {
            // Update the message with streaming judge text
            setMessages(prev => prev.map(m =>
              m.id === aiMessageId
                ? {
                  ...m,
                  streamingJudgeText: (m.streamingJudgeText || '') + token,
                }
                : m
            ));
          },
          onError: (error) => {
            console.error('Stream error:', error);
            setMessages(prev => prev.map(m =>
              m.id === aiMessageId
                ? { ...m, text: `Error: ${error}` }
                : m
            ));
            setIsLoading(false);
            setLoadingStatus('');
            clearTimeout(timeoutId);
          },
          onComplete: () => {
            setIsLoading(false);
            setLoadingStatus('');
            clearTimeout(timeoutId);
          },
        },
        true, // enableJudge
        judgeProvider, // pass the selected judge provider
        imageData // pass image data if present
      );
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
      clearTimeout(timeoutId);
    }
  };

  const availableCount = getAvailableProviders().length;

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showSyncPrompt, setShowSyncPrompt] = useState(false);
  const [syncChecked, setSyncChecked] = useState(false);
  const [showDirectChat, setShowDirectChat] = useState(false);
  const [chatRecipient, setChatRecipient] = useState('thinkoff');

  // Set up Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoggedIn(!!firebaseUser);
      if (!firebaseUser) {
        setMode('local');
        setSyncChecked(false); // Reset sync check when logged out
        setCredits(0); // Reset credits when logged out
      } else {
        // Fetch real credits for existing session
        try {
          const authToken = await getIdToken();
          if (authToken) {
            const session = await initSession(firebaseUser.uid, authToken);
            setCredits(session.credits);
          }
        } catch (e) {
          console.error('Failed to fetch credits on auth change:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Check sync preference when user logs in
  useEffect(() => {
    const checkSyncPreference = async () => {
      if (user && !syncChecked) {
        const authToken = await getIdToken();
        if (authToken) {
          const syncPref = await getSyncPreference(user.uid, authToken);
          setSyncChecked(true);
          // If syncEnabled is null/undefined, user hasn't been asked yet
          if (syncPref === null) {
            setShowSyncPrompt(true);
          }
        }
      }
    };
    checkSyncPreference();
  }, [user, syncChecked]);

  const handleEnableSync = async () => {
    if (user) {
      const authToken = await getIdToken();
      if (authToken) {
        await updateSyncPreference(user.uid, authToken, true);
      }
    }
    setShowSyncPrompt(false);
  };

  const handleSkipSync = async () => {
    if (user) {
      const authToken = await getIdToken();
      if (authToken) {
        // Save false to indicate user has been asked but declined
        await updateSyncPreference(user.uid, authToken, false);
      }
    }
    setShowSyncPrompt(false);
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const firebaseUser = await signInWithGoogle();
      setUser(firebaseUser);
      setIsLoggedIn(true);

      // Fetch real credits from backend
      const authToken = await getIdToken();
      if (authToken && firebaseUser) {
        try {
          const session = await initSession(firebaseUser.uid, authToken);
          setCredits(session.credits);
        } catch (e) {
          console.error('Failed to fetch credits:', e);
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setUser(null);
      setIsLoggedIn(false);
      setMode('local');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen min-h-screen bg-bg-dark p-4 sm:p-6 lg:p-8 font-sans text-text-primary">
      <div className="w-full max-w-[1800px] flex flex-col h-full mx-auto">

        {/* Header */}
        <Header
          credits={mode === 'full' ? credits : -1}
          isLoggedIn={isLoggedIn}
          isLoggingIn={isLoggingIn}
          isDarkMode={isDarkMode}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onSettings={() => setShowSettings(!showSettings)}
          onToggleDarkMode={handleToggleDarkMode}
          onHistoryClick={() => alert('Conversation history coming soon! Your conversations are automatically synced when signed in.')}
          showActiveIcon={!isHeroVisible}
          mode={mode}
          onSetMode={setMode}
          themeColor={themeColor}
          onSetThemeColor={setThemeColor}
        />

        {mode === 'local' && (
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setShowApiKeys(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium border border-primary/20 text-sm"
            >
              <Shield className="w-4 h-4" />
              <span>Manage API Keys ({availableCount})</span>
            </button>
          </div>
        )}

        {showSettings && (
          <ProviderSelector
            selectedProviders={selectedProviders}
            onToggle={toggleProvider}
            judgeProvider={judgeProvider}
            onSetJudge={setJudgeProvider}
            judgeMode={judgeMode}
            onSetJudgeMode={setJudgeMode}
          />
        )}

        {/* API Keys Modal */}
        {showApiKeys && (
          <ApiKeySettings
            apiKeys={apiKeys}
            onSave={setApiKeys}
            onClose={() => setShowApiKeys(false)}
          />
        )}

        {/* Sync Prompt Modal */}
        {showSyncPrompt && (
          <SyncPrompt
            onEnable={handleEnableSync}
            onSkip={handleSkipSync}
          />
        )}

        {/* Direct Chat Modal (@ThinkOff) */}
        {showDirectChat && user && (
          <DirectChat
            userId={user.uid}
            isOpen={showDirectChat}
            onClose={() => setShowDirectChat(false)}
            initialRecipient={chatRecipient}
          />
        )}

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-4 custom-scrollbar"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              {/* Welcome Hero */}
              <div ref={heroRef} className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center mb-8 p-2">
                <img src="/app-icon.png" alt="ThinkOff Logo" className="w-full h-full object-contain animate-neon-pulse" />
              </div>

              <h2 className="text-3xl font-bold text-white mb-3">Welcome to ThinkOff</h2>
              <p className="text-text-secondary text-lg max-w-md mb-8">
                Compare AI models side-by-side and let an AI judge pick the winner
              </p>

              {/* Features grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl">
                <div className="glass-card p-5 rounded-2xl text-left hover:border-primary/30 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-white mb-1">Instant Comparison</h3>
                  <p className="text-sm text-text-secondary">Run multiple models in parallel and see results side-by-side.</p>
                </div>

                <div className="glass-card p-5 rounded-2xl text-left hover:border-primary/30 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-white mb-1">AI Judge</h3>
                  <p className="text-sm text-text-secondary">An expert AI evaluates all responses and picks the winner.</p>
                </div>

                <div className="glass-card p-5 rounded-2xl text-left hover:border-primary/30 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-white mb-1">Private & Secure</h3>
                  <p className="text-sm text-text-secondary">Local Mode keeps your keys and data on your device.</p>
                </div>

                <div className="glass-card p-5 rounded-2xl text-left hover:border-primary/30 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-white mb-1">Panel of Judges</h3>
                  <p className="text-sm text-text-secondary">Get consensus rankings from multiple AI perspectives.</p>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex items-center justify-center gap-3 text-primary p-8 animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-medium">
                {loadingStatus || (mode === 'local' ? 'Calling providers directly...' : 'AI providers are responding...')}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          disabled={mode === 'local' ? availableCount < 2 : selectedProviders.length < 2}
        />
      </div>
    </div>
  );
}

export default App;
