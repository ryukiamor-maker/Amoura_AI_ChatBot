# vercel/chatbot core extraction

- Upstream: `https://github.com/vercel/chatbot`
- Commit: `c2f8235e1f3ea903ad8b7f61447c4f74164b5c58`
- License: Apache License 2.0
- AI SDK baseline: `ai@7.0.15`, `@ai-sdk/react@4.0.16`

## Retained architecture

- `useChat` with a replaceable `ChatTransport`
- standard `UIMessage` parts and typed `tool-*` parts
- streamed text rendering through the upstream AI Elements `MessageResponse`
- suggested actions, controlled prompt input, stop/regenerate behavior, and auto-scroll

## Local adaptations

- Phase 1 used `MockChatTransport`; the public experience now uses
  `DefaultChatTransport` through the local live transport adapter.
- Full-page navigation is replaced by an embedded, accessible Portfolio dialog.
- Auth, persistence, history, votes, attachments, artifacts, model selection, and slash commands are removed.
- Existing `motion` is reused; `framer-motion` is not added.
- Five Portfolio-specific tool cards are rendered in the adapter layer.

The Phase 3 transport swap keeps the same `PortfolioChatMessage`, tool schemas,
message components, and card renderers. Mock transport remains only for contract tests.
