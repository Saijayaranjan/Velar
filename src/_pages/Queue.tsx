import React, { useState, useEffect, useRef } from "react"
import { useQuery } from "react-query"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { TbSparkles, TbCloud, TbHome, TbSettings, TbRefresh, TbScan } from 'react-icons/tb'
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
import { Settings } from "./Settings"

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
    
    // Keep focus on input immediately after clearing
    setTimeout(() => {
      chatInputRef.current?.focus()
    }, 0)
    
    try {
      // Get all screenshots to send with the message
      const screenshotPaths = screenshots.map(s => s.path)
      const response = await window.electronAPI.invoke("gemini-chat", chatInput, screenshotPaths)
      setChatMessages((msgs) => [...msgs, { role: "gemini", text: response }])
    } catch (err) {
      setChatMessages((msgs) => [...msgs, { role: "gemini", text: "Error: " + String(err) }])
    } finally {
      setChatLoading(false)
      // Re-focus after response is received
      setTimeout(() => {
        chatInputRef.current?.focus()
      }, 0)
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

  // Listen for chat toggle shortcut (Cmd+J)
  useEffect(() => {
    const cleanup = (window.electronAPI as any).onToggleChat?.(() => {
      setIsChatOpen(prev => {
        const newState = !prev
        // If opening the chat, focus the input after a brief delay
        if (newState) {
          setTimeout(() => {
            chatInputRef.current?.focus()
          }, 100)
        }
        return newState
      })
    })
    
    return () => {
      if (cleanup) cleanup()
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
      console.log("Screenshot taken event received:", data);
      
      // Refetch screenshots to update the queue
      await refetch();
      
      // Auto-open chatbox when screenshot is taken
      setIsChatOpen(true);
      
      // Show "Analyzing image..." message first with icon
      setChatMessages((msgs) => [...msgs, { 
        role: "gemini", 
        text: "**Analyzing image...**" 
      }]);
      
      // Wait 2 seconds to show the analyzing message
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now show loading state (Thinking...)
      setChatLoading(true);
      
      try {
        // Get the screenshot path from the event data
        const screenshotPath = data?.path;
        console.log("Analyzing screenshot:", screenshotPath);
        
        if (screenshotPath) {
          // Call the LLM to process the screenshot
          const response = await window.electronAPI.invoke("analyze-image-file", screenshotPath);
          console.log("Analysis response:", response);
          
          // Remove the "Analyzing image..." message and add the AI response
          setChatMessages((msgs) => {
            // Remove the last message (Analyzing image...)
            const filtered = msgs.slice(0, -1);
            // Add the actual response
            return [...filtered, { 
              role: "gemini", 
              text: response.text || response 
            }];
          });
        } else {
          console.error("No screenshot path in event data");
          setChatMessages((msgs) => {
            const filtered = msgs.slice(0, -1);
            return [...filtered, { 
              role: "gemini", 
              text: "Error: Screenshot was taken but path is missing" 
            }];
          });
        }
      } catch (err) {
        console.error("Error analyzing screenshot:", err);
        setChatMessages((msgs) => {
          const filtered = msgs.slice(0, -1);
          return [...filtered, { 
            role: "gemini", 
            text: "Error analyzing screenshot: " + String(err) 
          }];
        });
      } finally {
        setChatLoading(false);
      }
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [refetch]);

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  const handleChatToggle = () => {
    setIsChatOpen(prev => {
      const newState = !prev
      // If opening the chat, focus the input after a brief delay
      if (newState) {
        setTimeout(() => {
          chatInputRef.current?.focus()
        }, 100)
      }
      return newState
    })
  }

  const handleSettingsToggle = () => {
    // Toggle settings panel inline (like chat)
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

  // Format model name for display - make it more readable
  const formatModelName = (model: string, provider: string) => {
    if (provider === 'gemini') {
      // Keep "Gemini" prefix and format the rest
      return model
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
    // For Ollama, just return as-is
    return model
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
          
          {/* Cluely-style Minimalist Chat */}
          {isChatOpen && (
            <div className="mt-2 w-full animate-slide-up">
              <div className="liquid-glass rounded-lg p-2.5 flex flex-col">
                {/* Minimal Chat Header */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <TbSparkles size={14} className="text-teal-400" />
                    <div className="text-[10px] text-gray-300 flex items-center gap-1.5">
                      {currentModel.provider === "ollama" ? (
                        <>
                          <TbHome size={10} className="text-cyan-400" />
                          <span>Local</span>
                        </>
                      ) : (
                        <>
                          <TbCloud size={10} className="text-teal-400" />
                          <span>Cloud</span>
                        </>
                      )}
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">{formatModelName(currentModel.model, currentModel.provider)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsChatExpanded(!isChatExpanded)}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    title={isChatExpanded ? "Collapse" : "Expand"}
                  >
                    {isChatExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Messages Area - Minimal */}
                <div 
                  ref={chatMessagesRef}
                  className={`flex-1 overflow-y-auto mb-2 space-y-1.5 transition-all duration-300 ${isChatExpanded ? 'max-h-80 min-h-[160px]' : 'max-h-48 min-h-[100px]'}`}
                >
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-3 space-y-2">
                      <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                        <TbSparkles size={14} className="text-teal-400" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-[9px] text-gray-300">Start a conversation</p>
                        <p className="text-[8px] text-gray-500">
                          Take a screenshot (Cmd+H) or type below
                        </p>
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
                            className={`max-w-[85%] px-2.5 py-1.5 rounded-lg text-[9px] markdown-content transition-all ${
                              msg.role === "user" 
                                ? "bg-teal-500/15 text-white border border-teal-500/30 rounded-br-sm" 
                                : "bg-gray-800/60 text-gray-200 border border-white/10 rounded-bl-sm"
                            }`}
                            style={{ wordBreak: "break-word", lineHeight: "1.5" }}
                          >
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({node, ...props}) => <p className="mb-1.5 last:mb-0" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                                em: ({node, ...props}) => <em className="italic text-gray-400" {...props} />,
                                code: ({node, className, ...props}) => {
                                  const isInline = !className?.includes('language-')
                                  return isInline ? (
                                    <code className="bg-black/30 px-1.5 py-0.5 rounded text-[9px] font-mono text-teal-400" {...props} />
                                  ) : (
                                    <code className="block bg-black/30 p-2 rounded text-[9px] font-mono overflow-x-auto my-1.5" {...props} />
                                  )
                                },
                                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-1.5 space-y-0.5" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-1.5 space-y-0.5" {...props} />,
                                li: ({node, ...props}) => <li className="text-[9px]" {...props} />,
                                h1: ({node, ...props}) => <h1 className="text-[10px] font-semibold mb-1.5 text-white" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-[10px] font-semibold mb-1.5 text-white" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-[9px] font-medium mb-1 text-gray-300" {...props} />,
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start animate-fade-in">
                          <div className="bg-gray-800/60 text-gray-400 px-2.5 py-1.5 rounded-lg rounded-bl-sm text-[9px] border border-white/10">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse animation-delay-200"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse animation-delay-400"></span>
                              <span className="ml-1">Thinking...</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* Input Area - Minimal */}
                <form
                  className="relative"
                  onSubmit={e => {
                    e.preventDefault();
                    handleChatSend();
                  }}
                >
                  <div className="relative">
                    <input
                      ref={chatInputRef}
                      className="w-full rounded-lg px-2.5 py-1.5 pr-8 bg-gray-800/50 text-white placeholder-gray-500 text-[9px] focus:outline-none focus:ring-1 focus:ring-teal-500/50 border border-gray-700 transition-all hover:border-gray-600"
                      placeholder="Type your message..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      disabled={chatLoading}
                    />
                    <button
                      type="submit"
                      className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded flex items-center justify-center transition-all ${
                        chatLoading || !chatInput.trim()
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'text-teal-400 hover:text-teal-300 hover:bg-teal-500/10'
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
            <div className="mt-2 w-full animate-slide-up">
              <Settings onClose={() => setIsSettingsOpen(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Queue
