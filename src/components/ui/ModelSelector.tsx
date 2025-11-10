import React, { useState, useEffect } from 'react';
import { Cloud, Home, RefreshCw, Loader2, BarChart3, Info, Key, CheckCircle2, XCircle, Settings } from 'lucide-react';

interface ModelConfig {
  provider: "ollama" | "gemini";
  model: string;
  isOllama: boolean;
}

interface GeminiModel {
  id: string;
  name: string;
  description: string;
  supportedGenerationMethods?: string[];
}

interface ModelSelectorProps {
  onModelChange?: (provider: "ollama" | "gemini", model: string) => void;
  onChatOpen?: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange, onChatOpen }) => {
  const [currentConfig, setCurrentConfig] = useState<ModelConfig | null>(null);
  const [availableOllamaModels, setAvailableOllamaModels] = useState<string[]>([]);
  const [availableGeminiModels, setAvailableGeminiModels] = useState<GeminiModel[]>([]);
  const [isLoadingGeminiModels, setIsLoadingGeminiModels] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'partial' | 'limited' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fetchSuccess, setFetchSuccess] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<"ollama" | "gemini">("gemini");
  const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>("");
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>("gemini-2.0-flash-exp");
  const [ollamaUrl, setOllamaUrl] = useState<string>("http://localhost:11434");

  useEffect(() => {
    loadCurrentConfig();
    loadGeminiModels();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      setIsLoading(true);
      const config = await window.electronAPI.getCurrentLlmConfig();
      setCurrentConfig(config);
      setSelectedProvider(config.provider);
      
      if (config.isOllama) {
        setSelectedOllamaModel(config.model);
        await loadOllamaModels();
      } else {
        setSelectedGeminiModel(config.model);
      }
    } catch (error) {
      console.error('Error loading current config:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadGeminiModels = async () => {
    try {
      // First load the static list
      const staticModels = await window.electronAPI.getAvailableGeminiModels();
      setAvailableGeminiModels(staticModels);
    } catch (error) {
      console.error('Error loading Gemini models:', error);
    }
  };
  
  const fetchGeminiModelsFromAPI = async () => {
    try {
      setIsLoadingGeminiModels(true);
      setErrorMessage('');
      setFetchSuccess('');
      
      const apiModels = await window.electronAPI.fetchAvailableGeminiModels();
      setAvailableGeminiModels(apiModels);
      setFetchSuccess(`Successfully fetched ${apiModels.length} models from Google API!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setFetchSuccess(''), 3000);
      
      console.log(`Fetched ${apiModels.length} models from Google API`);
    } catch (error) {
      console.error('Error fetching Gemini models from API:', error);
      setErrorMessage('Failed to fetch models from API. Using cached list.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoadingGeminiModels(false);
    }
  };

  const loadOllamaModels = async () => {
    try {
      const models = await window.electronAPI.getAvailableOllamaModels();
      setAvailableOllamaModels(models);
      
      // Auto-select first model if none selected
      if (models.length > 0 && !selectedOllamaModel) {
        setSelectedOllamaModel(models[0]);
      }
    } catch (error) {
      console.error('Error loading Ollama models:', error);
      setAvailableOllamaModels([]);
    }
  };

  const testConnection = async () => {
    try {
      setConnectionStatus('testing');
      const result = await window.electronAPI.testLlmConnection();
      
      if (!result.success) {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Unknown error');
      } else if (result.capabilities) {
        const caps = result.capabilities;
        const allSupported = caps.text && caps.image && caps.audio;
        const someSupported = caps.text && (caps.image || caps.audio) && !(caps.image && caps.audio);
        
        // Set status based on capabilities
        if (allSupported) {
          setConnectionStatus('success'); // Green
        } else if (someSupported) {
          setConnectionStatus('partial'); // Yellow
        } else {
          setConnectionStatus('limited'); // Red
        }
        
        // Build message showing only supported capabilities
        const capsList = [];
        if (caps.text) capsList.push('Text');
        if (caps.image) capsList.push('Images');
        if (caps.audio) capsList.push('Audio');
        setErrorMessage(`Capabilities: ${capsList.join(', ')}`);
      } else {
        setConnectionStatus('success');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(String(error));
    }
  };

  const handleProviderSwitch = async () => {
    try {
      setConnectionStatus('testing');
      let result;
      
      if (selectedProvider === 'ollama') {
        result = await window.electronAPI.switchToOllama(selectedOllamaModel, ollamaUrl);
      } else {
        result = await window.electronAPI.switchToGemini(geminiApiKey || undefined, selectedGeminiModel);
      }

      if (result.success) {
        await loadCurrentConfig();
        setConnectionStatus('success');
        onModelChange?.(selectedProvider, selectedProvider === 'ollama' ? selectedOllamaModel : selectedGeminiModel);
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Switch failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(String(error));
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'success': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'partial': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'limited': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'error': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-cluely-dark-card/40 text-cluely-text-muted border border-white/10';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'testing': return 'Testing...';
      case 'success': return 'All Features';
      case 'partial': return 'Limited';
      case 'limited': return 'Text Only';
      case 'error': return 'Error';
      default: return 'Ready';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-white/20 backdrop-blur-md rounded-lg border border-white/30">
        <div className="animate-pulse text-sm text-gray-600">Loading model configuration...</div>
      </div>
    );
  }

  return (
    <div className="modern-settings-container rounded-xl space-y-2.5 text-cluely-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-cluely-accent-teal/20 to-cluely-accent-cyan/10 border border-cluely-accent-teal/30">
            <Settings size={15} className="text-cluely-accent-teal" />
          </div>
          <h3 className="text-sm font-semibold text-cluely-text-primary">Settings</h3>
        </div>
        <div className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Current Status */}
      {currentConfig && (
        <div className="settings-status-card">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${currentConfig.provider === 'ollama' ? 'bg-green-500/10' : 'bg-cluely-accent-teal/10'}`}>
              {currentConfig.provider === 'ollama' ? 
                <Home size={12} className="text-green-400" /> : 
                <Cloud size={12} className="text-cluely-accent-teal" />
              }
            </div>
            <div>
              <p className="text-[9px] text-cluely-text-muted">Currently Active</p>
              <p className="text-xs font-medium text-cluely-text-primary">{currentConfig.model}</p>
            </div>
          </div>
        </div>
      )}

      {/* Provider Selection */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-cluely-text-muted uppercase tracking-wide">Select Provider</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedProvider('gemini')}
            className={`modern-provider-button ${
              selectedProvider === 'gemini' ? 'provider-active-teal' : ''
            }`}
          >
            <Cloud size={14} />
            <div className="text-left">
              <div className="text-[10px] font-medium">Gemini - Cloud AI</div>
            </div>
          </button>
          <button
            onClick={() => setSelectedProvider('ollama')}
            className={`modern-provider-button ${
              selectedProvider === 'ollama' ? 'provider-active-green' : ''
            }`}
          >
            <Home size={14} />
            <div className="text-left">
              <div className="text-[10px] font-medium">Ollama - Local AI</div>
            </div>
          </button>
        </div>
      </div>

      {/* Provider-specific settings */}
      {selectedProvider === 'gemini' ? (
        <div className="space-y-2.5 settings-provider-section">
          <div>
            <label className="settings-label">
              <span>Gemini API Key</span>
              <span className="text-[9px] opacity-60">(optional if already set)</span>
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="modern-input"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="settings-label mb-0">
                <span>Model Selection</span>
              </label>
              {availableGeminiModels.find(m => m.id === selectedGeminiModel) && (
                <div className="group relative">
                  <Info size={10} className="text-cluely-text-muted hover:text-cluely-accent-teal cursor-help transition-colors" />
                  <div className="absolute right-0 top-full mt-1 w-64 bg-cluely-dark-card border border-white/10 rounded-lg p-2.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                    <p className="text-[10px] text-cluely-text-primary font-medium mb-1">
                      {selectedGeminiModel}
                    </p>
                    {availableGeminiModels.find(m => m.id === selectedGeminiModel)?.description && (
                      <p className="text-[9px] text-cluely-text-muted leading-relaxed mb-1">
                        {availableGeminiModels.find(m => m.id === selectedGeminiModel)?.description}
                      </p>
                    )}
                    <div className="text-[9px] text-cluely-accent-teal pt-0.5">
                      {availableGeminiModels.length} models available
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Status messages */}
            {fetchSuccess && (
              <div className="status-message success">
                <CheckCircle2 size={11} />
                <span>{fetchSuccess}</span>
              </div>
            )}
            
            {errorMessage && !fetchSuccess && (
              <div className="status-message error">
                <XCircle size={11} />
                <span>{errorMessage}</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <select
                value={selectedGeminiModel}
                onChange={(e) => setSelectedGeminiModel(e.target.value)}
                className="modern-select flex-1"
              >
                {availableGeminiModels.map((model) => (
                  <option key={model.id} value={model.id} className="bg-cluely-dark-bg">
                    {model.name}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchGeminiModelsFromAPI}
                disabled={isLoadingGeminiModels}
                className="modern-refresh-button"
                title="Fetch latest models from API"
              >
                {isLoadingGeminiModels ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <RefreshCw size={10} />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 settings-provider-section">
          <div>
            <label className="settings-label">
              <Home size={10} className="text-green-400" />
              <span>Ollama Server URL</span>
            </label>
            <input
              type="url"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="modern-input"
              placeholder="http://localhost:11434"
            />
          </div>
          
          <div>
            <label className="settings-label mb-1.5">
              <BarChart3 size={10} className="text-green-400" />
              <span>Model Selection</span>
            </label>
            
            {availableOllamaModels.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={selectedOllamaModel}
                  onChange={(e) => setSelectedOllamaModel(e.target.value)}
                  className="modern-select flex-1"
                >
                  {availableOllamaModels.map((model) => (
                    <option key={model} value={model} className="bg-cluely-dark-bg">
                      {model}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadOllamaModels}
                  className="modern-refresh-button green"
                  title="Refresh available models"
                >
                  <RefreshCw size={10} />
                </button>
              </div>
            ) : (
              <div className="status-message warning">
                <Info size={11} />
                <span>No models found. Ensure Ollama is running and models are installed.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1.5">
        <button
          onClick={handleProviderSwitch}
          disabled={connectionStatus === 'testing'}
          className="modern-action-button primary"
        >
          {connectionStatus === 'testing' ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>Applying...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={12} />
              <span>Apply Changes</span>
            </>
          )}
        </button>
        
        <button
          onClick={testConnection}
          disabled={connectionStatus === 'testing'}
          className="modern-action-button secondary"
        >
          <RefreshCw size={12} />
          <span>Test Connection</span>
        </button>
      </div>

      {/* Help section */}
      <div className="settings-help-section">
        <div className="help-item">
          <Cloud size={10} className="text-cluely-accent-teal flex-shrink-0" />
          <div>
            <span className="font-medium">Gemini</span>
            <span className="opacity-70"> - Google's cloud AI with API authentication</span>
          </div>
        </div>
        <div className="help-item">
          <Home size={10} className="text-green-400 flex-shrink-0" />
          <div>
            <span className="font-medium">Ollama</span>
            <span className="opacity-70"> - Run AI models locally on your machine</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelector;