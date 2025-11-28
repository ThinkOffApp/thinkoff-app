import { PROVIDERS } from '../types';
import { Check, User, Users } from 'lucide-react';

export type JudgeMode = 'single' | 'panel';

interface ProviderSelectorProps {
  selectedProviders: string[];
  onToggle: (providerId: string) => void;
  judgeProvider?: string;
  onSetJudge?: (providerId: string) => void;
  judgeMode?: JudgeMode;
  onSetJudgeMode?: (mode: JudgeMode) => void;
}

export default function ProviderSelector({ selectedProviders, onToggle, judgeProvider, onSetJudge, judgeMode = 'single', onSetJudgeMode }: ProviderSelectorProps) {
  return (
    <div className="p-6 bg-bg-surface/95 backdrop-blur border-b border-white/10 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Select AI Providers</h3>
        <p className="text-sm text-text-secondary">Choose at least 2 to compare</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {PROVIDERS.map((provider) => {
          const isSelected = selectedProviders.includes(provider.id);
          return (
            <button
              key={provider.id}
              onClick={() => onToggle(provider.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${isSelected
                ? 'border-primary bg-primary/20 text-white shadow-lg shadow-primary/10'
                : 'border-white/10 bg-bg-card/50 text-text-secondary hover:bg-white/5 hover:border-white/20'
                }`}
            >
              <span className="text-xl">{provider.icon}</span>
              <span className="font-medium">{provider.name}</span>
              {isSelected && (
                <div className="bg-primary rounded-full p-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedProviders.length < 2 && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-amber-400 text-sm">
          <span>⚠️ Select at least 2 providers to start a comparison</span>
        </div>
      )}

      {/* Judge Selection */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">⚖️</span> Select AI Judge
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              {judgeMode === 'single' ? 'Choose the expert model to evaluate responses' : 'All AI models will evaluate each other\'s responses'}
            </p>
          </div>

          {/* Judge Mode Toggle */}
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => onSetJudgeMode?.('single')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-xs ${
                judgeMode === 'single'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Single</span>
            </button>
            <button
              onClick={() => onSetJudgeMode?.('panel')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-xs ${
                judgeMode === 'panel'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Panel</span>
            </button>
          </div>
        </div>

        {judgeMode === 'panel' && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-amber-400 text-sm">
            <span>👥 Panel Mode: All competing AIs will judge each other for a democratic verdict</span>
          </div>
        )}

        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ${judgeMode === 'panel' ? 'opacity-50 pointer-events-none' : ''}`}>
          {PROVIDERS.map((provider) => {
            const isSelected = judgeProvider === provider.id;
            return (
              <button
                key={`judge-${provider.id}`}
                onClick={() => onSetJudge && onSetJudge(provider.id)}
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all border text-left ${isSelected
                  ? 'border-amber-500/50 bg-amber-500/10 text-white shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'border-white/5 bg-white/5 text-text-secondary hover:bg-white/10 hover:border-white/10'
                  }`}
              >
                <span className="text-lg group-hover:scale-110 transition-transform duration-300">{provider.icon}</span>
                <span className={`font-medium text-sm ${isSelected ? 'text-amber-400' : ''}`}>{provider.name}</span>
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
