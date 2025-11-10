import { app, BrowserWindow, Tray, Menu, nativeImage } from "electron"
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "./WindowHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import { ProcessingHelper } from "./ProcessingHelper"
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
    console.log(
      "Screenshots: ",
      this.screenshotHelper.getScreenshotQueue().length,
      "Extra screenshots: ",
      this.screenshotHelper.getExtraScreenshotQueue().length
    )
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
        // On macOS, create image with both 22px (1x) and 44px (2x) for Retina displays
        const icon1xPath = path.join(__dirname, "../assets/icons/tray_22.png")
        const icon2xPath = path.join(__dirname, "../assets/icons/tray_44.png")
        
        trayImage = nativeImage.createFromPath(icon1xPath)
        
        // Add @2x version for Retina displays
        const fs = require('fs')
        if (fs.existsSync(icon2xPath)) {
          const icon2x = nativeImage.createFromPath(icon2xPath)
          if (!icon2x.isEmpty()) {
            trayImage.addRepresentation({
              scaleFactor: 2.0,
              buffer: icon2x.toPNG()
            })
          }
        }
        
        // Use template image for better integration with system theme
        trayImage.setTemplateImage(true)
      } else {
        // Other platforms use the 22px icon
        const iconPath = path.join(__dirname, "../assets/icons/tray_22.png")
        trayImage = nativeImage.createFromPath(iconPath)
      }
    } catch (error) {
      console.log("Could not load tray icon, using empty image:", error)
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
            console.error("Error taking screenshot from tray:", error)
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
}

// Application initialization
async function initializeApp() {
  const appState = AppState.getInstance()

  // Initialize IPC handlers before window creation
  initializeIpcHandlers(appState)

  app.whenReady().then(() => {
    console.log("App is ready")
    
    // macOS: Hide dock icon completely - we only want menu bar icon
    if (process.platform === 'darwin' && app.dock) {
      app.dock.hide()
    }
    
    // Create application menu
    appState.createApplicationMenu()
    
    appState.createWindow()
    appState.createTray()
    // Register global shortcuts using ShortcutsHelper
    appState.shortcutsHelper.registerGlobalShortcuts()
  })

  app.on("activate", () => {
    console.log("App activated")
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

  // Keep dock icon visible on macOS - removed app.dock?.hide()
  app.commandLine.appendSwitch("disable-background-timer-throttling")
}

// Start the application
initializeApp().catch(console.error)
