import { app, BrowserWindow, Tray, Menu, nativeImage } from "electron"
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "./WindowHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import { ProcessingHelper } from "./ProcessingHelper"
import { logger } from "./Logger"
import { ConfigManager } from "./ConfigManager"
import { errorHandler } from "./ErrorHandler"
import { UpdateManager } from "./UpdateManager"
import path from "node:path"

export class AppState {
  private static instance: AppState | null = null

  private windowHelper: WindowHelper
  private screenshotHelper: ScreenshotHelper
  public shortcutsHelper: ShortcutsHelper
  public processingHelper: ProcessingHelper
  private tray: Tray | null = null

  // View management
  private view: "queue" | "solutions" = "queue"

  private problemInfo: {
    problem_statement: string
    input_format: Record<string, any>
    output_format: Record<string, any>
    constraints: Array<Record<string, any>>
    test_cases: Array<Record<string, any>>
  } | null = null // Allow null

  private hasDebugged: boolean = false

  // Processing events
  public readonly PROCESSING_EVENTS = {
    //global states
    UNAUTHORIZED: "procesing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",

    //states for generating the initial solution
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",

    //states for processing the debugging
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error"
  } as const

  constructor() {
    // Initialize WindowHelper with this
    this.windowHelper = new WindowHelper(this)

    // Initialize ScreenshotHelper
    this.screenshotHelper = new ScreenshotHelper(this.view)

    // Initialize ProcessingHelper
    this.processingHelper = new ProcessingHelper(this)

    // Initialize ShortcutsHelper
    this.shortcutsHelper = new ShortcutsHelper(this)
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Getters and Setters
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
    this.screenshotHelper.setView(view)
  }

  public isVisible(): boolean {
    return this.windowHelper.isVisible()
  }

  public getScreenshotHelper(): ScreenshotHelper {
    return this.screenshotHelper
  }

  public getProblemInfo(): any {
    return this.problemInfo
  }

  public setProblemInfo(problemInfo: any): void {
    this.problemInfo = problemInfo
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotHelper.getScreenshotQueue()
  }

  public getExtraScreenshotQueue(): string[] {
    return this.screenshotHelper.getExtraScreenshotQueue()
  }

  // Window management methods
  public createWindow(): void {
    this.windowHelper.createWindow()
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow()
  }

  public toggleMainWindow(): void {
    logger.debug("Toggle main window", {
      screenshots: this.screenshotHelper.getScreenshotQueue().length,
      extraScreenshots: this.screenshotHelper.getExtraScreenshotQueue().length
    })
    this.windowHelper.toggleMainWindow()
  }

  public setWindowDimensions(width: number, height: number): void {
    this.windowHelper.setWindowDimensions(width, height)
  }

  public clearQueues(): void {
    this.screenshotHelper.clearQueues()

    // Clear problem info
    this.problemInfo = null

    // Reset view to initial state
    this.setView("queue")
  }

  // Screenshot management methods
  public async takeScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error("No main window available")

