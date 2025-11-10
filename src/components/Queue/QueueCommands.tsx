import React, { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { MessageSquare, Settings, Eye, Mic, ShieldOff, X, GripVertical } from "lucide-react"
import { Dialog, DialogContent, DialogClose } from "../ui/dialog"

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  screenshots: Array<{ path: string; preview: string }>
  onChatToggle: () => void
  onSettingsToggle: () => void
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  screenshots,
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

    const cleanup = window.electronAPI.onInvisibilityModeChanged?.(handleInvisibilityChange)
    
    return () => {
      if (cleanup) cleanup()
    }
  }, [])

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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = (e) => chunks.current.push(e.data)
        recorder.onstop = async () => {
          const blob = new Blob(chunks.current, { type: chunks.current[0]?.type || 'audio/webm' })
          chunks.current = []
          const reader = new FileReader()
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1]
            try {
              const result = await window.electronAPI.analyzeAudioFromBase64(base64Data, blob.type)
              setAudioResult(result.text)
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
        setAudioResult('Could not start recording.')
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

  // Remove handleChatSend function

  return (
    <div className="w-fit">
      {/* Minimalist Cluely-style Command Bar */}
      <div className="flex items-center gap-3">
        {/* Main controls bubble */}
        <div className="liquid-glass-bar flex items-center gap-3 text-[11px]">
          {/* Invisibility Mode Toggle */}
          <button
            className={`
              px-3 py-1 rounded-full text-[10px] flex items-center gap-1.5 transition-all font-medium
              ${isInvisibleMode 
                ? 'bg-cluely-accent-teal/15 text-cluely-accent-teal border border-cluely-accent-teal/30 hover:bg-cluely-accent-teal/25' 
                : 'text-cluely-text-secondary hover:text-cluely-text-primary hover:bg-white/5'
              }
            `}
            onClick={handleInvisibilityToggle}
            type="button"
            title="Privacy Mode (Cmd+I)"
          >
            {isInvisibleMode ? (
              <>
                <ShieldOff size={14} />
                <span>Hidden</span>
              </>
            ) : (
              <>
                <Eye size={14} />
                <span>Visible</span>
              </>
            )}
          </button>

          {/* Vertical Separator */}
          <div className="h-4 w-px bg-white/10" />

          {/* Solve Command - Only show when screenshots exist */}
          {screenshots.length > 0 && (
            <>
              <button className="flex items-center gap-1.5 text-cluely-accent-teal hover:text-cluely-accent-cyan transition-colors">
                <span className="font-medium">Solve</span>
                <div className="flex gap-0.5">
                  <kbd className="px-1.5 py-0.5 bg-cluely-accent-teal/10 rounded text-[10px] border border-cluely-accent-teal/20">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 bg-cluely-accent-teal/10 rounded text-[10px] border border-cluely-accent-teal/20">↵</kbd>
                </div>
              </button>
              <div className="h-4 w-px bg-white/10" />
            </>
          )}

          {/* Voice Recording */}
          <button
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
              isRecording 
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' 
                : 'text-cluely-text-secondary hover:text-cluely-text-primary hover:bg-white/5'
            }`}
            onClick={handleRecordClick}
            type="button"
          >
            {isRecording ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="font-medium">Recording...</span>
              </>
            ) : (
              <Mic size={16} />
            )}
          </button>

          {/* Chat Toggle */}
          <button
            className="text-cluely-text-secondary hover:text-cluely-text-primary hover:bg-white/5 px-2 py-1 rounded-lg transition-all"
            onClick={onChatToggle}
            type="button"
          >
            <MessageSquare size={16} />
          </button>

          {/* Settings Toggle */}
          <button
            className="text-cluely-text-secondary hover:text-cluely-text-primary hover:bg-white/5 px-2 py-1 rounded-lg transition-all"
            onClick={onSettingsToggle}
            type="button"
          >
            <Settings size={16} />
          </button>

          {/* Help Tooltip */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-help transition-colors">
              <span className="text-[10px] text-cluely-text-muted">?</span>
            </div>

            {/* Tooltip Content */}
            {isTooltipVisible && (
              <div
                ref={tooltipRef}
                className="absolute right-0 z-[9999] animate-fade-in"
                style={{
                  top: 'calc(100% + 20px)',
                  transformOrigin: 'top right'
                }}
              >
                <div className="keyboard-shortcuts-panel">
                  {/* Header */}
                  <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/10">
                    <div className="p-1 rounded-lg bg-gradient-to-br from-cluely-accent-teal/20 to-cluely-accent-cyan/10 border border-cluely-accent-teal/20">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-cluely-accent-teal">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-semibold text-cluely-text-primary">Shortcuts</h3>
                  </div>
                  
                  {/* Shortcuts List */}
                  <div className="space-y-2">
                    {/* Privacy Mode */}
                    <div className="shortcut-row">
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="shortcut-icon teal">
                          <ShieldOff size={11} />
                        </div>
                        <div>
                          <div className="shortcut-title">Privacy Mode</div>
                          <div className="shortcut-description">Prevent screen capture</div>
                        </div>
                      </div>
                      <div className="shortcut-keys">
                        <kbd className="shortcut-key accent">⌘</kbd>
                        <kbd className="shortcut-key accent">I</kbd>
                      </div>
                    </div>

                    {/* Screenshot */}
                    <div className="shortcut-row">
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="shortcut-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-2.5 h-2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                          </svg>
                        </div>
                        <div>
                          <div className="shortcut-title">Screenshot</div>
                          <div className="shortcut-description">Capture screen</div>
                        </div>
                      </div>
                      <div className="shortcut-keys">
                        <kbd className="shortcut-key">⌘</kbd>
                        <kbd className="shortcut-key">H</kbd>
                      </div>
                    </div>

                    {/* Analyze */}
                    <div className="shortcut-row">
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="shortcut-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-2.5 h-2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                          </svg>
                        </div>
                        <div>
                          <div className="shortcut-title">Analyze</div>
                          <div className="shortcut-description">Process with AI</div>
                        </div>
                      </div>
                      <div className="shortcut-keys">
                        <kbd className="shortcut-key">⌘</kbd>
                        <kbd className="shortcut-key">↵</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Footer Note */}
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="flex items-start gap-1.5 text-[8px] text-cluely-text-muted leading-relaxed">
                      <ShieldOff size={10} className="text-cluely-accent-teal flex-shrink-0 mt-0.5" />
                      <span>Privacy mode prevents screen capture while keeping UI visible</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="h-4 w-px bg-white/10" />

          {/* Move Button */}
          <button
            className="text-cluely-text-secondary hover:text-cluely-text-primary transition-colors p-1 cursor-move draggable-area"
            title="Move Window"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Close button in separate circular bubble */}
        <div className="liquid-glass-bar w-8 h-8 rounded-full flex items-center justify-center">
          <button
            className="text-red-400/70 hover:text-red-400 transition-colors"
            title="Close App"
            onClick={() => window.electronAPI.quitApp()}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audio Result Display (if any) */}
      {audioResult && (
        <div className="mt-2 modern-audio-result animate-slide-up">
          <button
            onClick={() => setAudioResult(null)}
            className="absolute top-2 right-2 text-cluely-text-secondary hover:text-cluely-accent-teal transition-colors p-1 rounded hover:bg-white/5"
            aria-label="Close audio result"
          >
            <X size={14} />
          </button>
          <div className="flex items-start gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-cluely-accent-teal/10 border border-cluely-accent-teal/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-cluely-accent-teal">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-cluely-accent-teal uppercase tracking-wide mb-1">AI Audio Analysis</p>
              <div className="audio-markdown-content text-[11px] leading-relaxed text-cluely-text-primary">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-cluely-accent-teal" {...props} />,
                    em: ({node, ...props}) => <em className="italic text-cluely-text-secondary" {...props} />,
                    code: ({node, className, ...props}) => {
                      const isInline = !className?.includes('language-')
                      return isInline ? (
                        <code className="bg-cluely-dark-bg/70 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/10 text-cluely-accent-cyan" {...props} />
                      ) : (
                        <code className="block bg-cluely-dark-bg/70 p-2 rounded-lg text-[10px] font-mono overflow-x-auto my-1.5 border border-white/10" {...props} />
                      )
                    },
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-0.5 text-cluely-text-secondary ml-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-0.5 text-cluely-text-secondary ml-2" {...props} />,
                    li: ({node, ...props}) => <li className="text-[10px]" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-xs font-semibold mb-1.5 text-cluely-accent-teal" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-[11px] font-semibold mb-1.5 text-cluely-accent-teal" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-[10px] font-medium mb-1 text-cluely-text-primary" {...props} />,
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
