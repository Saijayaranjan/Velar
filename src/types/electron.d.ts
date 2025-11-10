export interface ElectronAPI {
  updateContentDimensions: (dimensions: {
    width: number
    height: number
  }) => Promise<void>
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => () => void
  onScreenshotError: (callback: (error: string) => void) => () => void
  onSolutionsReady: (callback: (solutions: string) => void) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: any) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onProblemExtracted: (callback: (data: any) => void) => () => void
  onSolutionSuccess: (callback: (data: any) => void) => () => void
  onUnauthorized: (callback: () => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  takeScreenshot: () => Promise<void>
  moveWindowLeft: () => Promise<void>
  moveWindowRight: () => Promise<void>
  moveWindowUp: () => Promise<void>
  moveWindowDown: () => Promise<void>
  analyzeAudioFromBase64: (data: string, mimeType: string) => Promise<{ text: string; timestamp: number } | { error: boolean; message: string }>
  analyzeAudioFile: (path: string) => Promise<{ text: string; timestamp: number } | { error: boolean; message: string }>
  quitApp: () => Promise<void>
  onInvisibilityModeChanged: (callback: (isInvisible: boolean) => void) => () => void
  getCurrentLlmConfig: () => Promise<{ provider: "ollama" | "gemini"; model: string; isOllama: boolean }>
  getAvailableOllamaModels: () => Promise<string[]>
  getAvailableGeminiModels: () => Promise<Array<{ id: string; name: string; description: string }>>
  fetchAvailableGeminiModels: () => Promise<Array<{ id: string; name: string; description: string; supportedGenerationMethods: string[] }>>
  switchToOllama: (model?: string, url?: string) => Promise<{ success: boolean; error?: string }>
  switchToGemini: (apiKey?: string, model?: string) => Promise<{ success: boolean; error?: string }>
  switchGeminiModel: (model: string) => Promise<{ success: boolean; error?: string }>
  testLlmConnection: () => Promise<{ success: boolean; error?: string; capabilities?: { text: boolean; image: boolean; audio: boolean } }>
  invoke: (channel: string, ...args: any[]) => Promise<any>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}