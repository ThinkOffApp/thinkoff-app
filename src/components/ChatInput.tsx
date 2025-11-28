import React, { useState, useRef } from 'react';
import { Send, Loader2, Image, X } from 'lucide-react';

export interface ImageAttachment {
  file: File;
  preview: string;
  base64: string;
}

interface ChatInputProps {
  onSend: (message: string, image?: ImageAttachment) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || image) && !isLoading && !disabled) {
      onSend(message.trim(), image || undefined);
      setMessage('');
      setImage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);

    // Convert to base64
    const base64 = await fileToBase64(file);

    setImage({ file, preview, base64 });

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/xxx;base64, prefix to get just the base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const removeImage = () => {
    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
    }
    setImage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 bg-bg-surface/50 backdrop-blur-md border-t border-white/5">
      {/* Image Preview */}
      {image && (
        <div className="mb-4 relative inline-block">
          <img
            src={image.preview}
            alt="Attachment preview"
            className="max-h-32 rounded-xl border border-white/20 shadow-lg"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      <div className="flex gap-4">
        {/* Image Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || disabled}
          className="px-4 py-4 sm:py-5 bg-bg-card/60 hover:bg-bg-card/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl transition-colors border border-white/10 flex items-center justify-center"
          title="Attach image"
        >
          <Image className={`w-6 h-6 ${image ? 'text-primary' : 'text-text-secondary'}`} />
        </button>

        {/* Message Input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={image ? "Add a message about this image..." : "Ask anything..."}
          disabled={isLoading || disabled}
          className="flex-1 bg-bg-card/60 text-text-primary placeholder-text-secondary rounded-2xl px-5 sm:px-6 py-4 sm:py-5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 border border-white/10 backdrop-blur text-base"
          rows={1}
          style={{ minHeight: '60px', maxHeight: '140px' }}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!message.trim() && !image) || isLoading || disabled}
          className="px-6 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed rounded-2xl transition-all flex items-center gap-3 font-semibold text-white shadow-lg shadow-primary/25 disabled:shadow-none text-base"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Send className="w-6 h-6" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