    const screenshotPath = await this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => this.showMainWindow()
    )

    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath)
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path)
  }

  // New methods to move the window
  public moveWindowLeft(): void {
    this.windowHelper.moveWindowLeft()
  }

  public moveWindowRight(): void {
    this.windowHelper.moveWindowRight()
  }
  public moveWindowDown(): void {
    this.windowHelper.moveWindowDown()
  }
  public moveWindowUp(): void {
    this.windowHelper.moveWindowUp()
  }

  public centerAndShowWindow(): void {
    this.windowHelper.centerAndShowWindow()
  }

  public toggleInvisibilityMode(): void {
    this.windowHelper.toggleInvisibilityMode()
  }

  public getInvisibilityMode(): boolean {
    return this.windowHelper.getInvisibilityMode()
  }

  public createTray(): void {
    // Load the app icon for tray
    let trayImage: Electron.NativeImage
    try {
      if (process.platform === 'darwin') {
        // On macOS, use high-quality V icon as template image
        // Template images automatically adapt to light/dark mode
        const iconPath = path.join(__dirname, "../assets/icons/trayTemplate.png")
        trayImage = nativeImage.createFromPath(iconPath)
        trayImage.setTemplateImage(true)
      } else {
        // Other platforms use the ICO file
        const iconPath = path.join(__dirname, "../assets/icons/velar_icon.ico")
        trayImage = nativeImage.createFromPath(iconPath)
        
        if (!trayImage.isEmpty()) {
          trayImage = trayImage.resize({ width: 16, height: 16 })
        }
      }
    } catch (error) {
      logger.warn("Could not load tray icon, using empty image", { error })
      trayImage = nativeImage.createEmpty()
    }
    
    this.tray = new Tray(trayImage)
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Velar',
        click: () => {
          this.centerAndShowWindow()
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Visible Mode',
        click: () => {
          this.windowHelper.setInvisibilityMode(false)
        }
      },
      {
        label: 'Incognito Mode',
        click: () => {
          this.windowHelper.setInvisibilityMode(true)
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Take Screenshot (Cmd+H)',
        click: async () => {
          try {
            const screenshotPath = await this.takeScreenshot()
            const preview = await this.getImagePreview(screenshotPath)
            const mainWindow = this.getMainWindow()
            if (mainWindow) {
              mainWindow.webContents.send("screenshot-taken", {
                path: screenshotPath,
                preview
              })
            }
          } catch (error) {
            logger.error("Error taking screenshot from tray", { error })
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          app.quit()
        }
      }
    ])
    
    this.tray.setToolTip('Velar - Press Cmd+Shift+Space to show')
    this.tray.setContextMenu(contextMenu)
    
    // Double-click to show window
    this.tray.on('double-click', () => {
      this.centerAndShowWindow()
    })
  }

  public destroyTray(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }

  public showTray(): void {
    if (!this.tray) {
      this.createTray()
    }
  }

  public hideTray(): void {
    this.destroyTray()
  }

  public getTray(): Tray | null {
    return this.tray
  }

  public setHasDebugged(value: boolean): void {
    this.hasDebugged = value
  }

  public getHasDebugged(): boolean {
    return this.hasDebugged
  }

  public createApplicationMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Velar',
        submenu: [
          {
            label: 'Open Velar',
            accelerator: 'CmdOrCtrl+Shift+Space',
            click: () => {
              this.centerAndShowWindow()
            }
          },
          { type: 'separator' },
          {
            label: 'Visible Mode',
            click: () => {
              this.windowHelper.setInvisibilityMode(false)
            }
          },
          {
            label: 'Incognito Mode',
            click: () => {
              this.windowHelper.setInvisibilityMode(true)
            }
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              app.quit()
            }
          }
        ]
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  /**
   * Cleanup method for resource disposal
   * Called before app quit to ensure all resources are properly released
   */
  public async cleanup(): Promise<void> {
    logger.info("Starting application cleanup")

    try {
      // 1. Unregister all global shortcuts
      logger.debug("Unregistering global shortcuts")
      this.shortcutsHelper.unregisterAll()

      // 2. Cancel any ongoing processing
      logger.debug("Canceling ongoing requests")
      this.processingHelper.cancelOngoingRequests()

      // 3. Clean up temporary screenshot files
      logger.debug("Cleaning up temporary files")
      await this.screenshotHelper.cleanupTempFiles()

      // 4. Destroy tray icon
      logger.debug("Destroying tray icon")
      this.destroyTray()

      // 5. Close main window if it exists
      const mainWindow = this.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        logger.debug("Closing main window")
        mainWindow.close()
      }

      logger.info("Application cleanup completed successfully")
    } catch (error) {
      logger.error("Error during application cleanup", { error })
    }
  }
}

