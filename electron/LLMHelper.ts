import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import { logger } from "./Logger"
import fs from "fs"

interface OllamaResponse {
  response: string
  done: boolean
}

export class LLMHelper {
  private model: GenerativeModel | null = null
  private genAI: GoogleGenerativeAI | null = null
  private apiKey: string | null = null
  private readonly systemPrompt = `You are Wingman AI, a helpful, proactive assistant for any kind of problem or situation (not just coding). For any user input, analyze the situation, provide a clear problem statement, relevant context, and suggest several possible responses or actions the user could take next. Always explain your reasoning. Present your suggestions as a list of options or next steps.`
  private useOllama: boolean = false
  private ollamaModel: string = "llama3.2"
  private ollamaUrl: string = "http://localhost:11434"
  private geminiModel: string = "gemini-2.0-flash" // Stable 2.0 Flash version
  
  // Fallback models if API call fails
  private readonly fallbackGeminiModels = [
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Fast and efficient" },
    { id: "gemini-1.5-flash-latest", name: "Gemini 1.5 Flash Latest", description: "Latest 1.5 Flash" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Most capable 1.5 version" },
    { id: "gemini-1.5-pro-latest", name: "Gemini 1.5 Pro Latest", description: "Latest 1.5 Pro" },
    { id: "gemini-pro", name: "Gemini Pro", description: "Stable Pro version" },
  ]

  constructor(apiKey?: string, useOllama: boolean = false, ollamaModel?: string, ollamaUrl?: string, geminiModel?: string) {
    this.useOllama = useOllama
    
    if (useOllama) {
      this.ollamaUrl = ollamaUrl || "http://localhost:11434"
      this.ollamaModel = ollamaModel || "gemma:latest" // Default fallback
      logger.debug(`Using Ollama with model: ${this.ollamaModel}`)
      
      // Auto-detect and use first available model if specified model doesn't exist
      this.initializeOllamaModel()
    } else if (apiKey) {
      this.apiKey = apiKey
      this.genAI = new GoogleGenerativeAI(apiKey)
      this.geminiModel = geminiModel || "gemini-1.5-flash"
      this.model = this.genAI.getGenerativeModel({ model: this.geminiModel })
      logger.debug(`Using Google Gemini model: ${this.geminiModel}`)
    } else {
      throw new Error("Either provide Gemini API key or enable Ollama mode")
    }
  }

  private async fileToGenerativePart(imagePath: string) {
    const imageData = await fs.promises.readFile(imagePath)
    return {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/png"
      }
    }
  }

  private cleanJsonResponse(text: string): string {
    // Remove markdown code block syntax if present
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    // Remove any leading/trailing whitespace
    text = text.trim();
    return text;
  }

