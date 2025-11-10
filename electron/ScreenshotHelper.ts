// ScreenshotHelper.ts

import path from "node:path"
import fs from "node:fs"
import { app } from "electron"
import { v4 as uuidv4 } from "uuid"
import screenshot from "screenshot-desktop"
import { exec } from "node:child_process"
import { promisify } from "node:util"
import { logger } from "./Logger"

const execAsync = promisify(exec)

export class ScreenshotHelper {
  private screenshotQueue: string[] = []
  private extraScreenshotQueue: string[] = []
  private readonly MAX_SCREENSHOTS = 5

  private readonly screenshotDir: string
  private readonly extraScreenshotDir: string

  private view: "queue" | "solutions" = "queue"

  constructor(view: "queue" | "solutions" = "queue") {
    this.view = view

    // Initialize directories
    this.screenshotDir = path.join(app.getPath("userData"), "screenshots")
    this.extraScreenshotDir = path.join(
      app.getPath("userData"),
      "extra_screenshots"
    )

    // Create directories if they don't exist
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir)
    }
    if (!fs.existsSync(this.extraScreenshotDir)) {
      fs.mkdirSync(this.extraScreenshotDir)
    }
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotQueue
  }

  public getExtraScreenshotQueue(): string[] {
    return this.extraScreenshotQueue
  }

  public clearQueues(): void {
    // Clear screenshotQueue
    this.screenshotQueue.forEach((screenshotPath) => {
      fs.unlink(screenshotPath, (err) => {
        if (err)
          logger.error("Error deleting screenshot", { path: screenshotPath, error: err })
      })
    })
    this.screenshotQueue = []

    // Clear extraScreenshotQueue
    this.extraScreenshotQueue.forEach((screenshotPath) => {
      fs.unlink(screenshotPath, (err) => {
        if (err)
          logger.error("Error deleting extra screenshot", { path: screenshotPath, error: err })
      })
    })
    this.extraScreenshotQueue = []
  }

  public async takeScreenshot(
    hideMainWindow: () => void,
    showMainWindow: () => void
  ): Promise<string> {
    let screenshotPath = ""
    
    try {
      hideMainWindow()
      
      // Add a small delay to ensure window is hidden
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const targetDir = this.view === "queue" ? this.screenshotDir : this.extraScreenshotDir
      screenshotPath = path.join(targetDir, `${uuidv4()}.png`)
      
      logger.debug("Attempting to capture screenshot", { path: screenshotPath })
      
      // Try using native macOS screencapture command first (more reliable)
      try {
        if (process.platform === 'darwin') {
          // Use macOS native screencapture command
          await execAsync(`screencapture -x "${screenshotPath}"`)
          logger.debug("Screenshot captured using native screencapture")
        } else {
          // Fallback to screenshot-desktop library for other platforms
          await screenshot({ filename: screenshotPath })
          logger.debug("Screenshot captured using screenshot-desktop library")
        }
      } catch (screenshotError: any) {
        logger.error("Screenshot capture error", { error: screenshotError })
        
        // Check for permission errors
        const errorMsg = screenshotError?.message || String(screenshotError)
        if (errorMsg.includes("could not create image") || 
            errorMsg.includes("screencapture") ||
            errorMsg.includes("permission") ||
            errorMsg.includes("not authorized")) {
          throw new Error(
            "Screen Recording permission denied. Please enable Screen Recording for this app in System Settings > Privacy & Security > Screen Recording"
          )
        }
        throw screenshotError
      }
      
      // Wait a bit for the file to be written
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify the file was actually created and has content
      let retries = 3
      while (retries > 0) {
        if (fs.existsSync(screenshotPath)) {
          const stats = fs.statSync(screenshotPath)
          if (stats.size > 0) {
            logger.debug("Screenshot file created successfully", { 
              path: screenshotPath, 
              size: stats.size 
            })
            break
          }
        }
        
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          throw new Error("Screenshot file was not created or is empty")
        }
      }

      // Add to appropriate queue
      if (this.view === "queue") {
        this.screenshotQueue.push(screenshotPath)
        if (this.screenshotQueue.length > this.MAX_SCREENSHOTS) {
          const removedPath = this.screenshotQueue.shift()
          if (removedPath) {
            try {
              await fs.promises.unlink(removedPath)
            } catch (error) {
              logger.error("Error removing old screenshot", { error })
            }
          }
        }
      } else {
        this.extraScreenshotQueue.push(screenshotPath)
        if (this.extraScreenshotQueue.length > this.MAX_SCREENSHOTS) {
          const removedPath = this.extraScreenshotQueue.shift()
          if (removedPath) {
            try {
              await fs.promises.unlink(removedPath)
            } catch (error) {
              logger.error("Error removing old screenshot", { error })
            }
          }
        }
      }

      return screenshotPath
    } catch (error: any) {
      logger.error("Error capturing screenshot", { error })
      
      // Clean up failed screenshot file if it exists
      if (screenshotPath && fs.existsSync(screenshotPath)) {
        try {
          fs.unlinkSync(screenshotPath)
        } catch (cleanupError) {
          logger.warn("Failed to clean up failed screenshot", { cleanupError })
        }
      }
      
      const errorMessage = error?.message || String(error)
      
      // Check if it's a permission error
      if (errorMessage.includes("Screen Recording permission") ||
          errorMessage.includes("could not create image from display") || 
          errorMessage.includes("screencapture") ||
          errorMessage.includes("permission")) {
        throw new Error(
          "Screen Recording permission denied. Please enable Screen Recording for this app in System Settings > Privacy & Security > Screen Recording"
        )
      }
      
      throw new Error(`Failed to capture screenshot: ${errorMessage}`)
    } finally {
      // Ensure window is always shown again
      showMainWindow()
    }
  }

  public async getImagePreview(filepath: string): Promise<string> {
    try {
      const data = await fs.promises.readFile(filepath)
      return `data:image/png;base64,${data.toString("base64")}`
    } catch (error) {
      logger.error("Error reading image", { filepath, error })
      throw error
    }
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await fs.promises.unlink(path)
      if (this.view === "queue") {
        this.screenshotQueue = this.screenshotQueue.filter(
          (filePath) => filePath !== path
        )
      } else {
        this.extraScreenshotQueue = this.extraScreenshotQueue.filter(
          (filePath) => filePath !== path
        )
      }
      return { success: true }
    } catch (error) {
      logger.error("Error deleting file", { path, error })
      return { success: false, error: error.message }
    }
  }

  /**
   * Clean up all temporary screenshot files
   * Called during application cleanup
   */
  public async cleanupTempFiles(): Promise<void> {
    logger.debug("Cleaning up temporary screenshot files")

    try {
      // Clean up screenshot queue files
      for (const screenshotPath of this.screenshotQueue) {
        try {
          if (fs.existsSync(screenshotPath)) {
            await fs.promises.unlink(screenshotPath)
            logger.debug("Deleted screenshot file", { path: screenshotPath })
          }
        } catch (error) {
          logger.warn("Failed to delete screenshot file", { path: screenshotPath, error })
        }
      }

      // Clean up extra screenshot queue files
      for (const screenshotPath of this.extraScreenshotQueue) {
        try {
          if (fs.existsSync(screenshotPath)) {
            await fs.promises.unlink(screenshotPath)
            logger.debug("Deleted extra screenshot file", { path: screenshotPath })
          }
        } catch (error) {
          logger.warn("Failed to delete extra screenshot file", { path: screenshotPath, error })
        }
      }

      // Clear the queues
      this.screenshotQueue = []
      this.extraScreenshotQueue = []

      logger.debug("Temporary screenshot files cleanup completed")
    } catch (error) {
      logger.error("Error during screenshot cleanup", { error })
    }
  }
}
