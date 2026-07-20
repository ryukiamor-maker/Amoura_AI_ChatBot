# Toolcraft UI reference worklog

Mode: independent UI-language reference only. This project does not include Toolcraft Runtime, generated source, CLI output, or template code.

## Control section inventory

| Section | Product entity / stage | Targets | Grouping reason |
| --- | --- | --- | --- |
| Runtime | Provider execution | mode, Base URL, model, key status, test | One external execution decision |
| Identity | Assistant identity | locale, name, persona | One conversational identity |
| Knowledge | Verified response knowledge | profile, FAQ, rules, suggestions, evaluations | Content that governs answers |
| Cards | Structured tool results | projects, timeline, contact, location | Visual answer entities |
| Launcher | Entry interaction | label, delay, starting side | Closed-state behavior |
| Appearance | Safe theme surface | accent, surface, card, motion | Non-structural visual tokens |
| Transfer | Persistence workflow | import, export, defaults, save | Configuration lifecycle |

## Decision trail

### 2026-07-20 — UI correction and reference alignment

- Request: keep the existing chatbot UI and interaction, use a blank host page, make the launcher freely draggable, keep the open composer fixed at the bottom, and use Toolcraft's control-panel language.
- Task type: reference UI study plus interaction behavior and controls presentation.
- Verification tier: Tier 3 because drag geometry, Morph coordinates, overlay focus isolation, responsive behavior, and the full workbench shell changed.
- Reference checked: the user-provided screenshots, the read-only Portfolio chatbot implementation, and the local Toolcraft generated-app contracts and UI tokens.
- Contract rules applied: product-entity sections, 36px collapsible headers, section-scoped reset, compact full-width fields, neutral canvas, floating panel, explicit persistence.
- Decision: preserve the Portfolio chatbot implementation structure and CSS; replace only personal data/assets with configuration-driven mock equivalents. Rebuild the workbench independently in a Toolcraft-inspired visual language without importing its runtime or source.
- Rejected: the earlier editorial preview design; Toolcraft Runtime integration; personal timeline logos, avatar, location art, and branded links.
- State/output mapping: draft fields update `ChatbotConfig`; preview forces Mock transport; save validates and atomically replaces the JSON source; launcher pointer movement updates its closed geometry, which is reused by open/close Morph.
- Verification: `npm test`, `npm run typecheck`, `npm run build`, desktop/mobile/reduced-motion browser checks, drag/open/close checks, and source/privacy fingerprints.
