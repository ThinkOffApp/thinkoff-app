import { Message, ComparisonResponse } from '../types';
import { Copy, Award } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatMessageProps {
  message: Message;
}

// Provider colors matching Android app
const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10B981',    // Green
  anthropic: '#F59E0B', // Orange/Amber
  google: '#3B82F6',    // Blue
  grok: '#8B5CF6',      // Purple (xAI Grok)
  mistral: '#F97316',   // Orange
  meta: '#0866FF',      // Meta Blue
  perplexity: '#20B2AA', // Cyan
  kimi: '#6366F1',      // Indigo
  thinkoff: '#FF00FF',  // Fuchsia
};

const PROVIDER_ICONS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠',
  google: '✨',
  grok: '🚀',
  mistral: '🌬️',
  meta: '🦙',
  perplexity: '🔍',
  kimi: '🌙',
  thinkoff: '💬',
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export default function ChatMessage({ message }: ChatMessageProps) {
  if (message.isUser) {
    return (
      <div className="flex justify-end mb-4 px-2">
        <div className="max-w-[85%] bg-gradient-to-r from-primary to-primary-dark text-white px-5 py-3 rounded-2xl rounded-tr-md shadow-lg shadow-primary/20">
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Attached"
              className="max-h-48 rounded-xl mb-3 border border-white/20"
            />
          )}
          <p className="whitespace-pre-wrap text-base">{message.text}</p>
          <p className="text-xs text-white/60 mt-2 text-right">{message.timestamp}</p>
        </div>
      </div>
    );
  }

  // Comparison message with multiple responses
  if (message.isComparison && message.comparisonResponses) {
    return (
      <div className="mb-6 px-2">
        {/* Streaming Judge Text (while judging) */}
        {message.streamingJudgeText && !message.evaluation && (
          <div className="bg-gradient-to-r from-primary/10 to-primary-dark/10 border border-primary/30 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-white">AI Judge</h3>
                <p className="text-xs text-primary">Evaluating responses...</p>
              </div>
            </div>
            <MarkdownRenderer
              content={message.streamingJudgeText}
              className="text-text-primary"
            />
          </div>
        )}

        {/* Evaluation Summary */}
        {message.evaluation && (
          <div className="bg-gradient-to-r from-primary/10 to-primary-dark/10 border border-primary/30 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-white">AI Judge Verdict</h3>
                <p className="text-xs text-primary">Evaluation complete</p>
              </div>
            </div>
            <MarkdownRenderer
              content={message.evaluation.reasoning}
              className="text-text-primary"
            />
          </div>
        )}

        {/* Response Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {message.comparisonResponses
            .sort((a, b) => (a.rank || 999) - (b.rank || 999))
            .map((response, idx) => (
              <ResponseCard
                key={`${response.provider}-${idx}`}
                response={response}
                evaluation={message.evaluation?.rankings.find(
                  r => r.provider === response.provider
                )}
              />
            ))}
        </div>
      </div>
    );
  }

  // Regular AI message
  return (
    <div className="flex justify-start mb-4">
      <div className="message-bubble message-ai max-w-[80%]">
        <MarkdownRenderer content={message.text} />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-text-secondary">{message.timestamp}</p>
          <button
            onClick={() => copyToClipboard(message.text)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Copy className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ResponseCardProps {
  response: ComparisonResponse;
  evaluation?: { rank: number; score: number; reasoning: string };
}

function ResponseCard({ response, evaluation }: ResponseCardProps) {
  const providerColor = PROVIDER_COLORS[response.provider.toLowerCase()] || '#666';
  const providerIcon = PROVIDER_ICONS[response.provider.toLowerCase()] || '🤖';
  const rank = evaluation?.rank || response.rank || 0;
  const score = evaluation?.score || response.score || 0;

  // Winner gets special styling
  const isWinner = rank === 1;

  return (
    <div
      className={`rounded-2xl p-5 transition-all ${isWinner
        ? 'bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10'
        : 'bg-bg-card/50 backdrop-blur border border-white/10'
        }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Rank badge */}
          {rank > 0 && (
            <span className={`px-3 py-1 rounded-xl text-xs font-bold ${rank === 1 ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black' :
              rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-black' :
                rank === 3 ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white' :
                  'bg-bg-card text-text-secondary'
              }`}>
              {rank === 1 ? '🥇 1st' : rank === 2 ? '🥈 2nd' : rank === 3 ? '🥉 3rd' : `#${rank}`}
            </span>
          )}
          {/* Provider badge */}
          <span
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold"
            style={{ backgroundColor: `${providerColor}20`, color: providerColor }}
          >
            {providerIcon} {response.provider.charAt(0).toUpperCase() + response.provider.slice(1)}
          </span>
        </div>
        {/* Score */}
        {score > 0 && (
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-bold ${isWinner ? 'text-amber-400' : 'text-primary'}`}>
              {score.toFixed(1)}
            </span>
            <span className="text-xs text-text-secondary">/10</span>
          </div>
        )}
      </div>

      {/* Model name */}
      <p className="text-xs text-text-secondary mb-3 font-mono">{response.model}</p>

      {/* Response text */}
      <div className="text-sm text-text-primary mb-3 leading-relaxed">
        {response.response ? (
          <MarkdownRenderer content={response.response} />
        ) : (
          <div className="flex items-center gap-3 text-text-secondary py-4">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>Generating response...</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <span className="text-xs text-text-secondary">{response.timestamp}</span>
        <div className="flex items-center gap-3">
          {response.responseTimeSeconds && (
            <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded-lg">
              ⚡ {response.responseTimeSeconds.toFixed(1)}s
            </span>
          )}
          <button
            onClick={() => copyToClipboard(response.response)}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            title="Copy response"
          >
            <Copy className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Evaluation reasoning for non-winners */}
      {evaluation?.reasoning && rank > 1 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <MarkdownRenderer content={evaluation.reasoning} className="text-xs text-text-secondary italic" />
        </div>
      )}
    </div>
  );
}
