import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, MessageCircle, AtSign, RefreshCw } from 'lucide-react';
import { sendThinkOffMessage, sendDirectMessage, getMessages, checkNickname, registerNickname, getNickname } from '../services/api';
import { getIdToken } from '../services/firebase';

interface DirectChatProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  initialRecipient?: string; // e.g., "thinkoff" or another username
}

interface LocalMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  fromNickname?: string;
  model?: string;
}

export default function DirectChat({ userId, isOpen, onClose, initialRecipient = 'thinkoff' }: DirectChatProps) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const recipient = initialRecipient; // Currently fixed to initial recipient
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [showNicknameSetup, setShowNicknameSetup] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch user's nickname and messages on mount
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserNickname();
      fetchMessages();
    }
  }, [isOpen, userId]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    if (!isOpen || !userId) return;

    const interval = setInterval(() => {
      fetchMessages(true); // silent fetch
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen, userId]);

  const fetchUserNickname = async () => {
    const authToken = await getIdToken();
    if (!authToken) return;

    const nickname = await getNickname(userId, authToken);
    setUserNickname(nickname);
  };

  const fetchMessages = async (silent = false) => {
    if (!silent) setIsFetchingMessages(true);

    try {
      const authToken = await getIdToken();
      if (!authToken) return;

      const serverMessages = await getMessages(userId, authToken, 50);

      // Filter messages for current conversation (with @thinkoff or the selected recipient)
      const relevantMessages = serverMessages.filter(msg =>
        msg.fromNickname?.toLowerCase() === recipient.toLowerCase() ||
        msg.toNickname?.toLowerCase() === recipient.toLowerCase()
      );

      // Convert to local format
      const localMessages: LocalMessage[] = relevantMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.fromUserId === userId,
        timestamp: new Date(msg.timestamp),
        fromNickname: msg.fromNickname,
        model: msg.model,
      }));

      // Sort by timestamp
      localMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      setMessages(localMessages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      if (!silent) setIsFetchingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Add user message immediately
    const userMessage: LocalMessage = {
      id: `local-${Date.now()}`,
      content: messageText,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const authToken = await getIdToken();
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      if (recipient.toLowerCase() === 'thinkoff') {
        // Send to @thinkoff support
        const result = await sendThinkOffMessage(userId, authToken, messageText);

        if (result.success && result.aiResponse) {
          // Add AI response
          const aiMessage: LocalMessage = {
            id: result.messageId || `ai-${Date.now()}`,
            content: result.aiResponse,
            isUser: false,
            timestamp: new Date(),
            fromNickname: 'thinkoff',
            model: result.model,
          };
          setMessages(prev => [...prev, aiMessage]);
        } else if (!result.success) {
          // Show error
          const errorMessage: LocalMessage = {
            id: `error-${Date.now()}`,
            content: `Error: ${result.error || 'Failed to send message'}`,
            isUser: false,
            timestamp: new Date(),
            fromNickname: 'system',
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } else {
        // Send to another user
        const result = await sendDirectMessage(userId, authToken, recipient, messageText);

        if (!result.success) {
          const errorMessage: LocalMessage = {
            id: `error-${Date.now()}`,
            content: `Error: ${result.error || 'Failed to send message'}`,
            isUser: false,
            timestamp: new Date(),
            fromNickname: 'system',
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: LocalMessage = {
        id: `error-${Date.now()}`,
        content: 'Failed to send message. Please try again.',
        isUser: false,
        timestamp: new Date(),
        fromNickname: 'system',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNicknameCheck = async () => {
    if (!nicknameInput.trim()) return;

    setIsCheckingNickname(true);
    setNicknameError('');

    // Validate format
    const nicknameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
    if (!nicknameRegex.test(nicknameInput)) {
      setNicknameError('Nickname must be 3-20 characters, start with a letter, and contain only letters, numbers, and underscores');
      setIsCheckingNickname(false);
      return;
    }

    const result = await checkNickname(nicknameInput);
    if (!result.available) {
      setNicknameError(result.message || 'Nickname not available');
    }
    setIsCheckingNickname(false);
  };

  const handleNicknameRegister = async () => {
    if (!nicknameInput.trim()) return;

    setIsCheckingNickname(true);
    setNicknameError('');

    try {
      const authToken = await getIdToken();
      if (!authToken) {
        setNicknameError('Not authenticated');
        return;
      }

      const result = await registerNickname(userId, authToken, nicknameInput);
      if (result.success) {
        setUserNickname(nicknameInput);
        setShowNicknameSetup(false);
      } else {
        setNicknameError(result.message || 'Failed to register nickname');
      }
    } catch (error) {
      setNicknameError('Failed to register nickname');
    } finally {
      setIsCheckingNickname(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-[80vh] bg-bg-card border border-white/10 rounded-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              {recipient.toLowerCase() === 'thinkoff' ? (
                <span className="text-xl">💬</span>
              ) : (
                <AtSign className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                @{recipient}
              </h2>
              <p className="text-xs text-text-secondary">
                {recipient.toLowerCase() === 'thinkoff'
                  ? 'ThinkOff Support'
                  : 'Direct Message'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMessages()}
              disabled={isFetchingMessages}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh messages"
            >
              <RefreshCw className={`w-5 h-5 text-text-secondary ${isFetchingMessages ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Nickname Setup Prompt */}
        {!userNickname && !showNicknameSetup && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <AtSign className="w-4 h-4" />
                <span className="text-sm">Set up your @nickname to receive replies</span>
              </div>
              <button
                onClick={() => setShowNicknameSetup(true)}
                className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
              >
                Set Nickname
              </button>
            </div>
          </div>
        )}

        {/* Nickname Setup Form */}
        {showNicknameSetup && (
          <div className="p-4 bg-bg-surface border-b border-white/10">
            <h3 className="text-sm font-bold text-white mb-2">Choose your @nickname</h3>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">@</span>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => {
                    setNicknameInput(e.target.value.toLowerCase());
                    setNicknameError('');
                  }}
                  onBlur={handleNicknameCheck}
                  placeholder="username"
                  className="w-full pl-8 pr-4 py-2 bg-bg-card border border-white/10 rounded-lg text-white placeholder:text-text-secondary focus:outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={handleNicknameRegister}
                disabled={isCheckingNickname || !nicknameInput.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isCheckingNickname ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register'}
              </button>
              <button
                onClick={() => setShowNicknameSetup(false)}
                className="px-3 py-2 text-text-secondary hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
            {nicknameError && (
              <p className="text-red-400 text-sm mt-2">{nicknameError}</p>
            )}
            <p className="text-text-secondary text-xs mt-2">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isFetchingMessages && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-12 h-12 text-text-secondary mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Start a conversation</h3>
              <p className="text-text-secondary text-sm max-w-sm">
                {recipient.toLowerCase() === 'thinkoff'
                  ? 'Ask questions, report issues, or give feedback to the ThinkOff team.'
                  : `Send a message to @${recipient}`}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.isUser
                      ? 'bg-primary text-white rounded-br-md'
                      : msg.fromNickname === 'system'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-bg-surface text-white rounded-bl-md border border-white/10'
                  }`}
                >
                  {!msg.isUser && msg.fromNickname && msg.fromNickname !== 'system' && (
                    <div className="text-xs text-primary font-medium mb-1">
                      @{msg.fromNickname}
                      {msg.model && <span className="text-text-secondary ml-2">({msg.model})</span>}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <div className={`text-xs mt-1 ${msg.isUser ? 'text-white/60' : 'text-text-secondary'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message @${recipient}...`}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-bg-surface border border-white/10 rounded-xl text-white placeholder:text-text-secondary focus:outline-none focus:border-primary disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
