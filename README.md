# Neo AI Labs

The AI Lab for German AI Research. 

## Project Overview

This project implements a premium, futuristic website for Neo AI Labs. It features:
- **Multilingual Support**: /de (Default) and /en
- **3D Hero Section**: Interactive neural network using Three.js
- **Privacy First**: No cookies, no tracking, GitHub Pages compatible
- **Modern Design**: Glassmorphism, Deep Blue Aesthetics, Apple-like polish

## Deployment

Simply deploy the root folder to GitHub Pages. The `index.html` will automatically redirect users to `/de/` or `/en/`.

## Structure

- `/de`, `/en`: Entry points
- `/assets`: JSON locales, images
- `/js`: Application logic
- `/css`: Styles

(Legacy content below preserved)


## ✨ Features

- 🔒 **100% Offline** - Funktioniert ohne Internetverbindung nach dem initialen Download
- 🛡️ **Privat** - Keine Daten verlassen deinen Browser
- ⚡ **WebGPU** - Hardware-beschleunigte KI-Inferenz
- 💾 **Lokal gespeichert** - Chat-Verlauf bleibt im Browser

## 🛠️ Technologie

- **Transformers.js v3** - Für das Laden und Ausführen des LLM
- **LFM2-350M-ONNX** - Kompaktes Liquid-Architektur Sprachmodell mit Qwen2.5-0.5B-Instruct als Fallback
- **WebGPU** - Native GPU-Beschleunigung im Browser

## 📁 Projektstruktur

```
NeoAI_Chat/
├── index.html          # Haupt-HTML (Screens: Onboarding, Loader, Home)
├── css/
│   └── main.css        # Design System & Styles
├── js/
│   └── app.js          # App Controller & State Management
└── README.md
```

## 🚀 Getting Started

1. **Lokal öffnen**: Öffne `index.html` direkt im Browser (WebGPU-fähiger Browser erforderlich)

2. **Oder über Server**:
   ```bash
   npx serve .
   ```

3. **Für GitHub Pages**: Push das Repository und aktiviere GitHub Pages in den Settings

## 📱 Screens

1. **Onboarding** - Einführung & Features-Übersicht
2. **Model Loader** - Download-Fortschritt des KI-Modells
3. **Home** - Chat-Interface (in Entwicklung)

## ⚙️ Einstellungen

- **Chat-Verlauf löschen** - Entfernt alle gespeicherten Nachrichten
- **Modell-Cache löschen** - Gibt ~1GB Speicher frei (erfordert erneuten Download)
- **App zurücksetzen** - Zeigt Onboarding erneut an

## 🌐 Browser-Kompatibilität

| Browser | Status |
|---------|--------|
| Chrome 113+ | ✅ Vollständig unterstützt |
| Edge 113+ | ✅ Vollständig unterstützt |
| Firefox | ⚠️ WebGPU experimentell |
| Safari | ⚠️ WebGPU in Entwicklung |

## 📝 License

MIT License

---

*Powered by [Transformers.js](https://huggingface.co/docs/transformers.js), [LFM2-350M](https://huggingface.co/onnx-community/LFM2-350M-ONNX) & [Qwen](https://huggingface.co/Qwen)*