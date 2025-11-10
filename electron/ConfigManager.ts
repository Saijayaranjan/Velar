import { app, safeStorage } from "electron"
import { logger } from "./Logger"
import fs from "fs"
import path from "path"

export interface AppConfig {
  aiProvider: 'gemini' | 'ollama'
  ollama?: {
    endpoint: string
    model: string
  }
  gemini?: {
    model: string
  }
  ui?: {
    theme: 'light' | 'dark' | 'system'
    startMinimized: boolean
    showInDock: boolean
  }
  shortcuts?: {
    toggleWindow: string
    takeScreenshot: string
  }
  updates?: {
    autoCheck: boolean
    autoDownload: boolean
  }
  telemetry?: {
    enabled: boolean
    anonymousId: string
  }
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface StoredConfig {
  version: string
  created: string
  updated: string
  config: AppConfig
  setupComplete: boolean
}

export class ConfigManager {
  private static instance: ConfigManager | null = null
  private configPath: string
  private config: StoredConfig | null = null
  private readonly CONFIG_VERSION = "1.0.0"

  private constructor() {
    // Store config in user data directory: ~/.velar/config.json
    const userDataPath = app.getPath('userData')
    const velarDir = path.join(path.dirname(userDataPath), '.velar')
    
    // Ensure directory exists
    if (!fs.existsSync(velarDir)) {
      fs.mkdirSync(velarDir, { recursive: true })
      logger.info("Created Velar config directory", { path: velarDir })
    }
    
    this.configPath = path.join(velarDir, 'config.json')
    logger.debug("ConfigManager initialized", { configPath: this.configPath })
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  /**
   * Load configuration from disk
   */
  private async loadConfig(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = await fs.promises.readFile(this.configPath, 'utf-8')
        this.config = JSON.parse(data)
        logger.debug("Configuration loaded", { version: this.config?.version })
      } else {
        logger.debug("No existing configuration found")
        this.config = null
      }
    } catch (error) {
      logger.error("Error loading configuration", { error })
      this.config = null
    }
  }

