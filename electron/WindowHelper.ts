
import { BrowserWindow, screen, nativeImage } from "electron"
import { AppState } from "main"
import { logger } from "./Logger"
import path from "node:path"

const isDev = process.env.NODE_ENV === "development"

const startUrl = isDev
  ? "http://localhost:5180"
  : `file://${path.join(__dirname, "../dist/index.html")}`

// Log the URL for debugging
console.log("WindowHelper startUrl:", startUrl)
console.log("WindowHelper __dirname:", __dirname)
console.log("WindowHelper isDev:", isDev)

export class WindowHelper {
  private mainWindow: BrowserWindow | null = null
  private isWindowVisible: boolean = false
  private windowPosition: { x: number; y: number } | null = null
  private windowSize: { width: number; height: number } | null = null
  private appState: AppState
  private isInvisibleMode: boolean = false

  // Initialize with explicit number type and 0 value
  private screenWidth: number = 0
  private screenHeight: number = 0
  private step: number = 0
  private currentX: number = 0
  private currentY: number = 0

  constructor(appState: AppState) {
    this.appState = appState
  }

  public setWindowDimensions(width: number, height: number): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    // Get current window position
    const [currentX, currentY] = this.mainWindow.getPosition()

    // Get screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize

    // Use 75% width if debugging has occurred, otherwise use 60%
    const maxAllowedWidth = Math.floor(
      workArea.width * (this.appState.getHasDebugged() ? 0.75 : 0.5)
    )

    // Ensure width doesn't exceed max allowed width and height is reasonable
    const newWidth = Math.min(width + 32, maxAllowedWidth)
    const newHeight = Math.ceil(height)

    // Center the window horizontally if it would go off screen
    const maxX = workArea.width - newWidth
    const newX = Math.min(Math.max(currentX, 0), maxX)

    // Keep Y position stable - only adjust if window would go off bottom of screen
    let newY = currentY
    const bottomEdge = currentY + newHeight
    if (bottomEdge > workArea.height) {
      // Window would go off bottom, move it up just enough
      newY = workArea.height - newHeight
      // But don't go above 0
      newY = Math.max(0, newY)
    }

    // Update window bounds
    this.mainWindow.setBounds({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    })

