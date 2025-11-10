import React, { useState } from 'react';

interface SetupProps {
  onComplete: () => void;
}

export const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'provider' | 'credentials'>('welcome');
  const [provider, setProvider] = useState<'gemini' | 'ollama'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProviderSelect = (selectedProvider: 'gemini' | 'ollama') => {
    setProvider(selectedProvider);
    setStep('credentials');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (provider === 'gemini') {
        if (!apiKey.trim()) {
          setError('Please enter your Gemini API key');
          setIsLoading(false);
          return;
        }
        
        // Validate credentials (will try multiple models automatically)
        const validationResult = await window.electronAPI.invoke('config:validate-credentials', 'gemini', {
          apiKey: apiKey.trim()
        });
        
        if (!validationResult.success) {
          setError(validationResult.error || 'Failed to validate API key');
          setIsLoading(false);
          return;
        }

        // Store API key securely
        const storeResult = await window.electronAPI.invoke('config:set-api-key', 'gemini', apiKey.trim());
        if (!storeResult.success) {
          setError('Failed to store API key securely');
          setIsLoading(false);
          return;
        }

        // Update config with the working model
        const modelToUse = validationResult.modelUsed || 'gemini-1.5-flash';
        await window.electronAPI.invoke('config:update', {
          aiProvider: 'gemini',
          gemini: { model: modelToUse }
        });

        // Mark setup as complete
        await window.electronAPI.invoke('config:mark-setup-complete');
        
        onComplete();
      } else {
        // Validate Ollama connection
        const validationResult = await window.electronAPI.invoke('config:validate-credentials', 'ollama', {
          url: ollamaUrl.trim(),
          model: ollamaModel.trim() || undefined
        });
        
        if (!validationResult.success) {
          setError(validationResult.error || 'Failed to connect to Ollama');
          setIsLoading(false);
          return;
        }

        // Update config
        await window.electronAPI.invoke('config:update', {
          aiProvider: 'ollama',
          ollama: {
            endpoint: ollamaUrl.trim(),
            model: ollamaModel.trim() || 'llama3.2'
          }
        });

        // Mark setup as complete
        await window.electronAPI.invoke('config:mark-setup-complete');
        
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  // Welcome step
  if (step === 'welcome') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: 'transparent' }}>
        <div className="w-full max-w-md liquid-glass rounded-xl">
          {/* Minimal draggable header */}
          <div className="draggable-area h-8 w-full rounded-t-xl flex items-center justify-end px-3">
            <button
              onClick={() => window.electronAPI.quitApp()}
              className="text-gray-400 hover:text-white transition-colors text-xs"
            >
              ✕
            </button>
          </div>
          <div className="p-8 pt-4">
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-bold text-white mb-3">Welcome to Velar</h1>
            <p className="text-gray-400 text-lg">Your AI-powered meeting Assistant</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 text-sm">✓</span>
              </div>
              <div>
                <h3 className="text-white font-medium">Instant Analysis</h3>
                <p className="text-gray-400 text-sm">Capture screenshots and get AI-powered insights</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 text-sm">✓</span>
              </div>
              <div>
                <h3 className="text-white font-medium">Privacy First</h3>
                <p className="text-gray-400 text-sm">Your data stays secure with encrypted storage</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 text-sm">✓</span>
              </div>
              <div>
                <h3 className="text-white font-medium">Flexible AI</h3>
                <p className="text-gray-400 text-sm">Choose between Gemini or local Ollama</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('provider')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
        </div>
      </div>
    );
  }

  // Provider selection step
  if (step === 'provider') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: 'transparent' }}>
        <div className="w-full max-w-md liquid-glass rounded-xl">
          {/* Minimal draggable header */}
          <div className="draggable-area h-8 w-full rounded-t-xl flex items-center justify-end px-3">
            <button
              onClick={() => window.electronAPI.quitApp()}
              className="text-gray-400 hover:text-white transition-colors text-xs"
            >
              ✕
            </button>
          </div>
          <div className="p-8 pt-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Choose AI Provider</h2>
            <p className="text-gray-400">Select how you want to power Velar's AI capabilities</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleProviderSelect('gemini')}
              className="w-full p-6 rounded-lg border-2 border-gray-600 bg-gray-700/50 hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400">Google Gemini</h3>
                  <p className="text-gray-400 text-sm mb-3">Cloud-based AI with powerful multimodal capabilities</p>
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="text-green-400 mr-2">✓</span> Best performance
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="text-green-400 mr-2">✓</span> Image & audio analysis
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="text-yellow-400 mr-2">!</span> Requires API key
                    </div>
                  </div>
                </div>
                <div className="text-3xl">🚀</div>
              </div>
            </button>

            <button
              onClick={() => handleProviderSelect('ollama')}
              className="w-full p-6 rounded-lg border-2 border-gray-600 bg-gray-700/50 hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400">Ollama (Local)</h3>
                  <p className="text-gray-400 text-sm mb-3">Run AI models locally on your machine</p>
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="text-green-400 mr-2">✓</span> Complete privacy
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="text-green-400 mr-2">✓</span> No API costs
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="text-yellow-400 mr-2">!</span> Requires local setup
                    </div>
                  </div>
                </div>
                <div className="text-3xl">🏠</div>
              </div>
            </button>
          </div>

          <button
            onClick={() => setStep('welcome')}
            className="mt-6 w-full py-2 px-4 text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>
        </div>
      </div>
    );
  }

  // Credentials step
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: 'transparent' }}>
      <div className="w-full max-w-md liquid-glass rounded-xl">
        {/* Minimal draggable header */}
        <div className="draggable-area h-8 w-full rounded-t-xl flex items-center justify-end px-3">
          <button
            onClick={() => window.electronAPI.quitApp()}
            className="text-gray-400 hover:text-white transition-colors text-xs"
          >
            ✕
          </button>
        </div>
        <div className="p-8 pt-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {provider === 'gemini' ? 'Configure Gemini' : 'Configure Ollama'}
          </h2>
          <p className="text-gray-400">
            {provider === 'gemini' 
              ? 'Enter your API key to get started' 
              : 'Connect to your local Ollama instance'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Gemini Configuration */}
          {provider === 'gemini' && (
            <div className="space-y-2">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300">
                Gemini API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 inline-block mt-1"
              >
                Get your API key from Google AI Studio →
              </a>
            </div>
          )}

          {/* Ollama Configuration */}
          {provider === 'ollama' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="ollamaUrl" className="block text-sm font-medium text-gray-300">
                  Ollama URL
                </label>
                <input
                  type="text"
                  id="ollamaUrl"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="ollamaModel" className="block text-sm font-medium text-gray-300">
                  Model Name (optional)
                </label>
                <input
                  type="text"
                  id="ollamaModel"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="Leave empty for auto-detection"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-300">
                  Make sure Ollama is running locally. <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Download Ollama →</a>
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setStep('provider')}
              disabled={isLoading}
              className="px-4 py-3 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? 'Validating...' : 'Complete Setup'}
            </button>
          </div>
        </form>

        {/* Tips */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Quick Tips:</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Cmd+Shift+Space</kbd> to toggle window</li>
            <li>• Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Cmd+H</kbd> to take screenshots</li>
            <li>• Use Incognito mode to hide from screen recording</li>
          </ul>
        </div>
        </div>
      </div>
    </div>
  );
};