// Application initialization
async function initializeApp() {
  const appState = AppState.getInstance()

  // Set up global error handlers
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception in main process', { error: error.message, stack: error.stack })
    errorHandler.handleUncaughtException(error)
  })

  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled rejection in main process', { reason: String(reason) })
    errorHandler.handleUnhandledRejection(reason)
  })

  // Initialize IPC handlers before window creation
  const { initializeIpcHandlers, cleanupIpcHandlers } = await import('./ipcHandlers')
  initializeIpcHandlers(appState)

  app.whenReady().then(async () => {
    logger.info("App is ready")
    
    // Initialize ConfigManager
    const configManager = ConfigManager.getInstance()
    await configManager.initialize()
    logger.info("ConfigManager initialized")
    
    // Set main window reference for error handler (will be set after window creation)
    // errorHandler.setMainWindow will be called after createWindow()
    
    // Check for .env migration
    const envPath = path.join(process.cwd(), '.env')
    const migrated = await configManager.migrateFromEnv(envPath)
    if (migrated) {
      logger.info("Migrated credentials from .env file")
    }
    
    // Load configuration and initialize LLM with stored credentials
    try {
      const config = await configManager.getConfig()
      const apiKey = await configManager.getApiKey(config.aiProvider)
      
      if (apiKey && config.aiProvider === 'gemini') {
        // Initialize LLM with stored credentials
        await appState.processingHelper.getLLMHelper().switchToGemini(apiKey, config.gemini?.model)
        logger.info("Initialized LLM with stored Gemini credentials")
      } else if (config.aiProvider === 'ollama') {
        await appState.processingHelper.getLLMHelper().switchToOllama(
          config.ollama?.model,
          config.ollama?.endpoint
        )
        logger.info("Initialized LLM with Ollama configuration")
      }
    } catch (error) {
      logger.warn("Could not initialize LLM with stored credentials", { error })
    }
    
    // macOS: Hide dock icon completely - we only want menu bar icon
    if (process.platform === 'darwin' && app.dock) {
      app.dock.hide()
    }
    
    // Create application menu
    appState.createApplicationMenu()
    
    appState.createWindow()
    
    // Set main window reference for error handler
    const mainWindow = appState.getMainWindow()
    if (mainWindow) {
      errorHandler.setMainWindow(mainWindow)
    }
    
    // Initialize UpdateManager
    const updateManager = UpdateManager.getInstance()
    if (mainWindow) {
      updateManager.setMainWindow(mainWindow)
    }
    
    // Check if setup is needed
    const isFirstRun = configManager.isFirstRun()
    if (isFirstRun) {
      logger.info("First run detected, setup wizard will be shown")
      // Send event to renderer to show setup wizard
      if (mainWindow) {
        mainWindow.webContents.once('did-finish-load', () => {
          mainWindow.webContents.send('show-setup-wizard')
        })
      }
    } else {
      // Only check for updates if not first run
      logger.info("Checking for updates on startup")
      updateManager.checkForUpdatesOnStartup()
    }
    
    appState.createTray()
    // Register global shortcuts using ShortcutsHelper
    appState.shortcutsHelper.registerGlobalShortcuts()
  })

  app.on("activate", () => {
    logger.debug("App activated")
    if (appState.getMainWindow() === null) {
      appState.createWindow()
    }
  })

  // Quit when all windows are closed, except on macOS
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })

  // Cleanup before quit
  app.on("before-quit", async (event) => {
    event.preventDefault()
    
    logger.info("Application is quitting, performing cleanup")
    
    // Perform cleanup
    await appState.cleanup()
    
    // Cleanup IPC handlers
    const { cleanupIpcHandlers } = await import('./ipcHandlers')
    cleanupIpcHandlers()
    
    // Now actually quit
    app.exit(0)
  })

  // Keep dock icon visible on macOS - removed app.dock?.hide()
  app.commandLine.appendSwitch("disable-background-timer-throttling")
}

// Start the application
initializeApp().catch((error) => {
  logger.error("Failed to initialize app", { error })
})
