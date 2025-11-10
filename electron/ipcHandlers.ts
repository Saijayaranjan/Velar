// ipcHandlers.ts

import { ipcMain, app, shell } from "electron"
import { AppState } from "./main"
import { logger } from "./Logger"
import { UpdateManager } from "./UpdateManager"

// Store handler names for cleanup
const registeredHandlers: string[] = []

export function initializeIpcHandlers(appState: AppState): void {
  // Helper function to register and track handlers
  const registerHandler = (channel: string, handler: (...args: any[]) => any) => {
    ipcMain.handle(channel, handler)
    registeredHandlers.push(channel)
  }
  registerHandler(
    "update-content-dimensions",
    async (_event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        appState.setWindowDimensions(width, height)
      }
    }
  )

  registerHandler("delete-screenshot", async (_event, path: string) => {
    return appState.deleteScreenshot(path)
  })

  registerHandler("take-screenshot", async (_event) => {
    try {
      const screenshotPath = await appState.takeScreenshot()
      const preview = await appState.getImagePreview(screenshotPath)
      
      // Send the screenshot-taken event to trigger auto-analysis
      const mainWindow = appState.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send("screenshot-taken", {
          path: screenshotPath,
          preview
        })
      }
      
      return { path: screenshotPath, preview }
    } catch (error) {
      logger.error("Error taking screenshot", { error })
      throw error
    }
  })

  registerHandler("get-screenshots", async () => {
    logger.debug("Getting screenshots", { view: appState.getView() })
    try {
      let previews = []
      const queue = appState.getView() === "queue" 
        ? appState.getScreenshotQueue() 
        : appState.getExtraScreenshotQueue()
      
      // Filter out any paths that don't exist and get previews for valid ones
      const validPreviews = await Promise.all(
        queue.map(async (path) => {
          try {
            // Check if file exists before trying to read it
            const fs = await import('fs')
            if (!fs.existsSync(path)) {
              logger.warn("Screenshot file not found, skipping", { path })
              return null
            }
            const preview = await appState.getImagePreview(path)
            return { path, preview }
          } catch (error) {
            logger.warn("Error loading screenshot preview, skipping", { path, error })
            return null
          }
        })
      )
      
      // Filter out null entries (failed screenshots)
      previews = validPreviews.filter(p => p !== null)
      
      logger.debug("Retrieved screenshots", { count: previews.length })
      return previews
    } catch (error) {
      logger.error("Error getting screenshots", { error })
      throw error
    }
  })

  registerHandler("toggle-window", async () => {
    appState.toggleMainWindow()
  })

  registerHandler("reset-queues", async () => {
    try {
      appState.clearQueues()
      logger.info("Screenshot queues have been cleared")
      return { success: true }
    } catch (error: any) {
      logger.error("Error resetting queues", { error })
      return { success: false, error: error.message }
    }
  })

  // IPC handler for analyzing audio from base64 data
  registerHandler("analyze-audio-base64", async (_event, data: string, mimeType: string) => {
    try {
      const result = await appState.processingHelper.processAudioBase64(data, mimeType)
      return result
    } catch (error: any) {
      logger.error("Error in analyze-audio-base64 handler", { error })
      // Return error message to the user
      return { 
        error: true, 
        message: error.message || "Failed to analyze audio. Please try again."
      }
    }
  })

  // IPC handler for analyzing audio from file path
  registerHandler("analyze-audio-file", async (_event, path: string) => {
    try {
      const result = await appState.processingHelper.processAudioFile(path)
      return result
    } catch (error: any) {
      logger.error("Error in analyze-audio-file handler", { error })
      // Return error message to the user
      return { 
        error: true, 
        message: error.message || "Failed to analyze audio. Please try again."
      }
    }
  })

  // IPC handler for analyzing image from file path
  registerHandler("analyze-image-file", async (_event, path: string) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().analyzeImageFile(path)
      return result
    } catch (error: any) {
      logger.error("Error in analyze-image-file handler", { error })
      throw error
    }
  })

  registerHandler("gemini-chat", async (_event, message: string, screenshots: string[]) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().chatWithGemini(message, screenshots);
      return result;
    } catch (error: any) {
      logger.error("Error in gemini-chat handler", { error });
      throw error;
    }
  });

  registerHandler("quit-app", () => {
    app.quit()
  })

  // Open System Settings for Screen Recording permission
  registerHandler("open-screen-recording-settings", async () => {
    try {
      // macOS command to open Screen Recording settings
      if (process.platform === "darwin") {
        await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
      }
    } catch (error) {
      logger.error("Error opening Screen Recording settings", { error })
    }
  })

  // Window movement handlers
  registerHandler("move-window-left", async () => {
    appState.moveWindowLeft()
  })

  registerHandler("move-window-right", async () => {
    appState.moveWindowRight()
  })

  registerHandler("move-window-up", async () => {
    appState.moveWindowUp()
  })

  registerHandler("move-window-down", async () => {
    appState.moveWindowDown()
  })

  registerHandler("center-and-show-window", async () => {
    appState.centerAndShowWindow()
  })

  // Invisibility Mode Handler (Pro+ Feature)
  registerHandler("toggle-invisibility-mode", async () => {
    appState.toggleInvisibilityMode()
    return { success: true, isInvisible: appState.getInvisibilityMode() }
  })

  // LLM Model Management Handlers
  registerHandler("get-current-llm-config", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      return {
        provider: llmHelper.getCurrentProvider(),
        model: llmHelper.getCurrentModel(),
        isOllama: llmHelper.isUsingOllama()
      };
    } catch (error: any) {
      logger.error("Error getting current LLM config", { error });
      throw error;
    }
  });

  registerHandler("get-available-ollama-models", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const models = await llmHelper.getOllamaModels();
      return models;
    } catch (error: any) {
      logger.error("Error getting Ollama models", { error });
      throw error;
    }
  });
  
  registerHandler("get-available-gemini-models", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const models = llmHelper.getAvailableGeminiModels();
      return models;
    } catch (error: any) {
      logger.error("Error getting Gemini models", { error });
      throw error;
    }
  });
  
  registerHandler("fetch-available-gemini-models", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const models = await llmHelper.fetchAvailableGeminiModels();
      return models;
    } catch (error: any) {
      logger.error("Error fetching Gemini models from API", { error });
      throw error;
    }
  });

  registerHandler("switch-to-ollama", async (_, model?: string, url?: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      await llmHelper.switchToOllama(model, url);
      return { success: true };
    } catch (error: any) {
      logger.error("Error switching to Ollama", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("switch-to-gemini", async (_, apiKey?: string, model?: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      await llmHelper.switchToGemini(apiKey, model);
      return { success: true };
    } catch (error: any) {
      logger.error("Error switching to Gemini", { error });
      return { success: false, error: error.message };
    }
  });
  
  registerHandler("switch-gemini-model", async (_, model: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      await llmHelper.switchGeminiModel(model);
      return { success: true };
    } catch (error: any) {
      logger.error("Error switching Gemini model", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("test-llm-connection", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const result = await llmHelper.testConnection();
      return result;
    } catch (error: any) {
      logger.error("Error testing LLM connection", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("fetch-gemini-models", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const models = await llmHelper.fetchAvailableGeminiModels();
      logger.info("Fetched Gemini models", { count: models.length });
      return { success: true, models };
    } catch (error: any) {
      logger.error("Error fetching Gemini models", { error });
      return { success: false, error: error.message };
    }
  });

  // Handle logging from renderer process
  registerHandler("write-log", async (_event, logEntry: any) => {
    try {
      const { level, message, context, error } = logEntry;
      
      switch (level) {
        case "error":
          if (error) {
            logger.logError(new Error(error.message || message), context?.context);
          } else {
            logger.error(message, context);
          }
          break;
        case "warn":
          logger.warn(message, context);
          break;
        case "info":
          logger.info(message, context);
          break;
        case "debug":
          logger.debug(message, context);
          break;
        default:
          logger.info(message, context);
      }
    } catch (err) {
      // Silently fail to avoid infinite loops
      console.error("Failed to write log from renderer:", err);
    }
  });

  // Configuration Management Handlers
  registerHandler("config:get", async () => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      const config = await configManager.getConfig();
      return { success: true, config };
    } catch (error: any) {
      logger.error("Error getting config", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:update", async (event, updates: any) => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      await configManager.updateConfig(updates);
      
      // Notify all windows about config change for real-time updates
      const mainWindow = appState.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('config:changed', updates);
      }
      
      return { success: true };
    } catch (error: any) {
      logger.error("Error updating config", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:validate", async () => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      const result = await configManager.validateConfig();
      return { success: true, result };
    } catch (error: any) {
      logger.error("Error validating config", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:is-first-run", async () => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      return { success: true, isFirstRun: configManager.isFirstRun() };
    } catch (error: any) {
      logger.error("Error checking first run", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:mark-setup-complete", async () => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      await configManager.markSetupComplete();
      return { success: true };
    } catch (error: any) {
      logger.error("Error marking setup complete", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:set-api-key", async (_event, provider: 'gemini' | 'ollama', key: string) => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      await configManager.setApiKey(provider, key);
      return { success: true };
    } catch (error: any) {
      logger.error("Error setting API key", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:get-api-key", async (_event, provider: 'gemini' | 'ollama') => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      const key = await configManager.getApiKey(provider);
      return { success: true, key };
    } catch (error: any) {
      logger.error("Error getting API key", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:has-api-key", async (_event, provider: 'gemini' | 'ollama') => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      const hasKey = await configManager.hasApiKey(provider);
      return { success: true, hasKey };
    } catch (error: any) {
      logger.error("Error checking API key", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:delete-api-key", async (_event, provider: 'gemini' | 'ollama') => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      await configManager.deleteApiKey(provider);
      return { success: true };
    } catch (error: any) {
      logger.error("Error deleting API key", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:validate-credentials", async (_event, provider: 'gemini' | 'ollama', credentials: any) => {
    try {
      // Test the credentials by attempting to switch to the provider
      if (provider === 'gemini') {
        await appState.processingHelper.getLLMHelper().switchToGemini(credentials.apiKey, credentials.model);
        const testResult = await appState.processingHelper.getLLMHelper().testConnection();
        return testResult;
      } else {
        await appState.processingHelper.getLLMHelper().switchToOllama(credentials.model, credentials.url);
        const testResult = await appState.processingHelper.getLLMHelper().testConnection();
        return testResult;
      }
    } catch (error: any) {
      logger.error("Error validating credentials", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:get-path", async () => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      return { success: true, path: configManager.getConfigPath() };
    } catch (error: any) {
      logger.error("Error getting config path", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:reset", async () => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      await configManager.resetConfig();
      return { success: true };
    } catch (error: any) {
      logger.error("Error resetting config", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("config:requires-restart", async (_event, updates: any) => {
    try {
      const { ConfigManager } = await import("./ConfigManager");
      const configManager = ConfigManager.getInstance();
      const requiresRestart = configManager.requiresRestart(updates);
      return { success: true, requiresRestart };
    } catch (error: any) {
      logger.error("Error checking restart requirement", { error });
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // Update Management Handlers
  // ============================================

  registerHandler("check-for-updates", async (_event, silent: boolean = false) => {
    try {
      const updateManager = UpdateManager.getInstance();
      await updateManager.checkForUpdates(silent);
      return { success: true };
    } catch (error: any) {
      logger.error("Error checking for updates", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("download-update", async () => {
    try {
      const updateManager = UpdateManager.getInstance();
      await updateManager.downloadUpdate();
      return { success: true };
    } catch (error: any) {
      logger.error("Error downloading update", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("install-update", async () => {
    try {
      const updateManager = UpdateManager.getInstance();
      updateManager.quitAndInstall();
      return { success: true };
    } catch (error: any) {
      logger.error("Error installing update", { error });
      return { success: false, error: error.message };
    }
  });

  registerHandler("get-app-version", async () => {
    try {
      const updateManager = UpdateManager.getInstance();
      return { success: true, version: updateManager.getCurrentVersion() };
    } catch (error: any) {
      logger.error("Error getting app version", { error });
      return { success: false, error: error.message };
    }
  });
}

/**
 * Clean up all IPC handlers
 * Called during application cleanup
 */
export function cleanupIpcHandlers(): void {
  logger.debug("Cleaning up IPC handlers", { count: registeredHandlers.length })
  
  for (const channel of registeredHandlers) {
    ipcMain.removeHandler(channel)
  }
  
  // Clear the array
  registeredHandlers.length = 0
  
  logger.debug("IPC handlers cleanup completed")
}
