import React, { useEffect, useState } from 'react'
import { TbX, TbDownload, TbRefresh, TbCircleCheck, TbAlertCircle } from 'react-icons/tb'

interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseDate?: string
}

interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

type UpdateState = 
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error'
  | 'idle'

export const UpdateNotification: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdateState>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Listen for update events
    const unsubscribeChecking = window.electronAPI.onUpdateChecking(() => {
      setUpdateState('checking')
      setIsVisible(true)
    })

    const unsubscribeAvailable = window.electronAPI.onUpdateAvailable((info) => {
      setUpdateState('available')
      setUpdateInfo(info)
      setIsVisible(true)
    })

    const unsubscribeNotAvailable = window.electronAPI.onUpdateNotAvailable((info) => {
      setUpdateState('not-available')
      setUpdateInfo(info)
      // Auto-hide after 3 seconds if no update available
      setTimeout(() => setIsVisible(false), 3000)
    })

    const unsubscribeProgress = window.electronAPI.onUpdateDownloadProgress((progress) => {
      setUpdateState('downloading')
      setDownloadProgress(progress)
      setIsVisible(true)
    })

    const unsubscribeDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
      setUpdateState('downloaded')
      setUpdateInfo(info)
      setIsVisible(true)
    })

    const unsubscribeError = window.electronAPI.onUpdateError((err) => {
      setUpdateState('error')
      setError(err.message)
      setIsVisible(true)
      // Auto-hide error after 5 seconds
      setTimeout(() => setIsVisible(false), 5000)
    })

    return () => {
      unsubscribeChecking()
      unsubscribeAvailable()
      unsubscribeNotAvailable()
      unsubscribeProgress()
      unsubscribeDownloaded()
      unsubscribeError()
    }
  }, [])

  const handleDownload = async () => {
    try {
      await window.electronAPI.downloadUpdate()
    } catch (err) {
      console.error('Failed to download update:', err)
    }
  }

  const handleInstall = async () => {
    try {
      await window.electronAPI.installUpdate()
    } catch (err) {
      console.error('Failed to install update:', err)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s'
  }

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {updateState === 'checking' && (
            <>
              <TbRefresh className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="font-semibold text-gray-900 dark:text-white">Checking for updates...</span>
            </>
          )}
          {updateState === 'available' && (
            <>
              <TbDownload className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-gray-900 dark:text-white">Update Available</span>
            </>
          )}
          {updateState === 'downloading' && (
            <>
              <TbDownload className="w-5 h-5 text-blue-500 animate-pulse" />
              <span className="font-semibold text-gray-900 dark:text-white">Downloading...</span>
            </>
          )}
          {updateState === 'downloaded' && (
            <>
              <TbCircleCheck className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-gray-900 dark:text-white">Update Ready</span>
            </>
          )}
          {updateState === 'not-available' && (
            <>
              <TbCircleCheck className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-gray-900 dark:text-white">Up to Date</span>
            </>
          )}
          {updateState === 'error' && (
            <>
              <TbAlertCircle className="w-5 h-5 text-red-500" />
              <span className="font-semibold text-gray-900 dark:text-white">Update Error</span>
            </>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <TbX className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {updateState === 'checking' && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Checking for new versions...
          </p>
        )}

        {updateState === 'available' && updateInfo && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Version <span className="font-semibold text-gray-900 dark:text-white">{updateInfo.version}</span> is available.
            </p>
            {updateInfo.releaseNotes && (
              <div className="text-xs text-gray-500 dark:text-gray-400 max-h-32 overflow-y-auto">
                <p className="font-semibold mb-1">Release Notes:</p>
                <div className="whitespace-pre-wrap">{updateInfo.releaseNotes}</div>
              </div>
            )}
            <button
              onClick={handleDownload}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <TbDownload className="w-4 h-4" />
              Download Update
            </button>
          </div>
        )}

        {updateState === 'downloading' && downloadProgress && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.round(downloadProgress.percent)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}</span>
              <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
            </div>
          </div>
        )}

        {updateState === 'downloaded' && updateInfo && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Version <span className="font-semibold text-gray-900 dark:text-white">{updateInfo.version}</span> has been downloaded and is ready to install.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <TbRefresh className="w-4 h-4" />
                Restart & Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        )}

        {updateState === 'not-available' && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You're running the latest version.
          </p>
        )}

        {updateState === 'error' && error && (
          <div className="space-y-2">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
            <button
              onClick={handleDismiss}
              className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
