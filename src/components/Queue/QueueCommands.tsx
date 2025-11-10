import React, { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { TbSparkles, TbSettings, TbEye, TbMicrophone, TbShieldLock, TbX, TbGripVertical, TbCamera, TbKeyboard, TbInfoCircle } from "react-icons/tb"

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  onChatToggle: () => void
  onSettingsToggle: () => void
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  onChatToggle,
  onSettingsToggle
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioResult, setAudioResult] = useState<string | null>(null)
  const [isInvisibleMode, setIsInvisibleMode] = useState(false)
  const chunks = useRef<Blob[]>([])
  // Remove all chat-related state, handlers, and the Dialog overlay from this file.

  useEffect(() => {
    let tooltipHeight = 0
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
  }, [isTooltipVisible])

  useEffect(() => {
    // Listen for invisibility mode changes from main process
    const handleInvisibilityChange = (isInvisible: boolean) => {
      setIsInvisibleMode(isInvisible)
    }

    const cleanup = (window.electronAPI as any).onInvisibilityModeChanged?.(handleInvisibilityChange)
    
    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  useEffect(() => {
    // Listen for recording toggle shortcut
    const cleanup = (window.electronAPI as any).onToggleRecording?.(() => {
      handleRecordClick()
    })
    
    return () => {
      if (cleanup) cleanup()
    }
  }, [isRecording, mediaRecorder])

  const handleMouseEnter = () => {
    setIsTooltipVisible(true)
  }

  const handleMouseLeave = () => {
    setIsTooltipVisible(false)
  }

  const handleRecordClick = async () => {
    if (!isRecording) {
      // Start recording
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        })
        
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = (e) => chunks.current.push(e.data)
        recorder.onstop = async () => {
          // Stop all tracks to release the microphone/system audio
          stream.getTracks().forEach(track => track.stop())
          
          const blob = new Blob(chunks.current, { type: chunks.current[0]?.type || 'audio/webm' })
          chunks.current = []
          const reader = new FileReader()
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1]
            try {
              const result = await window.electronAPI.analyzeAudioFromBase64(base64Data, blob.type)
              if ('error' in result) {
                setAudioResult(`Error: ${(result as any).message}`)
              } else {
                setAudioResult(result.text)
              }
            } catch (err) {
              setAudioResult('Audio analysis failed.')
            }
          }
          reader.readAsDataURL(blob)
        }
        setMediaRecorder(recorder)
        recorder.start()
        setIsRecording(true)
      } catch (err) {
        setAudioResult('Could not start recording. Please allow microphone access.')
      }
    } else {
      // Stop recording
      mediaRecorder?.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const handleInvisibilityToggle = () => {
    // Toggle invisibility mode - keyboard shortcut Cmd+I will do the same
    window.electronAPI.invoke('toggle-invisibility-mode')
  }

  const handleScreenshotAndAnalyze = async () => {
    try {
      // Take screenshot - this will trigger the onScreenshotTaken event in Queue.tsx
      // which automatically opens chat and analyzes the image
      await window.electronAPI.takeScreenshot()
    } catch (error) {
      console.error('Error taking screenshot:', error)
    }
  }

  return (
    <div className="w-fit">
      {/* Cluely-style Minimalist Command Bar */}
      <div className="flex items-center gap-2">
        {/* Main controls bar - single horizontal row */}
        <div className="liquid-glass-bar flex items-center gap-2">
          {/* Invisibility Mode Toggle - Eye Icon */}
          <button
            className={`
              p-1.5 rounded-lg transition-all
              ${isInvisibleMode 
                ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/10'
              }
            `}
            onClick={handleInvisibilityToggle}
            type="button"
            title="Privacy Mode (Cmd+I)"
          >
            {isInvisibleMode ? <TbShieldLock size={18} /> : <TbEye size={18} />}
          </button>

          {/* Voice Recording - Mic Icon */}
          <button
            className={`p-1.5 rounded-lg transition-all ${
              isRecording 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            onClick={handleRecordClick}
            type="button"
            title="Voice Recording (Cmd+G)"
          >
            <TbMicrophone size={18} />
          </button>

          {/* Screenshot - Camera Icon */}
          <button
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            onClick={handleScreenshotAndAnalyze}
            type="button"
            title="Screenshot & Analyze (Cmd+H)"
          >
            <TbCamera size={18} />
          </button>

          {/* Chat/AI - Sparkles Icon */}
          <button
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            onClick={onChatToggle}
            type="button"
            title="Ask AI (Cmd+J)"
          >
            <TbSparkles size={18} />
          </button>

          {/* Settings - Gear Icon */}
          <button
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            onClick={onSettingsToggle}
            type="button"
            title="Settings"
          >
            <TbSettings size={18} />
          </button>

          {/* Separator */}
          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Help/Info - Question Mark */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              type="button"
              title="Keyboard Shortcuts"
            >
              <TbInfoCircle size={18} />
            </button>

            {/* Tooltip - Minimalist Cluely Style */}
            {isTooltipVisible && (
              <div
                ref={tooltipRef}
                className="absolute z-[9999]"
                style={{
                  top: 'calc(100% + 12px)',
                  right: '0',
                }}
              >
                <div className="liquid-glass rounded-lg p-2.5 w-64 shadow-2xl border border-white/10">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                    <TbKeyboard size={14} className="text-teal-400" />
                    <span className="text-[11px] font-medium text-white">Shortcuts</span>
                  </div>
                  
                  {/* Shortcuts List - Minimal */}
                  <div className="space-y-1.5">
                    {/* Privacy Mode */}
                    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <TbShieldLock size={14} className="text-teal-400" />
                        <span className="text-[10px] text-gray-300">Privacy Mode</span>
                      </div>
                      <div className="flex gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-gray-300 font-mono">⌘</kbd>
                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-gray-300 font-mono">I</kbd>
                      </div>
                    </div>

                    {/* Screenshot */}
                    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <TbCamera size={14} className="text-blue-400" />
                        <span className="text-[10px] text-gray-300">Screenshot</span>
                      </div>
                      <div className="flex gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-gray-300 font-mono">⌘</kbd>
                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-gray-300 font-mono">H</kbd>
                      </div>
                    </div>

                    {/* Voice */}
                    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <TbMicrophone size={14} className="text-red-400" />
                        <span className="text-[10px] text-gray-300">Voice</span>
                      </div>
                      <div className="flex gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-gray-300 font-mono">⌘</kbd>
                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-gray-300 font-mono">G</kbd>
                      </div>
                    </div>

                    {/* Chat */}
                    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <TbSparkles size={14} className="text-teal-400" />
                        <span className="text-[10px] text-gray-300">Chat</span>
                      </div>
                      <div className="flex gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-gray-300 font-mono">⌘</kbd>
                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-gray-300 font-mono">J</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drag Handle */}
          <button
            className="p-1.5 text-gray-500 hover:text-gray-400 transition-colors cursor-move draggable-area"
            title="Move Window"
            type="button"
          >
            <TbGripVertical size={18} />
          </button>
        </div>

        {/* Close button - separate pill */}
        <div className="liquid-glass-bar">
          <button
            className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Quit App"
            onClick={() => window.electronAPI.quitApp()}
            type="button"
          >
            <TbX size={18} />
          </button>
        </div>
      </div>

      {/* Audio Result Display - Minimalist */}
      {audioResult && (
        <div className="mt-3 liquid-glass rounded-lg p-3 max-w-md animate-slide-up relative">
          <button
            onClick={() => setAudioResult(null)}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all"
            aria-label="Close"
            type="button"
          >
            <TbX size={14} />
          </button>
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 flex-shrink-0">
              <TbMicrophone size={14} className="text-teal-400" />
            </div>
            <div className="flex-1 pr-6">
              <p className="text-[10px] font-medium text-teal-400 mb-1.5">Audio Transcription</p>
              <div className="text-[11px] leading-relaxed text-gray-300">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                    em: ({node, ...props}) => <em className="italic text-gray-400" {...props} />,
                    code: ({node, className, ...props}) => {
                      const isInline = !className?.includes('language-')
                      return isInline ? (
                        <code className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] font-mono text-teal-400" {...props} />
                      ) : (
                        <code className="block bg-black/30 p-2 rounded text-[10px] font-mono overflow-x-auto my-1.5" {...props} />
                      )
                    },
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-0.5 ml-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-0.5 ml-2" {...props} />,
                    li: ({node, ...props}) => <li className="text-[10px]" {...props} />,
                  }}
                >
                  {audioResult}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QueueCommands
