import React, { useState, useEffect } from 'react';

interface SettingsProps {
  onClose: () => void;
}

interface AppConfig {
  aiProvider: 'gemini' | 'ollama';
  ollama?: {
    endpoint: string;
    model: string;
  };
  gemini?: {
    model: string;
  };
  ui?: {
    theme: 'light' | 'dark' | 'system';
    startMinimized: boolean;
    showInDock: boolean;
  };
  shortcuts?: {
    toggleWindow: string;
    takeScreenshot: string;
  };
  updates?: {
    autoCheck: boolean;
    autoDownload: boolean;
  };
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'appearance' | 'shortcuts' | 'updates'>('ai');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // AI Provider state
  const [provider, setProvider] = useState<'gemini' | 'ollama'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  // UI state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [startMinimized, setStartMinimized] = useState(false);
  const [showInDock, setShowInDock] = useState(false);

  // Shortcuts state
  const [toggleWindowShortcut, setToggleWindowShortcut] = useState('CommandOrControl+Shift+Space');
  const [takeScreenshotShortcut, setTakeScreenshotShortcut] = useState('CommandOrControl+H');

  // Updates state
  const [autoCheck, setAutoCheck] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    loadConfig();
    loadCurrentVersion();
  }, []);

  const loadCurrentVersion = async () => {
    try {
      const result = await window.electronAPI.getAppVersion();
      if (result.success && result.version) {
        setCurrentVersion(result.version);
      }
    } catch (err) {
      console.error('Failed to load app version:', err);
    }
  };

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await window.electronAPI.invoke('config:get');
      if (result.success && result.config) {
        const cfg = result.config;
        setConfig(cfg);

        // Set AI provider state
        setProvider(cfg.aiProvider);
        if (cfg.gemini) {
          setGeminiModel(cfg.gemini.model);
        }
        if (cfg.ollama) {
          setOllamaUrl(cfg.ollama.endpoint);
          setOllamaModel(cfg.ollama.model);
        }

        // Check if Gemini API key exists
        const keyResult = await window.electronAPI.invoke('config:has-api-key', 'gemini');
        if (keyResult.success) {
          setHasGeminiKey(keyResult.hasKey);
          
          // Fetch available models if API key exists
          if (keyResult.hasKey) {
            await fetchModels();
          }
        }

        // Set UI state
        if (cfg.ui) {
          setTheme(cfg.ui.theme);
          setStartMinimized(cfg.ui.startMinimized);
          setShowInDock(cfg.ui.showInDock);
        }

        // Set shortcuts state
        if (cfg.shortcuts) {
          setToggleWindowShortcut(cfg.shortcuts.toggleWindow);
          setTakeScreenshotShortcut(cfg.shortcuts.takeScreenshot);
        }

        // Set updates state
        if (cfg.updates) {
          setAutoCheck(cfg.updates.autoCheck);
          setAutoDownload(cfg.updates.autoDownload);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const fetchModels = async () => {
    try {
      const result = await window.electronAPI.invoke('fetch-gemini-models');
      if (result.success && result.models) {
        // Separate Flash and other models
        const flashModels = result.models
          .filter((m: any) => m.id.toLowerCase().includes('flash'))
          .map((m: any) => ({ id: m.id, name: m.name }));
        
        const otherModels = result.models
          .filter((m: any) => !m.id.toLowerCase().includes('flash'))
          .map((m: any) => ({ id: m.id, name: m.name }));
        
        // Show Flash models first, then all other models (no limit)
        setAvailableModels([...flashModels, ...otherModels]);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      // Set default models as fallback
      setAvailableModels([
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      ]);
    }
  };

  const handleSaveAIProvider = async () => {
    try {
      setIsSaving(true);
      setError(null);

      if (provider === 'gemini') {
        // If API key is provided, save it
        if (geminiApiKey.trim()) {
          const storeResult = await window.electronAPI.invoke('config:set-api-key', 'gemini', geminiApiKey.trim());
          if (!storeResult.success) {
            throw new Error('Failed to store API key');
          }
          setHasGeminiKey(true);
          setGeminiApiKey(''); // Clear the input
        }

        // Update config
        await window.electronAPI.invoke('config:update', {
          aiProvider: 'gemini',
          gemini: { model: geminiModel }
        });

        showSuccess('Gemini configuration saved');
      } else {
        // Update Ollama config
        await window.electronAPI.invoke('config:update', {
          aiProvider: 'ollama',
          ollama: {
            endpoint: ollamaUrl.trim(),
            model: ollamaModel.trim()
          }
        });

        showSuccess('Ollama configuration saved');
      }

      await loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const result = await window.electronAPI.invoke('test-llm-connection');
      if (result.success) {
        showSuccess('Connection successful!');
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGeminiKey = async () => {
    if (!confirm('Are you sure you want to delete your Gemini API key?')) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const result = await window.electronAPI.invoke('config:delete-api-key', 'gemini');
      if (result.success) {
        setHasGeminiKey(false);
        showSuccess('API key deleted');
      } else {
        throw new Error(result.error || 'Failed to delete API key');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUI = async () => {
    try {
      setIsSaving(true);
      setError(null);

      await window.electronAPI.invoke('config:update', {
        ui: {
          theme,
          startMinimized,
          showInDock
        }
      });

      showSuccess('UI settings saved');
      await loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save UI settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveShortcuts = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const updates = {
        shortcuts: {
          toggleWindow: toggleWindowShortcut,
          takeScreenshot: takeScreenshotShortcut
        }
      };

      // Check if restart is required
      const restartCheck = await window.electronAPI.invoke('config:requires-restart', updates);
      
      await window.electronAPI.invoke('config:update', updates);

      if (restartCheck.success && restartCheck.requiresRestart) {
        showSuccess('Shortcuts saved - Please restart Velar to apply changes');
      } else {
        showSuccess('Shortcuts saved');
      }
      
      await loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shortcuts');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUpdates = async () => {
    try {
      setIsSaving(true);
      setError(null);

      await window.electronAPI.invoke('config:update', {
        updates: {
          autoCheck,
          autoDownload
        }
      });

      showSuccess('Update settings saved');
      await loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckForUpdates = async () => {
    try {
      setCheckingForUpdates(true);
      setError(null);
      await window.electronAPI.checkForUpdates(false);
      // The UpdateNotification component will handle showing the result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
    } finally {
      setCheckingForUpdates(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-white">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="w-full liquid-glass rounded-lg">
      {/* Minimal header */}
      <div className="h-8 w-full rounded-t-lg flex items-center justify-between px-3 border-b border-white/5">
        <span className="text-[10px] text-gray-400">Settings</span>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-3">

        {/* Messages */}
        {error && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-[10px] text-green-400">
            {successMessage}
          </div>
        )}

        {/* Tabs - Minimal */}
        <div className="flex space-x-1 mb-3 border-b border-white/5">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'ai'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            AI
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'appearance'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            UI
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'shortcuts'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Keys
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'updates'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Updates
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-3 bg-gray-800/20 border border-white/5 rounded-lg">
          {/* AI Provider Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-3">
              <div>
                <h2 className="text-[11px] font-medium text-white mb-1">AI Provider</h2>
                <p className="text-gray-500 text-[9px]">
                  Choose and configure your AI provider
                </p>
              </div>

              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-medium text-gray-400">Provider</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setProvider('gemini')}
                    className={`flex-1 p-2 rounded border transition-all text-[10px] ${
                      provider === 'gemini'
                        ? 'border-teal-500/50 bg-teal-500/10 text-teal-400'
                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Gemini - Cloud
                  </button>
                  <button
                    onClick={() => setProvider('ollama')}
                    className={`flex-1 p-2 rounded border transition-all text-[10px] ${
                      provider === 'ollama'
                        ? 'border-teal-500/50 bg-teal-500/10 text-teal-400'
                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Ollama - Local
                  </button>
                </div>
              </div>

              {/* Gemini Configuration */}
              {provider === 'gemini' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-medium text-gray-400">
                      API Key {hasGeminiKey && <span className="text-green-400 text-[9px]">(✓)</span>}
                    </label>
                    <div className="flex space-x-1.5">
                      <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder={hasGeminiKey ? 'Enter new key' : 'Enter API key'}
                        className="flex-1 px-2.5 py-1.5 text-[9px] bg-gray-800/50 border border-gray-700 rounded text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50"
                      />
                      <button
                        onClick={async () => {
                          try {
                            setIsSaving(true);
                            await fetchModels();
                            showSuccess('Models refreshed');
                          } catch (err) {
                            setError('Failed to refresh models');
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving || !hasGeminiKey}
                        className="px-2.5 py-1.5 text-[9px] bg-teal-600 hover:bg-teal-700 disabled:bg-gray-700 text-white rounded transition-colors flex items-center justify-center"
                        title="Refresh available models"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      {hasGeminiKey && (
                        <button
                          onClick={handleDeleteGeminiKey}
                          disabled={isSaving}
                          className="px-2.5 py-1.5 text-[9px] bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white rounded transition-colors"
                        >
                          Del
                        </button>
                      )}
                    </div>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:text-blue-300 inline-block"
                    >
                      Get API key →
                    </a>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-300">
                      Model {availableModels.length > 0 && <span className="text-gray-500 text-[10px]">({availableModels.length} available)</span>}
                    </label>
                    <select
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[9px] bg-gray-800/50 border border-gray-700 rounded text-white focus:outline-none focus:border-teal-500/50"
                    >
                      {availableModels.length > 0 ? (
                        availableModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                          <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* Ollama Configuration */}
              {provider === 'ollama' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-300">Ollama URL</label>
                    <input
                      type="text"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full px-3 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-300">Model</label>
                    <input
                      type="text"
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder="llama3.2"
                      className="w-full px-3 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-gray-400">
                      Ollama must be running. <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Download →</a>
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isSaving}
                  className="px-2.5 py-1.5 text-[9px] bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 text-white rounded transition-colors"
                >
                  Test
                </button>
                <button
                  onClick={handleSaveAIProvider}
                  disabled={isSaving}
                  className="flex-1 py-1.5 px-3 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white mb-2">Appearance</h2>
                <p className="text-gray-400 text-xs mb-3">
                  Customize how Velar looks
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-300">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                  className="w-full px-3 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={startMinimized}
                    onChange={(e) => setStartMinimized(e.target.checked)}
                    className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-white text-xs font-medium">Start Minimized</div>
                    <div className="text-gray-400 text-[10px]">Launch in background</div>
                  </div>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInDock}
                    onChange={(e) => setShowInDock(e.target.checked)}
                    className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-white text-xs font-medium">Show in Dock</div>
                    <div className="text-gray-400 text-[10px]">Display icon in dock</div>
                  </div>
                </label>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleSaveUI}
                  disabled={isSaving}
                  className="w-full py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Shortcuts Tab */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white mb-2">Shortcuts</h2>
                <p className="text-gray-400 text-xs mb-3">
                  Keyboard shortcuts (restart required)
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-300">Toggle Window</label>
                  <input
                    type="text"
                    value={toggleWindowShortcut}
                    onChange={(e) => setToggleWindowShortcut(e.target.value)}
                    placeholder="Cmd+Shift+Space"
                    className="w-full px-3 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-gray-400">
                    Format: CommandOrControl+Shift+Space
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-300">Take Screenshot</label>
                  <input
                    type="text"
                    value={takeScreenshotShortcut}
                    onChange={(e) => setTakeScreenshotShortcut(e.target.value)}
                    placeholder="Cmd+H"
                    className="w-full px-3 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleSaveShortcuts}
                  disabled={isSaving}
                  className="w-full py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Updates Tab */}
          {activeTab === 'updates' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white mb-2">Updates</h2>
                <p className="text-gray-400 text-xs mb-3">
                  Configure update settings
                </p>
              </div>

              {/* Current Version */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white text-xs font-medium">Version</div>
                    <div className="text-gray-400 text-[10px] mt-0.5">
                      {currentVersion || 'Loading...'}
                    </div>
                  </div>
                  <button
                    onClick={handleCheckForUpdates}
                    disabled={checkingForUpdates}
                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center gap-1"
                  >
                    {checkingForUpdates ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking...
                      </>
                    ) : (
                      'Check'
                    )}
                  </button>
                </div>
              </div>

              {/* Update Preferences */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-white">Preferences</h3>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCheck}
                    onChange={(e) => setAutoCheck(e.target.checked)}
                    className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-white text-xs font-medium">Auto Check</div>
                    <div className="text-gray-400 text-[10px]">Check on startup</div>
                  </div>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDownload}
                    onChange={(e) => setAutoDownload(e.target.checked)}
                    className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-white text-xs font-medium">Auto Download</div>
                    <div className="text-gray-400 text-[10px]">Download in background</div>
                  </div>
                </label>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleSaveUpdates}
                  disabled={isSaving}
                  className="w-full py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