    // Update internal state
    this.windowPosition = { x: newX, y: newY }
    this.windowSize = { width: newWidth, height: newHeight }
    this.currentX = newX
    this.currentY = newY
  }

  public createWindow(): void {
    if (this.mainWindow !== null) return

    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize
    this.screenWidth = workArea.width
    this.screenHeight = workArea.height

    // Load app icon
    let appIcon: Electron.NativeImage | undefined
    try {
      let iconPath: string
      if (process.platform === 'win32') {
        iconPath = path.join(__dirname, "../assets/icons/velar_icon.ico")
      } else if (process.platform === 'darwin') {
        iconPath = path.join(__dirname, "../assets/icons/velar_icon.icns")
      } else {
        iconPath = path.join(__dirname, "../assets/icons/velar_icon.icns")
      }
      appIcon = nativeImage.createFromPath(iconPath)
    } catch (error) {
      logger.warn("Could not load app icon", { error })
    }
    
    const windowSettings: Electron.BrowserWindowConstructorOptions = {
      width: 400,
      height: 600,
      minWidth: 300,
      minHeight: 200,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js")
      },
      show: false, // Start hidden, show after ready
      alwaysOnTop: true,
      frame: false, // Frameless window - no native controls
      transparent: true, // Fully transparent for glass effect
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: "#00000000", // Fully transparent
      focusable: true,
      resizable: true,
      movable: true,
      x: 100, // Start at a visible position
      y: 100,
      icon: appIcon, // Set the app icon
      // Critical for screen capture evasion - makes window invisible to screen recording
      ...(process.platform === 'darwin' ? {
        visualEffectState: 'active'
      } : {})
    }

    this.mainWindow = new BrowserWindow(windowSettings)
    // this.mainWindow.webContents.openDevTools() // Enable DevTools for debugging
    // Disable content protection in development to allow paste operations
    if (!isDev) {
      this.mainWindow.setContentProtection(true)
    }

    if (process.platform === "darwin") {
      this.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      })
      this.mainWindow.setHiddenInMissionControl(true)
      this.mainWindow.setAlwaysOnTop(true, "floating")
    }
    if (process.platform === "linux") {
      // Linux-specific optimizations for better compatibility
      if (this.mainWindow.setHasShadow) {
        this.mainWindow.setHasShadow(false)
      }
      // Keep window focusable on Linux for proper interaction
      this.mainWindow.setFocusable(true)
    } 
    this.mainWindow.setSkipTaskbar(true)
    this.mainWindow.setAlwaysOnTop(true)

    // Enable context menu for input fields (cut, copy, paste)
    this.mainWindow.webContents.on('context-menu', (event, params) => {
      const { Menu, MenuItem } = require('electron')
      const menu = new Menu()

      // Add each spelling suggestion as a menu item
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => this.mainWindow?.webContents.replaceMisspelling(suggestion)
        }))
      }

      // Allow users to add the misspelled word to the dictionary
      if (params.misspelledWord) {
        menu.append(
          new MenuItem({
            label: 'Add to dictionary',
            click: () => this.mainWindow?.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
          })
        )
      }

      // Add separator if we have spelling suggestions
      if (params.dictionarySuggestions.length > 0 || params.misspelledWord) {
        menu.append(new MenuItem({ type: 'separator' }))
      }

      // Add standard editing options for input fields
      if (params.isEditable) {
        menu.append(new MenuItem({ label: 'Cut', role: 'cut', enabled: params.editFlags.canCut }))
        menu.append(new MenuItem({ label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy }))
        menu.append(new MenuItem({ label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste }))
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }))
      }

      // Show the menu only if it has items
      if (menu.items.length > 0) {
        menu.popup()
      }
    })

    this.mainWindow.loadURL(startUrl).catch((err) => {
      logger.error("Failed to load URL", { error: err })
      console.error("Failed to load URL:", err)
    })

    // Show window after loading URL and center it
    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        // Center the window first
        this.centerWindow()
        this.mainWindow.show()
        this.mainWindow.focus()
        this.mainWindow.setAlwaysOnTop(true)
        logger.debug("Window is now visible and centered")
        console.log("Window shown via ready-to-show event")
      }
    })

    // Fallback: Show window after 2 seconds if ready-to-show doesn't fire
    setTimeout(() => {
      if (this.mainWindow && !this.isWindowVisible) {
        console.log("Fallback: Showing window after timeout")
        this.centerWindow()
        this.mainWindow.show()
        this.mainWindow.focus()
        this.isWindowVisible = true
      }
    }, 2000)

    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.windowSize = { width: bounds.width, height: bounds.height }
    this.currentX = bounds.x
    this.currentY = bounds.y

    this.setupWindowListeners()
    this.isWindowVisible = true
  }

  private setupWindowListeners(): void {
    if (!this.mainWindow) return

    this.mainWindow.on("move", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds()
        this.windowPosition = { x: bounds.x, y: bounds.y }
        this.currentX = bounds.x
        this.currentY = bounds.y
      }
    })

    this.mainWindow.on("resize", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds()
        this.windowSize = { width: bounds.width, height: bounds.height }
      }
    })

    this.mainWindow.on("closed", () => {
      logger.debug("Main window closed, cleaning up window resources")
      this.mainWindow = null
      this.isWindowVisible = false
      this.windowPosition = null
      this.windowSize = null
    })

    // Cleanup on window close
    this.mainWindow.on("close", () => {
      logger.debug("Main window closing, preparing cleanup")
    })
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public isVisible(): boolean {
    return this.isWindowVisible
  }

  public hideMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      logger.warn("Main window does not exist or is destroyed")
      return
    }

    // Save current position before hiding
    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.windowSize = { width: bounds.width, height: bounds.height }
    
    this.mainWindow.hide()
    this.isWindowVisible = false
  }

  public showMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      logger.warn("Main window does not exist or is destroyed")
      return
    }

    // Restore position and size before showing
    if (this.windowPosition && this.windowSize) {
      this.mainWindow.setBounds({
        x: this.windowPosition.x,
        y: this.windowPosition.y,
        width: this.windowSize.width,
        height: this.windowSize.height
      }, false) // false = don't animate
    }

    this.mainWindow.show()
    this.mainWindow.focus()
    this.isWindowVisible = true
  }

  public toggleMainWindow(): void {
    if (this.isWindowVisible) {
      this.hideMainWindow()
    } else {
      this.showMainWindow()
    }
  }

  private centerWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return
    }

    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize
    
    // Get current window size or use defaults
    const windowBounds = this.mainWindow.getBounds()
    const windowWidth = windowBounds.width || 400
    const windowHeight = windowBounds.height || 600
    
    // Calculate center position
    const centerX = Math.floor((workArea.width - windowWidth) / 2)
    const centerY = Math.floor((workArea.height - windowHeight) / 2)
    
    // Set window position
    this.mainWindow.setBounds({
      x: centerX,
      y: centerY,
      width: windowWidth,
      height: windowHeight
    })
    
    // Update internal state
    this.windowPosition = { x: centerX, y: centerY }
    this.windowSize = { width: windowWidth, height: windowHeight }
    this.currentX = centerX
    this.currentY = centerY
  }

  public centerAndShowWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      logger.warn("Main window does not exist or is destroyed")
      return
    }

    this.centerWindow()
    this.mainWindow.show()
    this.mainWindow.focus()
    this.mainWindow.setAlwaysOnTop(true)
    this.isWindowVisible = true
    
    logger.debug("Window centered and shown")
  }

  // New methods for window movement
  public moveWindowRight(): void {
    if (!this.mainWindow) return

    const windowWidth = this.windowSize?.width || 0
    const halfWidth = windowWidth / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentX = Math.min(
      this.screenWidth - halfWidth,
      this.currentX + this.step
    )
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  public moveWindowLeft(): void {
    if (!this.mainWindow) return

    const windowWidth = this.windowSize?.width || 0
    const halfWidth = windowWidth / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentX = Math.max(-halfWidth, this.currentX - this.step)
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  public moveWindowDown(): void {
    if (!this.mainWindow) return

    const windowHeight = this.windowSize?.height || 0
    const halfHeight = windowHeight / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentY = Math.min(
      this.screenHeight - halfHeight,
      this.currentY + this.step
    )
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  public moveWindowUp(): void {
    if (!this.mainWindow) return

    const windowHeight = this.windowSize?.height || 0
    const halfHeight = windowHeight / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentY = Math.max(-halfHeight, this.currentY - this.step)
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  // True Invisibility Mode (Cluely Pro+ Feature)
  // This makes the window invisible to screen capture/recording but VISIBLE to you!
  public toggleInvisibilityMode(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    this.isInvisibleMode = !this.isInvisibleMode

    if (this.isInvisibleMode) {
      // Hide the tray icon in invisibility mode (dock is always hidden)
      this.appState.hideTray()
      
      // macOS: Use setContentProtection to prevent screen capture
      if (process.platform === 'darwin') {
        // This is the KEY - makes window invisible to screen sharing but visible to user
        this.mainWindow.setContentProtection(true)
        
        // Additional layer: Set window level to make it float but not captured
        try {
          // @ts-ignore - using private API for advanced screen capture evasion
          this.mainWindow.setWindowButtonVisibility(false)
        } catch (e) {
          logger.debug('Could not modify window buttons')
        }
      }
      
      // Windows/Linux: Use different technique
      if (process.platform === 'win32') {
        // Windows: Mark window as system overlay to evade capture
        try {
          // @ts-ignore
          this.mainWindow.setSkipTaskbar(true)
          this.mainWindow.setAlwaysOnTop(true, 'screen-saver')
        } catch (e) {
          logger.debug('Windows capture evasion limited')
        }
      }
      
      // Keep window fully visible to user - NO opacity change!
      this.mainWindow.setOpacity(1.0)
      
      // Optional: Make window click-through when in this mode
      // Uncomment if you want click-through behavior
      // this.mainWindow.setIgnoreMouseEvents(true, { forward: true })
      
      // Send event to renderer to show indicator
      this.mainWindow.webContents.send('invisibility-mode-changed', true)
    } else {
      // Show the tray icon when exiting invisibility mode (dock stays hidden always)
      this.appState.showTray()
      
      // Disable screen capture protection
      if (process.platform === 'darwin') {
        this.mainWindow.setContentProtection(false)
      }
      
      if (process.platform === 'win32') {
        this.mainWindow.setAlwaysOnTop(true, 'floating')
      }
      
      // Restore normal state
      this.mainWindow.setOpacity(1.0)
      
      // Re-enable mouse events if they were disabled
      // this.mainWindow.setIgnoreMouseEvents(false)
      
      // Send event to renderer
      this.mainWindow.webContents.send('invisibility-mode-changed', false)
    }
  }

  public getInvisibilityMode(): boolean {
    return this.isInvisibleMode
  }

  public setInvisibilityMode(enabled: boolean): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    
    // Only toggle if the mode is different from current state
    if (this.isInvisibleMode !== enabled) {
      this.toggleInvisibilityMode()
    }
  }
}