  private async callOllama(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data: OllamaResponse = await response.json()
      return data.response
    } catch (error) {
      logger.error("Error calling Ollama", { error })
      throw new Error(`Failed to connect to Ollama: ${error.message}. Make sure Ollama is running on ${this.ollamaUrl}`)
    }
  }

  private async checkOllamaAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }

  private async initializeOllamaModel(): Promise<void> {
    try {
      const availableModels = await this.getOllamaModels()
      if (availableModels.length === 0) {
        logger.warn("No Ollama models found")
        return
      }

      // Check if current model exists, if not use the first available
      if (!availableModels.includes(this.ollamaModel)) {
        this.ollamaModel = availableModels[0]
        logger.debug(`Auto-selected first available model: ${this.ollamaModel}`)
      }

      // Test the selected model works
      const testResult = await this.callOllama("Hello")
      logger.debug(`Successfully initialized with model: ${this.ollamaModel}`)
    } catch (error) {
      logger.error(`Failed to initialize Ollama model: ${error.message}`)
      // Try to use first available model as fallback
      try {
        const models = await this.getOllamaModels()
        if (models.length > 0) {
          this.ollamaModel = models[0]
          logger.debug(`Fallback to: ${this.ollamaModel}`)
        }
      } catch (fallbackError) {
        logger.error(`Fallback also failed: ${fallbackError.message}`)
      }
    }
  }

  /**
   * Fetch available Gemini models from the API and filter for Flash models (prioritized)
   */
  private async listAvailableGeminiModels(): Promise<Array<{ id: string; name: string; description: string }>> {
    try {
      logger.debug("[LLMHelper] Fetching available models and prioritizing Flash models...");
      
      // Use existing method to fetch all models
      const allModels = await this.fetchAvailableGeminiModels();
      
      // Separate Flash models from others
      const flashModels = allModels.filter(m => m.id.toLowerCase().includes('flash'));
      const otherModels = allModels.filter(m => !m.id.toLowerCase().includes('flash'));
      
      // Return Flash models first, then others (up to 5 total)
      const prioritizedModels = [...flashModels, ...otherModels].slice(0, 5);
      
      logger.info(`[LLMHelper] Found ${prioritizedModels.length} models to try (${flashModels.length} Flash models)`, {
        models: prioritizedModels.map(m => m.id)
      });
      
      return prioritizedModels.length > 0 ? prioritizedModels : this.fallbackGeminiModels;
      
    } catch (error: any) {
      logger.warn(`[LLMHelper] Failed to list models: ${error.message}. Using fallback models.`);
      return this.fallbackGeminiModels;
    }
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)))
      
      const prompt = `${this.systemPrompt}\n\nYou are a wingman. Please analyze these images and extract the following information in JSON format:\n{
  "problem_statement": "A clear statement of the problem or situation depicted in the images.",
  "context": "Relevant background or context from the images.",
  "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
  "reasoning": "Explanation of why these suggestions are appropriate."
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

      const result = await this.model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      return JSON.parse(text)
    } catch (error) {
      logger.error("Error extracting problem from images", { error })
      throw error
    }
  }

  public async generateSolution(problemInfo: any) {
    const prompt = `${this.systemPrompt}\n\nGiven this problem or situation:\n${JSON.stringify(problemInfo, null, 2)}\n\nPlease provide your response in the following JSON format:\n{
  "solution": {
    "code": "The code or main answer here.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

    logger.debug("Calling Gemini LLM for solution");
    try {
      const result = await this.model.generateContent(prompt)
      logger.debug("Gemini LLM returned result");
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      logger.debug("Parsed LLM response", { parsed })
      return parsed
    } catch (error) {
      logger.error("Error in generateSolution", { error });
      throw error;
    }
  }

  public async debugSolutionWithImages(problemInfo: any, currentCode: string, debugImagePaths: string[]) {
    try {
      const imageParts = await Promise.all(debugImagePaths.map(path => this.fileToGenerativePart(path)))
      
      const prompt = `${this.systemPrompt}\n\nYou are a wingman. Given:\n1. The original problem or situation: ${JSON.stringify(problemInfo, null, 2)}\n2. The current response or approach: ${currentCode}\n3. The debug information in the provided images\n\nPlease analyze the debug information and provide feedback in this JSON format:\n{
  "solution": {
    "code": "The code or main answer here.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

      const result = await this.model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      logger.debug("Parsed debug LLM response", { parsed })
      return parsed
    } catch (error) {
      logger.error("Error debugging solution with images", { error })
      throw error
    }
  }

  public async analyzeAudioFile(audioPath: string) {
    try {
      const audioData = await fs.promises.readFile(audioPath);
      const audioPart = {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: "audio/mp3"
        }
      };
      const prompt = `${this.systemPrompt}\n\nDescribe this audio clip in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the audio. Do not return a structured JSON object, just answer naturally as you would to a user.`;
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      logger.error("Error analyzing audio file", { error });
      
      // Parse the error message to provide user-friendly feedback
      if (error instanceof Error) {
        let userMessage = error.message;
        
        // Handle specific error cases
        if (error.message.includes('not found for API version') || error.message.includes('is not found')) {
          userMessage = 'The selected AI model is currently unavailable. Please try using a different model.';
        } else if (error.message.includes('overloaded') || error.message.includes('503')) {
          userMessage = 'The AI service is currently overloaded. Please try again in a moment.';
        } else if (error.message.includes('quota') || error.message.includes('429')) {
          userMessage = 'API quota exceeded. Please try again later or use a different model.';
        } else if (error.message.includes('API key') || error.message.includes('unauthorized') || error.message.includes('401')) {
          userMessage = 'Invalid API key. Please check your API key in settings.';
        }
        
        throw new Error(userMessage);
      }
      
      throw error;
    }
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string) {
    try {
      const audioPart = {
        inlineData: {
          data,
          mimeType
        }
      };
      const prompt = `${this.systemPrompt}\n\nDescribe this audio clip in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the audio. Do not return a structured JSON object, just answer naturally as you would to a user and be concise.`;
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      logger.error("Error analyzing audio from base64", { error });
      
      // Parse the error message to provide user-friendly feedback
      if (error instanceof Error) {
        let userMessage = error.message;
        
        // Handle specific error cases
        if (error.message.includes('not found for API version') || error.message.includes('is not found')) {
          userMessage = 'The selected AI model is currently unavailable. Please try using a different model.';
        } else if (error.message.includes('overloaded') || error.message.includes('503')) {
          userMessage = 'The AI service is currently overloaded. Please try again in a moment.';
        } else if (error.message.includes('quota') || error.message.includes('429')) {
          userMessage = 'API quota exceeded. Please try again later or use a different model.';
        } else if (error.message.includes('API key') || error.message.includes('unauthorized') || error.message.includes('401')) {
          userMessage = 'Invalid API key. Please check your API key in settings.';
        }
        
        throw new Error(userMessage);
      }
      
      throw error;
    }
  }

  public async analyzeImageFile(imagePath: string) {
    try {
      logger.debug("Reading image file for analysis", { imagePath });
      const imageData = await fs.promises.readFile(imagePath);
      
      const imagePart = {
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png"
        }
      };
      
      const prompt = `${this.systemPrompt}\n\nAnalyze this image and respond accordingly:

**If this is a coding question or programming problem:**
- SOLVE IT COMPLETELY - provide the full working code solution
- Show the answer/output if applicable
- Explain your solution briefly
- Include code examples in proper markdown code blocks

**If this is code with errors:**
- Identify and fix all bugs
- Provide the corrected code
- Explain what was wrong

**For other content:**
- Describe what you see
- Provide actionable suggestions

IMPORTANT: For coding questions, always provide the complete solution with working code. Don't just explain - actually solve it!`;
      
      logger.debug("Sending image to Gemini for analysis");
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      logger.debug("Image analysis completed successfully");
      return { text, timestamp: Date.now() };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || "Unknown error";
      const errorDetails = {
        message: errorMessage,
        name: error?.name,
        code: error?.code,
        status: error?.status,
        statusText: error?.statusText
      };
      
      logger.error("Error analyzing image file", { error: errorDetails, imagePath });
      
      // Provide user-friendly error messages
      if (errorMessage.includes("API key")) {
        throw new Error("Invalid or missing Gemini API key. Please check your settings.");
      } else if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
        throw new Error("API rate limit exceeded. Please try again later.");
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        throw new Error("Network error. Please check your internet connection.");
      }
      
      throw new Error(`Failed to analyze image: ${errorMessage}`);
    }
  }

  public async chatWithGemini(message: string, screenshotPaths?: string[]): Promise<string> {
    try {
      const chatSystemPrompt = `You're a real-time assistant that gives the user info during meetings and other workflows. Your goal is to answer the user's query directly.

Responses must be EXTREMELY short and terse:
- Aim for 1-2 sentences, and if longer, use bullet points for structure
- Get straight to the point and NEVER add filler, preamble, or meta-comments
- Never give the user a direct script or word track to say, your responses must be informative
- Don't end with a question or prompt to the user
- If an example story is needed, give one specific example story without making up details
- If a response calls for code, write all code required with detailed comments

Tone must be natural, human, and conversational:
- Never be robotic or overly formal
- Use contractions naturally ("it's" not "it is")
- Occasionally start with "And" or "But" or use a sentence fragment for flow
- NEVER use hyphens or dashes, split into shorter sentences or use commas
- Avoid unnecessary adjectives or dramatic emphasis unless it adds clear value

User query: ${message}`;

      if (this.useOllama) {
        return this.callOllama(chatSystemPrompt);
      } else if (this.model) {
        // If screenshots are provided, include them in the request
        if (screenshotPaths && screenshotPaths.length > 0) {
          const imageParts = await Promise.all(
            screenshotPaths.map(async (imagePath) => {
              const imageData = await fs.promises.readFile(imagePath);
              return {
                inlineData: {
                  data: imageData.toString("base64"),
                  mimeType: "image/png"
                }
              };
            })
          );
          
          const result = await this.model.generateContent([chatSystemPrompt, ...imageParts]);
          const response = await result.response;
          return response.text();
        } else {
          // No screenshots, just send the message
          const result = await this.model.generateContent(chatSystemPrompt);
          const response = await result.response;
          return response.text();
        }
      } else {
        throw new Error("No LLM provider configured");
      }
    } catch (error) {
      logger.error("[LLMHelper] Error in chatWithGemini", { error });
      throw error;
    }
  }

  public async chat(message: string): Promise<string> {
    return this.chatWithGemini(message);
  }

  public isUsingOllama(): boolean {
    return this.useOllama;
  }

  public async getOllamaModels(): Promise<string[]> {
    if (!this.useOllama) return [];
    
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      if (!response.ok) throw new Error('Failed to fetch models');
      
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      logger.error("[LLMHelper] Error fetching Ollama models", { error });
      return [];
    }
  }

  public getCurrentProvider(): "ollama" | "gemini" {
    return this.useOllama ? "ollama" : "gemini";
  }

  public getCurrentModel(): string {
    return this.useOllama ? this.ollamaModel : this.geminiModel;
  }
  
  public getAvailableGeminiModels(): Array<{ id: string; name: string; description: string }> {
    return this.fallbackGeminiModels;
  }
  
  public async fetchAvailableGeminiModels(): Promise<Array<{ id: string; name: string; description: string; supportedGenerationMethods: string[] }>> {
    if (!this.apiKey) {
      throw new Error("No API key available. Please set your Gemini API key first.");
    }
    
    try {
      logger.debug("[LLMHelper] Fetching available models from Google API...");
      
      // Use the Google AI SDK to list available models
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error("[LLMHelper] API Error", { status: response.status, errorText });
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      logger.debug("[LLMHelper] Received response from API", { data });
      
      // Filter and format the models
      const models = data.models
        .filter((model: any) => {
          // Only include generative models (not embedding-only models)
          return model.supportedGenerationMethods?.includes('generateContent');
        })
        .map((model: any) => ({
          id: model.name.replace('models/', ''), // Remove 'models/' prefix for SDK compatibility
          name: model.displayName || model.name.replace('models/', ''),
          description: model.description || 'No description available',
          supportedGenerationMethods: model.supportedGenerationMethods || [],
          // Add additional useful info
          inputTokenLimit: model.inputTokenLimit,
          outputTokenLimit: model.outputTokenLimit
        }))
        .sort((a: any, b: any) => {
          // Sort by name, putting newer versions first
          if (a.name.includes('2.5') && !b.name.includes('2.5')) return -1;
          if (!a.name.includes('2.5') && b.name.includes('2.5')) return 1;
          if (a.name.includes('2.0') && !b.name.includes('2.0')) return -1;
          if (!a.name.includes('2.0') && b.name.includes('2.0')) return 1;
          return a.name.localeCompare(b.name);
        });
      
      logger.debug(`[LLMHelper] Fetched ${models.length} available Gemini models from API`);
      logger.debug("[LLMHelper] Sample models", { sampleModels: models.slice(0, 5).map((m: any) => m.id) });
      return models;
    } catch (error) {
      logger.error("[LLMHelper] Error fetching Gemini models from API", { error });
      // Fallback to hardcoded list if API call fails
      logger.debug("[LLMHelper] Falling back to hardcoded model list");
      return this.fallbackGeminiModels.map(m => ({
        ...m,
        supportedGenerationMethods: ['generateContent']
      }));
    }
  }

  public async switchToOllama(model?: string, url?: string): Promise<void> {
    this.useOllama = true;
    if (url) this.ollamaUrl = url;
    
    if (model) {
      this.ollamaModel = model;
    } else {
      // Auto-detect first available model
      await this.initializeOllamaModel();
    }
    
    logger.info(`[LLMHelper] Switched to Ollama: ${this.ollamaModel} at ${this.ollamaUrl}`);
  }

  public async switchToGemini(apiKey?: string, model?: string): Promise<void> {
    if (apiKey) {
      this.apiKey = apiKey
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    
    if (!this.genAI && !apiKey) {
      throw new Error("No Gemini API key provided and no existing API instance");
    }
    
    // Update model if specified
    if (model) {
      this.geminiModel = model;
    }
    
    // Create model instance
    if (this.genAI) {
      this.model = this.genAI.getGenerativeModel({ model: this.geminiModel });
    }
    
    this.useOllama = false;
    logger.info(`[LLMHelper] Switched to Gemini model: ${this.geminiModel}`);
  }
  
  public async switchGeminiModel(model: string): Promise<void> {
    if (!this.genAI) {
      throw new Error("No Gemini API instance available");
    }
    
    logger.debug(`[LLMHelper] Attempting to switch to Gemini model: ${model}`);
    this.geminiModel = model;
    
    try {
      this.model = this.genAI.getGenerativeModel({ model: this.geminiModel });
      logger.info(`[LLMHelper] Successfully switched to Gemini model: ${this.geminiModel}`);
    } catch (error) {
      logger.error(`[LLMHelper] Error creating model instance for ${this.geminiModel}`, { error });
      throw new Error(`Failed to initialize model ${this.geminiModel}: ${error.message}`);
    }
  }

  public async testConnection(): Promise<{ success: boolean; error?: string; capabilities?: { text: boolean; image: boolean; audio: boolean }; modelUsed?: string }> {
    try {
      const capabilities = { text: false, image: false, audio: false };
      
      if (this.useOllama) {
        const available = await this.checkOllamaAvailable();
        if (!available) {
          return { success: false, error: `Ollama not available at ${this.ollamaUrl}` };
        }
        // Test text capability
        try {
          await this.callOllama("Hello");
          capabilities.text = true;
        } catch (err) {
          return { success: false, error: `Text generation failed: ${err.message}` };
        }
        
        // Ollama typically supports text, image support varies by model
        // Audio support is limited
        return { success: true, capabilities };
      } else {
        if (!this.genAI) {
          return { success: false, error: "No Gemini API configured" };
        }
        
        // Fetch available models from API (prioritizes Flash models)
        const modelsToTry = await this.listAvailableGeminiModels();
        logger.info(`[LLMHelper] Will try ${modelsToTry.length} models`, { models: modelsToTry.map(m => m.id) });
        
        const errors: string[] = [];
        
        for (const modelInfo of modelsToTry) {
          try {
            logger.info(`[LLMHelper] Trying model: ${modelInfo.id}`);
            
            // Create model instance
            this.model = this.genAI.getGenerativeModel({ model: modelInfo.id });
            this.geminiModel = modelInfo.id;
            
            // Test 1: Text capability
            logger.debug("[LLMHelper] Testing text capability...");
            const result = await this.model.generateContent("Say hello");
            const response = await result.response;
            const text = response.text();
            logger.debug("[LLMHelper] Text test response", { text });
            
            if (text && text.length > 0) {
              capabilities.text = true;
              logger.info(`[LLMHelper] Successfully connected with model: ${modelInfo.id}`);
            } else {
              throw new Error("Text test returned empty response");
            }
            
            // Test 2: Image capability (using a small test image)
            try {
              logger.debug("[LLMHelper] Testing image capability...");
              const testImageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="; // 1x1 transparent PNG
              const imagePart = {
                inlineData: {
                  data: testImageData,
                  mimeType: "image/png"
                }
              };
              const imageResult = await this.model.generateContent(["What do you see?", imagePart]);
              await imageResult.response;
              capabilities.image = true;
              logger.debug("[LLMHelper] Image capability: supported");
            } catch (err) {
              logger.debug("[LLMHelper] Image capability: not supported");
              capabilities.image = false;
            }
            
            // Test 3: Audio capability
            try {
              logger.debug("[LLMHelper] Testing audio capability...");
              // Create a minimal valid WAV file (1 sample, 8000Hz, mono, 8-bit)
              const wavHeader = Buffer.from([
                0x52, 0x49, 0x46, 0x46, // "RIFF"
                0x2C, 0x00, 0x00, 0x00, // File size - 8
                0x57, 0x41, 0x56, 0x45, // "WAVE"
                0x66, 0x6D, 0x74, 0x20, // "fmt "
                0x10, 0x00, 0x00, 0x00, // Subchunk1Size (16)
                0x01, 0x00,             // AudioFormat (1 = PCM)
                0x01, 0x00,             // NumChannels (1 = mono)
                0x40, 0x1F, 0x00, 0x00, // SampleRate (8000)
                0x40, 0x1F, 0x00, 0x00, // ByteRate
                0x01, 0x00,             // BlockAlign
                0x08, 0x00,             // BitsPerSample (8)
                0x64, 0x61, 0x74, 0x61, // "data"
                0x08, 0x00, 0x00, 0x00, // Subchunk2Size
                0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80 // 8 samples of silence
              ]);
              const testAudioData = wavHeader.toString('base64');
              const audioPart = {
                inlineData: {
                  data: testAudioData,
                  mimeType: "audio/wav"
                }
              };
              const audioResult = await this.model.generateContent(["Describe this audio", audioPart]);
              await audioResult.response;
              capabilities.audio = true;
              logger.debug("[LLMHelper] Audio capability: supported");
            } catch (err) {
              logger.debug("[LLMHelper] Audio capability: not supported");
              capabilities.audio = false;
            }
            
            // Success! Return with the working model
            logger.info("[LLMHelper] Connection test successful with capabilities", { capabilities, model: modelInfo.id });
            return { success: true, capabilities, modelUsed: modelInfo.id };
            
          } catch (err) {
            // Extract clean error message
            let cleanError = err.message || String(err);
            // Remove verbose API URLs and technical details
            cleanError = cleanError.replace(/https?:\/\/[^\s]+/g, '');
            cleanError = cleanError.replace(/\[GoogleGenerativeAI Error\]:\s*/g, '');
            cleanError = cleanError.replace(/Error fetching from\s*/g, '');
            cleanError = cleanError.trim();
            
            const errorMsg = `• ${modelInfo.name}: ${cleanError}`;
            errors.push(errorMsg);
            logger.warn(`[LLMHelper] Model ${modelInfo.id} failed: ${err.message}`);
            // Continue to next model
          }
        }
        
        // All models failed - provide a clean, helpful error message
        const errorMessage = `Unable to connect to Gemini API. Tried ${modelsToTry.length} models:\n\n${errors.join('\n')}\n\nPlease check:\n• Your API key is valid\n• You have API quota remaining\n• Your network connection is working`;
        logger.error("[LLMHelper] All models failed", { errors });
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      logger.error("[LLMHelper] Connection test error", { error });
      return { success: false, error: error.message };
    }
  }
} 