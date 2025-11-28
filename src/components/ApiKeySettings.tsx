import { useState } from 'react';
import { Key, Eye, EyeOff, Save, X } from 'lucide-react';
import { ApiKeys } from '../services/directApi';
import { PROVIDERS } from '../types';

interface ApiKeySettingsProps {
  apiKeys: ApiKeys;
  onSave: (keys: ApiKeys) => void;
  onClose: () => void;
}

export default function ApiKeySettings({ apiKeys, onSave, onClose }: ApiKeySettingsProps) {
  const [keys, setKeys] = useState<ApiKeys>(apiKeys);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('thinkoff_api_keys', JSON.stringify(keys));
    onSave(keys);
    onClose();
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#16213e] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">API Keys (Local Mode)</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-400">
            Enter your API keys to use Local Mode. Keys are stored in your browser only and never sent to our servers.
          </p>

          {PROVIDERS.map((provider) => (
            <div key={provider.id} className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <span>{provider.icon}</span>
                <span>{provider.name}</span>
              </label>
              <div className="relative">
                <input
                  type={showKeys[provider.id] ? 'text' : 'password'}
                  value={keys[provider.id as keyof ApiKeys] || ''}
                  onChange={(e) => setKeys({ ...keys, [provider.id]: e.target.value })}
                  placeholder={`${provider.name} API Key`}
                  className="w-full bg-[#0f3460] text-white placeholder-gray-500 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey(provider.id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showKeys[provider.id] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-4">
              Get your API keys from:
              <br />• OpenAI: platform.openai.com
              <br />• Anthropic: console.anthropic.com
              <br />• Google: aistudio.google.com
              <br />• xAI (Grok): x.ai/api
              <br />• Mistral: console.mistral.ai
            </p>
            
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-dark rounded-lg transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              Save Keys
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Load API keys from localStorage
export function loadApiKeys(): ApiKeys {
  try {
    const saved = localStorage.getItem('thinkoff_api_keys');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}
