# <img src="https://raw.githubusercontent.com/Saijayaranjan/Velar/main/assets/icons/velar_icon.icns" alt="Velar Logo" width="80"/> Velar

### AI-Powered Desktop Assistant for Developers  
A free, open-source alternative to Cluely — privacy-first, cross-platform, and fast.

[![License](https://img.shields.io/badge/license-CC--BY--NC--4.0-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)]()
[![Version](https://img.shields.io/badge/version-1.0.0-orange)]()
[![Stars](https://img.shields.io/github/stars/Saijayaranjan/Velar?style=social)](https://github.com/Saijayaranjan/Velar/stargazers)

---

## Overview

Velar is an **AI-powered desktop assistant** designed for developers, students, and professionals.  
It provides instant AI analysis of screenshots, voice transcription, intelligent chat, and privacy-first local processing.  

**Velar** combines the best of cloud and local AI — **Gemini** for accuracy and **Ollama** for offline privacy.

---

<details>
<summary><b>Features</b></summary>

### Smart Screenshot Analysis
- Capture screen instantly with `Cmd/Ctrl + H`
- AI-powered explanations and debugging support
- Queue up to five screenshots for contextual analysis

### Dual AI Engine
- **Gemini (Cloud AI)** – high accuracy  
- **Ollama (Local AI)** – full offline privacy  
- Seamless switching between both

### Interactive Chat
- Context-aware conversations
- Follow-up queries and explanations
- Designed for coding, learning, and research

### Voice Input and Transcription
- Record meetings or voice notes
- AI-based transcription and summarization

### Privacy-First Design
- Toggle Incognito with `Cmd/Ctrl + I`
- Hidden from screen-recording tools
- Zero data storage or telemetry

### Keyboard Shortcuts

| Shortcut | Action |
|-----------|--------|
| `Cmd/Ctrl + Shift + Space` | Show or hide window |
| `Cmd/Ctrl + H` | Capture screenshot |
| `Cmd/Ctrl + Enter` | Analyze screenshots |
| `Cmd/Ctrl + I` | Toggle incognito mode |
| `Cmd/Ctrl + Q` | Quit application |

</details>

---

<details>
<summary><b>Installation</b></summary>

### 1. Download
Choose the latest release for your OS:
- **macOS:** `Velar-1.0.0.dmg`
- **Windows:** `Velar-Setup-1.0.0.exe`
- **Linux:** `Velar-1.0.0.AppImage`

### 2. Configure AI Provider

**Gemini (Cloud AI)**  
1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)  
2. Create a `.env` file:
   ```env
   VITE_GEMINI_API_KEY=your_api_key
   VITE_GEMINI_ENABLED=true
   ```

**Ollama (Local AI)**  
1. Install from [ollama.ai](https://ollama.ai)  
2. Pull a model:
   ```bash
   ollama pull llama3.2
   ```
3. Add configuration:
   ```env
   VITE_OLLAMA_ENDPOINT=http://localhost:11434
   VITE_OLLAMA_ENABLED=true
   ```

### 3. Run Velar

**Development Mode**
```bash
npm install
npm start
```

**Production Build**
```bash
npm run dist
```
</details>

---

<details>
<summary><b>Usage Workflow</b></summary>

1. **Capture** – Press `Cmd/Ctrl + H` to take screenshots.  
2. **Queue** – Add up to 5 screenshots for context.  
3. **Analyze** – Use `Cmd/Ctrl + Enter` to process with AI.  
4. **Chat** – Discuss results interactively.  
5. **Privacy** – Use `Cmd/Ctrl + I` to enable incognito mode.

</details>

---

<details>
<summary><b>AI Options</b></summary>

| Provider | Type | Offline | Accuracy | Privacy |
|-----------|------|----------|-----------|----------|
| Gemini | Cloud | No | High | Medium |
| Ollama | Local | Yes | Moderate | Full |

**Recommended Models**
- `llama3.2` – General purpose  
- `codellama` – Optimized for code  
- `mistral` – Lightweight  
- `mixtral` – High accuracy  

</details>

---

<details>
<summary><b>Privacy & Security</b></summary>

- Screenshots deleted immediately after processing  
- No telemetry, tracking, or analytics  
- API keys encrypted locally  
- Incognito mode prevents OS-level capture detection  
- Open-source for full auditability

</details>

---

<details>
<summary><b>Velar vs Cluely</b></summary>

| Feature | Velar (Free) | Cluely (Paid) |
|----------|---------------|---------------|
| Price | Free | $29–99/month |
| AI Options | Gemini + Ollama | Cloud only |
| Offline Mode | Yes | No |
| Privacy | 100% Local Option | Cloud-based |
| Customization | Full | Limited |
| Open Source | Yes | No |
| Subscription | None | Required |

**Velar** provides the same functionality as Cluely with added privacy, offline mode, and no subscription.

</details>

---

<details>
<summary><b>Troubleshooting</b></summary>

**Port 5180 in Use**
```bash
lsof -i :5180
kill -9 <PID>
```

**Rebuild Sharp**
```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --ignore-scripts
npm rebuild sharp
```

**Ollama Connection Error**
```bash
ollama serve
ollama pull llama3.2
```

**macOS Screen Recording**
- Go to **System Settings → Privacy & Security → Screen Recording**
- Enable Velar or Electron
- Restart the app

</details>

---

<details>
<summary><b>Development Guide</b></summary>

### Requirements
- Node.js ≥ 18  
- npm ≥ 9  
- macOS, Windows, or Linux  

### Structure
```
velar/
├── electron/          # Electron main process
├── src/               # React renderer
├── assets/            # Static assets
├── release/           # Build outputs
└── .env               # Environment configuration
```

### Stack
- React + TypeScript + TailwindCSS  
- Electron + Vite + Sharp  
- Gemini & Ollama AI backends  
- Radix UI + Lucide Icons  

**Run Commands**
```bash
npm start          # Development
npm run build      # Build renderer
npm run dist       # Production build
npm run clean      # Clear artifacts
```

</details>

---

<details>
<summary><b>Roadmap</b></summary>

| Version | Planned Features |
|----------|------------------|
| **1.1** | Plugin system, multi-language support, team collaboration |
| **1.2** | Cloud sync (optional), mobile companion app |
| **Future** | Browser extension, automation, enterprise support |

</details>

---

<details>
<summary><b>Contributing</b></summary>

Contributions are welcome.  

**Steps**
```bash
git checkout -b feature/amazing-feature
git commit -m "Add amazing feature"
git push origin feature/amazing-feature
```

Then, open a Pull Request.  

**Guidelines**
- Follow existing code style  
- Keep commits focused  
- Update docs for new features  
- Add tests if possible  

</details>

---

<details>
<summary><b>License</b></summary>

**CC BY-NC 4.0** — Free for personal and non-commercial use.  

For commercial licensing, contact the Velar Team.

</details>

---

<details>
<summary><b>Support</b></summary>

- **Issues:** [GitHub Issues](https://github.com/Saijayaranjan/Velar/issues)  
- **Discussions:** [GitHub Discussions](https://github.com/Saijayaranjan/Velar/discussions)  
- **Documentation:** [Architecture Guide](./ARCHITECTURE.md)  

</details>

---

<div align="center">

**⭐ Star this repository if Velar helps you!**  
Built with ❤️ by the Velar Team  

[Download](https://github.com/Saijayaranjan/Velar/releases) · [Report Bug](https://github.com/Saijayaranjan/Velar/issues) · [Request Feature](https://github.com/Saijayaranjan/Velar/issues)

</div>

---

<details>
<summary><b>SEO Keywords</b></summary>

`Velar AI`, `Cluely alternative`, `free ai assistant`, `open source ai`,  
`offline ai assistant`, `developer ai tool`, `ai desktop assistant`,  
`screenshot analysis`, `Ollama`, `Gemini`, `privacy-first ai`,  
`electron ai app`, `free interview assistant`, `AI for developers`

</details>
