import { globalShortcut, app } from "electron"
import { AppState } from "./main" // Adjust the import path if necessary
import { logger } from "./Logger"

export class ShortcutsHelper {
  private appState: AppState

  constructor(appState: AppState) {
    this.appState = appState
  }

  public registerGlobalShortcuts(): void {
    // Add global shortcut to show/center window
    globalShortcut.register("CommandOrControl+Shift+Space", () => {
      logger.debug("Show/Center window shortcut pressed")
      this.appState.centerAndShowWindow()
    })

    globalShortcut.register("CommandOrControl+H", async () => {
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow) {
        logger.debug("Taking screenshot via shortcut")
        try {
          const screenshotPath = await this.appState.takeScreenshot()
          const preview = await this.appState.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
        } catch (error) {
          logger.error("Error capturing screenshot", { error })
          
          // Send error to renderer process instead of showing dialog
          const errorMessage = error instanceof Error ? error.message : String(error)
          mainWindow.webContents.send("screenshot-error", errorMessage)
        }
      }
    })

    globalShortcut.register("CommandOrControl+Enter", async () => {
      await this.appState.processingHelper.processScreenshots()
    })

    globalShortcut.register("CommandOrControl+R", () => {
      logger.debug("Command + R pressed. Canceling requests and resetting queues")

      // Cancel ongoing API requests
      this.appState.processingHelper.cancelOngoingRequests()

      // Clear both screenshot queues
      this.appState.clearQueues()

      logger.debug("Cleared queues")

      // Update the view state to 'queue'
      this.appState.setView("queue")

      // Notify renderer process to switch view to 'queue'
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
      }
    })

    // New shortcuts for moving the window
    globalShortcut.register("CommandOrControl+Left", () => {
      logger.debug("Command/Ctrl + Left pressed. Moving window left")
      this.appState.moveWindowLeft()
    })

    globalShortcut.register("CommandOrControl+Right", () => {
      logger.debug("Command/Ctrl + Right pressed. Moving window right")
      this.appState.moveWindowRight()
    })
    globalShortcut.register("CommandOrControl+Down", () => {
      logger.debug("Command/Ctrl + down pressed. Moving window down")
      this.appState.moveWindowDown()
    })
    globalShortcut.register("CommandOrControl+Up", () => {
      logger.debug("Command/Ctrl + Up pressed. Moving window Up")
      this.appState.moveWindowUp()
    })

    globalShortcut.register("CommandOrControl+B", () => {
      this.appState.toggleMainWindow()
      // If window exists and we're showing it, bring it to front
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && !this.appState.isVisible()) {
        // Force the window to the front on macOS
        if (process.platform === "darwin") {
          mainWindow.setAlwaysOnTop(true, "normal")
          // Reset alwaysOnTop after a brief delay
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setAlwaysOnTop(true, "floating")
            }
          }, 100)
        }
      }
    })

    // Invisibility Mode Toggle (Cluely Pro+ Feature)
    globalShortcut.register("CommandOrControl+I", () => {
      logger.debug("Command/Ctrl + I pressed. Toggling invisibility mode")
      this.appState.toggleInvisibilityMode()
    })

    // Audio Recording Toggle
    globalShortcut.register("CommandOrControl+G", () => {
      logger.debug("Command/Ctrl + G pressed. Toggling audio recording")
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("toggle-recording")
      }
    })

    // Chat Toggle (Cmd+J)
    globalShortcut.register("CommandOrControl+J", () => {
      logger.debug("Command/Ctrl + J pressed. Toggling chat")
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("toggle-chat")
      }
    })

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      this.unregisterAll()
    })
  }

  /**
   * Unregister all global shortcuts
   * Called during application cleanup
   */
  public unregisterAll(): void {
    logger.debug("Unregistering all global shortcuts")
    globalShortcut.unregisterAll()
  }
}
