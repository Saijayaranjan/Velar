import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { logger } from './Logger'

export class UpdateManager {
  private static instance: UpdateManager | null = null
  private mainWindow: BrowserWindow | null = null
  private updateCheckInProgress = false

  private constructor() {
    this.configureAutoUpdater()
    this.setupEventHandlers()
  }

  public static getInstance(): UpdateManager {
    if (!UpdateManager.instance) {
      UpdateManager.instance = new UpdateManager()
    }
    return UpdateManager.instance
  }

  /**
   * Set the main window reference for sending update events
   */
  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * Configure electron-updater settings
   */
  private configureAutoUpdater(): void {
    // Configure auto-updater
    autoUpdater.autoDownload = false // Don't auto-download, let user decide
    autoUpdater.autoInstallOnAppQuit = true // Auto-install when app quits
    
    // Set logger
    autoUpdater.logger = logger
    
    logger.info('AutoUpdater configured', {
      currentVersion: autoUpdater.currentVersion.version,
      autoDownload: autoUpdater.autoDownload,
      autoInstallOnAppQuit: autoUpdater.autoInstallOnAppQuit
    })
  }

  /**
   * Setup event handlers for auto-updater
   */
  private setupEventHandlers(): void {
    // Checking for update
    autoUpdater.on('checking-for-update', () => {
      logger.info('Checking for updates...')
      this.sendToRenderer('update-checking')
    })

    // Update available
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      logger.info('Update available', {
        version: info.version,
        releaseDate: info.releaseDate,
        size: info.files?.[0]?.size
      })
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      })
    })

    // Update not available
    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      logger.info('Update not available', {
        version: info.version
      })
      this.sendToRenderer('update-not-available', {
        version: info.version
      })
    })

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      logger.debug('Download progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      })
      this.sendToRenderer('update-download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      })
    })

    // Update downloaded
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      logger.info('Update downloaded', {
        version: info.version
      })
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes
      })
    })

    // Error occurred
    autoUpdater.on('error', (error) => {
      logger.error('AutoUpdater error', {
        error: error.message,
        stack: error.stack
      })
      this.sendToRenderer('update-error', {
        message: error.message
      })
    })
  }

  /**
   * Send update event to renderer process
   */
  private sendToRenderer(channel: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  /**
   * Check for updates
   * @param silent - If true, don't show "no updates available" notification
   */
  public async checkForUpdates(silent: boolean = false): Promise<void> {
    if (this.updateCheckInProgress) {
      logger.debug('Update check already in progress, skipping')
      return
    }

    try {
      this.updateCheckInProgress = true
      logger.info('Manually checking for updates', { silent })
      
      const result = await autoUpdater.checkForUpdates()
      
      if (!result) {
        logger.warn('Update check returned null result')
        if (!silent) {
          this.sendToRenderer('update-not-available', {
            version: autoUpdater.currentVersion.version
          })
        }
      }
    } catch (error: any) {
      logger.error('Error checking for updates', {
        error: error.message,
        stack: error.stack
      })
      
      if (!silent) {
        this.sendToRenderer('update-error', {
          message: error.message || 'Failed to check for updates'
        })
      }
    } finally {
      this.updateCheckInProgress = false
    }
  }

  /**
   * Download the available update
   */
  public async downloadUpdate(): Promise<void> {
    try {
      logger.info('Starting update download')
      await autoUpdater.downloadUpdate()
    } catch (error: any) {
      logger.error('Error downloading update', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Quit and install the downloaded update
   */
  public quitAndInstall(): void {
    logger.info('Quitting and installing update')
    autoUpdater.quitAndInstall(false, true)
  }

  /**
   * Check for updates on app startup
   * This is called automatically when the app starts
   */
  public async checkForUpdatesOnStartup(): Promise<void> {
    // Wait a bit before checking to ensure app is fully loaded
    setTimeout(() => {
      this.checkForUpdates(true)
    }, 5000) // Check after 5 seconds
  }

  /**
   * Get current app version
   */
  public getCurrentVersion(): string {
    return autoUpdater.currentVersion.version
  }
}
