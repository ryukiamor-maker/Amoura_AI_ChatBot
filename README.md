# Amoura AI ChatBot

A lightweight, configurable AI twin for personal websites.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA)](https://react.dev/)
[![AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-7-black)](https://ai-sdk.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A standalone chatbot component and local configuration workbench. The shared source ships with fictional Mock identity, profile, timeline, location, contact, projects, and card visuals. Replace the JSON configuration with your own public content before publishing. The UI does not depend on a portfolio DOM, and Live mode keeps the provider key on the server.

## Highlights

- Configurable persona, bilingual knowledge, response rules, shortcuts, and evaluation prompts
- Geometric launcher-to-composer morph, streamed copy, and structured tool cards
- Mock-first local setup with an optional DeepSeek-powered Live mode
- Draggable launcher, responsive layout, IME safety, and reduced-motion support
- Development-only visual workbench with live preview, import/export, and validated saves
- Portable component architecture for existing Next.js websites

## Run locally

Requires Node.js 22 or newer.

```bash
git clone https://github.com/ryukiamor-maker/Amoura_AI_ChatBot.git
cd Amoura_AI_ChatBot
npm install
npm run dev
```

Open:

- `http://localhost:3000/preview` — complete preview page
- `http://localhost:3000/config` — development-only configuration workbench

The committed configuration uses Live mode with the same DeepSeek provider contract as the Portfolio site. Copy `.env.example` to `.env.local` and set `DEEPSEEK_API_KEY`. To run without an external AI request, switch Runtime mode to `mock` in the local workbench and save.

## Copy the component into another Next.js project

1. Copy `src/chatbot` into the host project.
2. Install the runtime dependencies:

   ```bash
   npm install ai @ai-sdk/react lucide-react motion zod
   ```

3. Render the widget from a client component:

   ```tsx
   'use client'

   import { ChatbotWidget, migrateChatbotConfig } from './chatbot'
   import configJson from './chatbot-config.json'

   const config = migrateChatbotConfig(configJson)

   export function SiteChatbot() {
     return <ChatbotWidget config={config} locale="en" apiEndpoint="/api/chat" />
   }
   ```

The component has four public props:

```ts
type ChatbotWidgetProps = {
  config: ChatbotConfig
  locale?: 'en' | 'zh'
  apiEndpoint?: string
  overlayScope?: 'host' | 'viewport'
}
```

Mock mode is completely client-side and only needs `src/chatbot`. Live mode additionally needs a server route; copy `src/app/api/chat/route.ts`, `src/lib/chat-server.ts`, `src/lib/config-server.ts`, and `src/lib/request-security.ts`, or adapt their contracts to your backend. Live mode also requires:

```bash
npm install @ai-sdk/deepseek
```

## Deploy

Before publishing, replace the fictional content in `content/chatbot-config.json` and run the verification gate:

```bash
npm run verify
```

Deploy to Vercel:

```bash
npx vercel
npx vercel --prod
```

For Live mode, add `DEEPSEEK_API_KEY` and optionally `DEEPSEEK_MODEL` to the hosting provider's server-side environment variables. Never commit `.env.local` or an API key.

## Configuration model

`content/chatbot-config.json` is the single public source of truth. It is versioned and validated with Zod before reading, importing, saving, or serving. It contains:

- Runtime mode and public provider settings
- Bilingual identity, profile, FAQ, rules, shortcuts, and evaluations
- Project, timeline, contact, and location cards
- Independent launcher icon/text and expanded-answer avatar image sources
- Zero to eight bottom shortcuts, each with its own icon, label, sent question, displayed Mock answer, and optional card
- Launcher position/delay and safe visual controls

Image fields accept either a public path beginning with `/` or an HTTPS URL. For a shortcut that should return ordinary copy without a card, choose `Text only`; its configured bilingual answer is streamed by the Mock transport. Choosing a card keeps the same configured text response and reveals that card only after the text has finished.

The workbench updates its preview immediately, but changes are written only after **Save configuration** is pressed. The development write API creates a temporary file and atomically renames it. JSON import changes only the draft until saved; export never includes a provider key.

The API key is read from `DEEPSEEK_API_KEY` (with `CHATBOT_API_KEY` retained only as a compatibility fallback). It is never placed in the JSON, client state, config response, or provider error response.

## API contracts

- `GET /api/config` — validated configuration plus a boolean key-status flag
- `PUT /api/config` — development-only, same-origin, validated atomic save
- `POST /api/config/test` — development-only provider probe with sanitized output
- `POST /api/chat` — same-origin, rate-limited Mock or DeepSeek UI message stream

Remote Base URLs must use HTTPS. Local development may use HTTP only for `localhost`, `127.0.0.1`, or `::1`.

## Interaction behavior

- Launcher-to-composer geometric morph and staged welcome sequence
- Reverse close animation, outside click, Escape, and focus loop
- Direct display of incoming stream content; no artificial catch-up queue
- The opening greeting mounts with zero visible words and starts from its first word
- Tool cards appear after text streaming finishes and settles
- Message/draft memory survives close and reopen on the same page, but not a hard refresh
- Chinese/Japanese IME composition and Safari `keyCode 229` protection
- Visual Viewport and ResizeObserver handling for narrow screens and soft keyboards
- Full `prefers-reduced-motion` behavior, plus explicit gentle/reduced modes

## Verification

```bash
npm test
npm run typecheck
npm run build
# or all three
npm run verify
```

The project intentionally does not include Toolcraft Runtime, CLI output, templates, or UI source. Its workbench borrows only the general ideas of schema-driven controls, live preview, section reset, and settings transfer.
