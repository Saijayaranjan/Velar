import React, { useState, useEffect, useRef } from "react"
import { useQuery } from "react-query"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { MessageSquare, Cloud, Home, Settings as SettingsIcon, RefreshCw } from 'lucide-react'
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant,
  ToastMessage
} from "../components/ui/toast"
import QueueCommands from "../components/Queue/QueueCommands"
import ModelSelector from "../components/ui/ModelSelector"

interface QueueProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug">>
}

const Queue: React.FC<QueueProps> = ({ setView }) => {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<{role: "user"|"gemini", text: string}[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  
  const [screenshotError, setScreenshotError] = useState<string | null>(null)
  const [noScreenshotsError, setNoScreenshotsError] = useState<boolean>(false)
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [currentModel, setCurrentModel] = useState<{ provider: string; model: string }>({ provider: "gemini", model: "gemini-2.0-flash" })
  const [isInvisibleMode, setIsInvisibleMode] = useState(false)

  const barRef = useRef<HTMLDivElement>(null)

  const { data: screenshots = [], refetch } = useQuery<Array<{ path: string; preview: string }>, Error>(
    ["screenshots"],
    async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        return existing
      } catch (error) {
        console.error("Error loading screenshots:", error)
        showToast("Error", "Failed to load existing screenshots", "error")
        return []
      }
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity,
      refetchOnWindowFocus: true,
      refetchOnMount: true
    }
  )

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch()
      } else {
        console.error("Failed to delete screenshot:", response.error)
        showToast("Error", "Failed to delete the screenshot file", "error")
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error)
    }
  }

  const handleChatSend = async () => {
    if (!chatInput.trim()) return
    setChatMessages((msgs) => [...msgs, { role: "user", text: chatInput }])
    setChatLoading(true)
    setChatInput("")
    try {
      // Get all screenshots to send with the message
      const screenshotPaths = screenshots.map(s => s.path)
      const response = await window.electronAPI.invoke("gemini-chat", chatInput, screenshotPaths)
      setChatMessages((msgs) => [...msgs, { role: "gemini", text: response }])
    } catch (err) {
      setChatMessages((msgs) => [...msgs, { role: "gemini", text: "Error: " + String(err) }])
    } finally {
      setChatLoading(false)
      chatInputRef.current?.focus()
    }
  }

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  // Load current model configuration on mount
  useEffect(() => {
    const loadCurrentModel = async () => {
      try {
        const config = await window.electronAPI.getCurrentLlmConfig();
        setCurrentModel({ provider: config.provider, model: config.model });
      } catch (error) {
        console.error('Error loading current model config:', error);
      }
    };
    loadCurrentModel();
  }, []);

  // Listen for invisibility mode changes
  useEffect(() => {
    const cleanup = window.electronAPI.onInvisibilityModeChanged((isInvisible: boolean) => {
      setIsInvisibleMode(isInvisible)
      // DO NOT hide the UI - user should still see it!
      // Only screen sharing software won't detect it
    })
    
    return () => {
      cleanup()
    }
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onScreenshotError((error: string) => {
        // Set error state to show beside pill
        setScreenshotError(error)
        // Auto-clear after 5 seconds
        setTimeout(() => setScreenshotError(null), 5000)
      }),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onSolutionError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your screenshots.",
          "error"
        )
        setView("queue")
        console.error("Processing error:", error)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        setNoScreenshotsError(true)
        setTimeout(() => setNoScreenshotsError(false), 5000)
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [isTooltipVisible, tooltipHeight])

  // Seamless screenshot-to-LLM flow
  useEffect(() => {
    // Listen for screenshot taken event
    const unsubscribe = window.electronAPI.onScreenshotTaken(async (data) => {
      // Refetch screenshots to update the queue
      await refetch();
      // Show loading in chat
      setChatLoading(true);
      try {
        // Get the latest screenshot path
        const latest = data?.path || (Array.isArray(data) && data.length > 0 && data[data.length - 1]?.path);
        if (latest) {
          // Call the LLM to process the screenshot
          const response = await window.electronAPI.invoke("analyze-image-file", latest);
          setChatMessages((msgs) => [...msgs, { role: "gemini", text: response.text }]);
        }
      } catch (err) {
        setChatMessages((msgs) => [...msgs, { role: "gemini", text: "Error: " + String(err) }]);
      } finally {
        setChatLoading(false);
      }
    });
    return () => {
      unsubscribe && unsubscribe();
    };
  }, [refetch]);

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen)
  }

  const handleSettingsToggle = () => {
    setIsSettingsOpen(!isSettingsOpen)
  }

  const handleModelChange = (provider: "ollama" | "gemini", model: string) => {
    setCurrentModel({ provider, model })
    // Update chat messages to reflect the model change
    const modelName = provider === "ollama" ? model : "Gemini 2.0 Flash"
    const providerIcon = provider === "ollama" ? "Local" : "Cloud"
    setChatMessages((msgs) => [...msgs, { 
      role: "gemini", 
      text: `Switched to ${providerIcon} ${modelName}. Ready for your questions!` 
    }])
  }


  return (
    <div
      ref={barRef}
      style={{
        position: "relative",
        width: "100%",
        pointerEvents: "auto"
      }}
      className="select-none"
    >
      <div className="bg-transparent w-full">
        <div className="px-2 py-1.5">
          <Toast
            open={toastOpen}
            onOpenChange={setToastOpen}
            variant={toastMessage.variant}
            duration={3000}
          >
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </Toast>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-fit">
              <QueueCommands
                screenshots={screenshots}
                onTooltipVisibilityChange={handleTooltipVisibilityChange}
                onChatToggle={handleChatToggle}
                onSettingsToggle={handleSettingsToggle}
              />
            </div>
            
            {/* Screenshot Error Display - Compact pill beside commands */}
            {screenshotError && (
              <button
                onClick={() => {
                  if (screenshotError.includes("Screen Recording")) {
                    // Open System Settings to Screen Recording permission
                    window.electronAPI.invoke("open-screen-recording-settings")
                  }
                }}
                className={`liquid-glass px-3 py-1.5 flex items-center gap-2 animate-slide-up ${
                  screenshotError.includes("Screen Recording") 
                    ? 'cursor-pointer hover:bg-red-400/10 transition-colors' 
                    : 'cursor-default'
                }`}
                title={screenshotError.includes("Screen Recording") ? "Click to open System Settings" : ""}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></div>
                <span className="text-[10px] text-red-400/90 whitespace-nowrap">
                  {screenshotError.includes("Screen Recording") 
                    ? "Screen Recording permission required" 
                    : "Screenshot failed"}
                </span>
              </button>
            )}
            
            {/* No Screenshots Error Display - Similar styling to screenshot error */}
            {noScreenshotsError && (
              <div className="liquid-glass px-3 py-1.5 flex items-center gap-2 animate-slide-up">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                <span className="text-[10px] text-amber-400/90 whitespace-nowrap">
                  No screenshots to process
                </span>
              </div>
            )}
          </div>
          
          {/* Modern Chat Interface */}
          {isChatOpen && (
            <div className="mt-2 w-full animate-slide-up">
              <div className="modern-chat-container rounded-xl p-2.5 flex flex-col">
                {/* Elegant Chat Header */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-cluely-accent-teal/20 to-cluely-accent-cyan/10 border border-cluely-accent-teal/30">
                      <MessageSquare size={13} className="text-cluely-accent-teal" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-cluely-text-primary">AI Assistant</div>
                      <div className="text-[9px] text-cluely-text-muted flex items-center gap-1.5 mt-0.5">
                        {currentModel.provider === "ollama" ? (
                          <><Home size={9} className="text-cluely-accent-cyan" /> Local</>
                        ) : (
                          <><Cloud size={9} className="text-cluely-accent-teal" /> Cloud</>
                        )}
                        <span className="text-cluely-text-muted/60">•</span>
                        <span className="text-cluely-text-muted">{currentModel.model}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsChatExpanded(!isChatExpanded)}
                    className="modern-icon-button group"
                    title={isChatExpanded ? "Collapse" : "Expand"}
                  >
                    {isChatExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Modern Messages Area */}
                <div 
                  ref={chatMessagesRef}
                  className={`flex-1 overflow-y-auto mb-2 space-y-2 transition-all duration-300 ${isChatExpanded ? 'max-h-80 min-h-[160px]' : 'max-h-48 min-h-[100px]'}`}
                >
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-4 space-y-2.5">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-cluely-accent-teal/10 to-cluely-accent-cyan/5 border border-cluely-accent-teal/20">
                        <MessageSquare size={18} className="text-cluely-accent-teal opacity-60" />
                      </div>
                      <div className="text-center space-y-1.5">
                        <p className="text-[10px] text-cluely-text-secondary font-medium">Start a conversation</p>
                        <p className="text-[9px] text-cluely-text-muted max-w-xs">
                          Take a screenshot (Cmd+H) for automatic analysis or type a message below
                        </p>
                        <div className="flex items-center justify-center gap-1.5 text-[9px] text-cluely-text-muted pt-1">
                          <SettingsIcon size={10} className="text-cluely-accent-teal" />
                          <span>Switch AI models in settings</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                        >
                          <div
                            className={`max-w-[85%] px-2.5 py-2 rounded-xl text-[10px] shadow-sm backdrop-blur-sm markdown-content transition-all hover:shadow-md ${
                              msg.role === "user" 
                                ? "bg-gradient-to-br from-cluely-accent-teal/20 to-cluely-accent-cyan/10 text-cluely-text-primary border border-cluely-accent-teal/30 rounded-br-md" 
                                : "bg-cluely-dark-card/60 text-cluely-text-primary border border-white/10 rounded-bl-md"
                            }`}
                            style={{ wordBreak: "break-word", lineHeight: "1.5" }}
                          >
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({node, ...props}) => <p className="mb-1.5 last:mb-0" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-semibold text-cluely-accent-teal" {...props} />,
                                em: ({node, ...props}) => <em className="italic text-cluely-text-secondary" {...props} />,
                                code: ({node, className, ...props}) => {
                                  const isInline = !className?.includes('language-')
                                  return isInline ? (
                                    <code className="bg-cluely-dark-bg/70 px-1 py-0.5 rounded text-[9px] font-mono border border-white/10 text-cluely-accent-cyan" {...props} />
                                  ) : (
                                    <code className="block bg-cluely-dark-bg/70 p-2 rounded-lg text-[9px] font-mono overflow-x-auto my-1.5 border border-white/10" {...props} />
                                  )
                                },
                                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-1.5 space-y-0.5 text-cluely-text-secondary" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-1.5 space-y-0.5 text-cluely-text-secondary" {...props} />,
                                li: ({node, ...props}) => <li className="text-[10px]" {...props} />,
                                h1: ({node, ...props}) => <h1 className="text-xs font-semibold mb-1.5 text-cluely-accent-teal" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-[11px] font-semibold mb-1.5 text-cluely-accent-teal" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-[10px] font-medium mb-1 text-cluely-text-primary" {...props} />,
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start animate-fade-in">
                          <div className="bg-cluely-dark-card/60 text-cluely-text-secondary px-2.5 py-2 rounded-xl rounded-bl-md text-[10px] backdrop-blur-sm border border-white/10 shadow-sm">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cluely-accent-teal animate-pulse"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-cluely-accent-teal animate-pulse animation-delay-200"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-cluely-accent-teal animate-pulse animation-delay-400"></span>
                              <span className="ml-1 text-cluely-text-muted">Thinking...</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* Modern Input Area */}
                <form
                  className="relative"
                  onSubmit={e => {
                    e.preventDefault();
                    handleChatSend();
                  }}
                >
                  <div className="relative modern-input-wrapper">
                    <input
                      ref={chatInputRef}
                      className="w-full rounded-lg px-3 py-2 pr-10 bg-cluely-dark-bg/60 backdrop-blur-md text-cluely-text-primary placeholder-cluely-text-muted text-[10px] focus:outline-none focus:ring-2 focus:ring-cluely-accent-teal/50 border border-white/10 transition-all duration-200 hover:border-white/20"
                      placeholder="Type your message..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      disabled={chatLoading}
                    />
                    <button
                      type="submit"
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        chatLoading || !chatInput.trim()
                          ? 'bg-cluely-accent-teal/10 text-cluely-accent-teal/40 cursor-not-allowed'
                          : 'bg-gradient-to-br from-cluely-accent-teal to-cluely-accent-cyan text-white hover:shadow-lg hover:shadow-cluely-accent-teal/25 hover:scale-105 active:scale-95'
                      }`}
                      disabled={chatLoading || !chatInput.trim()}
                      tabIndex={-1}
                      aria-label="Send message"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Conditional Settings Interface */}
          {isSettingsOpen && (
            <div className="mt-2 animate-slide-up">
              <ModelSelector onModelChange={handleModelChange} onChatOpen={() => setIsChatOpen(true)} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Queue