  /**
   * Save configuration to disk
   */
  private async saveConfig(): Promise<void> {
    try {
      if (!this.config) {
        throw new Error("No configuration to save")
      }
      
      this.config.updated = new Date().toISOString()
      await fs.promises.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      )
      logger.debug("Configuration saved")
    } catch (error) {
      logger.error("Error saving configuration", { error })
      throw error
    }
  }

  /**
   * Initialize the config manager - must be called after app is ready
   */
  public async initialize(): Promise<void> {
    await this.loadConfig()
    
    // If no config exists, create default
    if (!this.config) {
      await this.createDefaultConfig()
    }
  }

  /**
   * Create default configuration
   */
  private async createDefaultConfig(): Promise<void> {
    this.config = {
      version: this.CONFIG_VERSION,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      setupComplete: false,
      config: {
        aiProvider: 'gemini',
        gemini: {
          model: 'gemini-2.0-flash'
        },
        ollama: {
          endpoint: 'http://localhost:11434',
          model: 'llama3.2'
        },
        ui: {
          theme: 'system',
          startMinimized: false,
          showInDock: false
        },
        shortcuts: {
          toggleWindow: 'CommandOrControl+Shift+Space',
          takeScreenshot: 'CommandOrControl+H'
        },
        updates: {
          autoCheck: true,
          autoDownload: false
        },
        telemetry: {
          enabled: false,
          anonymousId: this.generateAnonymousId()
        }
      }
    }
    
    await this.saveConfig()
    logger.info("Default configuration created")
  }

  /**
   * Generate anonymous ID for telemetry
   */
  private generateAnonymousId(): string {
    return `velar_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Check if this is the first run (setup not complete)
   */
  public isFirstRun(): boolean {
    return !this.config || !this.config.setupComplete
  }

  /**
   * Mark setup as complete
   */
  public async markSetupComplete(): Promise<void> {
    if (!this.config) {
      await this.createDefaultConfig()
    }
    
    if (this.config) {
      this.config.setupComplete = true
      await this.saveConfig()
      logger.info("Setup marked as complete")
    }
  }

  /**
   * Get current configuration
   */
  public async getConfig(): Promise<AppConfig> {
    if (!this.config) {
      await this.loadConfig()
    }
    
    if (!this.config) {
      await this.createDefaultConfig()
    }
    
    return this.config!.config
  }

  /**
   * Update configuration (partial update)
   */
  public async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    if (!this.config) {
      await this.loadConfig()
    }
    
    if (!this.config) {
      await this.createDefaultConfig()
    }
    
    // Deep merge the updates
    this.config!.config = {
      ...this.config!.config,
      ...updates,
      ollama: updates.ollama ? { ...this.config!.config.ollama, ...updates.ollama } : this.config!.config.ollama,
      gemini: updates.gemini ? { ...this.config!.config.gemini, ...updates.gemini } : this.config!.config.gemini,
      ui: updates.ui ? { ...this.config!.config.ui, ...updates.ui } : this.config!.config.ui,
      shortcuts: updates.shortcuts ? { ...this.config!.config.shortcuts, ...updates.shortcuts } : this.config!.config.shortcuts,
      updates: updates.updates ? { ...this.config!.config.updates, ...updates.updates } : this.config!.config.updates,
      telemetry: updates.telemetry ? { ...this.config!.config.telemetry, ...updates.telemetry } : this.config!.config.telemetry
    }
    
    await this.saveConfig()
    logger.info("Configuration updated", { updates })
  }

  /**
   * Check if configuration requires application restart
   */
  public requiresRestart(updates: Partial<AppConfig>): boolean {
    // Shortcuts changes require restart
    if (updates.shortcuts) {
      return true
    }
    
    // UI changes like showInDock might require restart
    if (updates.ui?.showInDock !== undefined) {
      return true
    }
    
    return false
  }

  /**
   * Validate current configuration
   */
  public async validateConfig(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    }
    
    const config = await this.getConfig()
    
    // Validate AI provider
    if (!config.aiProvider || !['gemini', 'ollama'].includes(config.aiProvider)) {
      result.errors.push("Invalid AI provider. Must be 'gemini' or 'ollama'")
      result.valid = false
    }
    
    // Validate provider-specific config
    if (config.aiProvider === 'gemini') {
      const hasApiKey = await this.hasApiKey('gemini')
      if (!hasApiKey) {
        result.errors.push("Gemini API key is required")
        result.valid = false
      }
      
      if (!config.gemini?.model) {
        result.warnings.push("No Gemini model specified, will use default")
      }
    }
    
    if (config.aiProvider === 'ollama') {
      if (!config.ollama?.endpoint) {
        result.errors.push("Ollama endpoint is required")
        result.valid = false
      }
      
      if (!config.ollama?.model) {
        result.warnings.push("No Ollama model specified, will auto-detect")
      }
    }
    
    return result
  }

  /**
   * Set API key for a provider (encrypted storage)
   */
  public async setApiKey(provider: 'gemini' | 'ollama', key: string): Promise<void> {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        logger.warn("Encryption not available, storing key in plain text")
        // Fallback: store in config file (not recommended for production)
        const config = await this.getConfig()
        if (provider === 'gemini') {
          config.gemini = config.gemini || { model: 'gemini-2.0-flash' }
          // Store in a separate secure file
          const securePath = path.join(path.dirname(this.configPath), '.credentials')
          const credentials: any = {}
          
          if (fs.existsSync(securePath)) {
            const data = await fs.promises.readFile(securePath, 'utf-8')
            Object.assign(credentials, JSON.parse(data))
          }
          
          credentials[`${provider}_api_key`] = key
          await fs.promises.writeFile(securePath, JSON.stringify(credentials, null, 2), 'utf-8')
          
          // Set restrictive permissions (Unix-like systems)
          if (process.platform !== 'win32') {
            await fs.promises.chmod(securePath, 0o600)
          }
        }
      } else {
        // Use safeStorage for encryption
        const encrypted = safeStorage.encryptString(key)
        const keyName = `${provider}_api_key`
        
        // Store encrypted key in a separate file
        const securePath = path.join(path.dirname(this.configPath), '.credentials.enc')
        const credentials: any = {}
        
        if (fs.existsSync(securePath)) {
          const data = await fs.promises.readFile(securePath, 'utf-8')
          Object.assign(credentials, JSON.parse(data))
        }
        
        credentials[keyName] = encrypted.toString('base64')
        await fs.promises.writeFile(securePath, JSON.stringify(credentials, null, 2), 'utf-8')
        
        // Set restrictive permissions (Unix-like systems)
        if (process.platform !== 'win32') {
          await fs.promises.chmod(securePath, 0o600)
        }
        
        logger.info("API key encrypted and stored", { provider })
      }
    } catch (error) {
      logger.error("Error setting API key", { provider, error })
      throw error
    }
  }

  /**
   * Get API key for a provider (decrypt from storage)
   */
  public async getApiKey(provider: 'gemini' | 'ollama'): Promise<string | null> {
    try {
      const keyName = `${provider}_api_key`
      
      // Try encrypted storage first
      const encryptedPath = path.join(path.dirname(this.configPath), '.credentials.enc')
      if (fs.existsSync(encryptedPath)) {
        const data = await fs.promises.readFile(encryptedPath, 'utf-8')
        const credentials = JSON.parse(data)
        
        if (credentials[keyName]) {
          if (safeStorage.isEncryptionAvailable()) {
            const encrypted = Buffer.from(credentials[keyName], 'base64')
            const decrypted = safeStorage.decryptString(encrypted)
            return decrypted
          }
        }
      }
      
      // Fallback to plain text storage
      const plainPath = path.join(path.dirname(this.configPath), '.credentials')
      if (fs.existsSync(plainPath)) {
        const data = await fs.promises.readFile(plainPath, 'utf-8')
        const credentials = JSON.parse(data)
        return credentials[keyName] || null
      }
      
      return null
    } catch (error) {
      logger.error("Error getting API key", { provider, error })
      return null
    }
  }

  /**
   * Check if API key exists for a provider
   */
  public async hasApiKey(provider: 'gemini' | 'ollama'): Promise<boolean> {
    const key = await this.getApiKey(provider)
    return key !== null && key.length > 0
  }

  /**
   * Delete API key for a provider
   */
  public async deleteApiKey(provider: 'gemini' | 'ollama'): Promise<void> {
    try {
      const keyName = `${provider}_api_key`
      
      // Delete from encrypted storage
      const encryptedPath = path.join(path.dirname(this.configPath), '.credentials.enc')
      if (fs.existsSync(encryptedPath)) {
        const data = await fs.promises.readFile(encryptedPath, 'utf-8')
        const credentials = JSON.parse(data)
        delete credentials[keyName]
        await fs.promises.writeFile(encryptedPath, JSON.stringify(credentials, null, 2), 'utf-8')
      }
      
      // Delete from plain text storage
      const plainPath = path.join(path.dirname(this.configPath), '.credentials')
      if (fs.existsSync(plainPath)) {
        const data = await fs.promises.readFile(plainPath, 'utf-8')
        const credentials = JSON.parse(data)
        delete credentials[keyName]
        await fs.promises.writeFile(plainPath, JSON.stringify(credentials, null, 2), 'utf-8')
      }
      
      logger.info("API key deleted", { provider })
    } catch (error) {
      logger.error("Error deleting API key", { provider, error })
      throw error
    }
  }

  /**
   * Migrate from .env file (one-time migration)
   */
  public async migrateFromEnv(envPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(envPath)) {
        logger.debug("No .env file to migrate")
        return false
      }
      
      const envContent = await fs.promises.readFile(envPath, 'utf-8')
      const lines = envContent.split('\n')
      
      let migrated = false
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          const value = valueParts.join('=').trim()
          
          if (key === 'GEMINI_API_KEY' && value) {
            await this.setApiKey('gemini', value)
            migrated = true
            logger.info("Migrated Gemini API key from .env")
          }
        }
      }
      
      if (migrated) {
        // Backup the .env file
        const backupPath = `${envPath}.backup`
        await fs.promises.copyFile(envPath, backupPath)
        logger.info(".env file backed up", { backupPath })
      }
      
      return migrated
    } catch (error) {
      logger.error("Error migrating from .env", { error })
      return false
    }
  }

  /**
   * Get the config file path (for debugging)
   */
  public getConfigPath(): string {
    return this.configPath
  }

  /**
   * Reset configuration to defaults
   */
  public async resetConfig(): Promise<void> {
    this.config = null
    await this.createDefaultConfig()
    logger.info("Configuration reset to defaults")
  }
}
