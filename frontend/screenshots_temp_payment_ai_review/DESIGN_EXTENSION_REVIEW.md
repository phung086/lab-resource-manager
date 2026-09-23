# Ordinary extension — design documentation outcome

No canonical documents or design-system files changed. Checked PRODUCT.md, light-redesign.css, payments/assistant components and styles, QuickBookingModal, BookingOperationCard, and state/handoff/mobile fixture screenshots.

- Palette: existing white surfaces, #f5f7fb canvas, #2563eb primary actions, slate text, amber/emerald/red status colors.
- Type: Plus Jakarta Sans; IBM Plex Mono for transaction references/tool identifiers. Payment heading/amount 26px, assistant response 14px.
- Components: BaseModal2026 retained for provider choices and receipts; assistant uses existing surface/border/shadow variables.
- Responsive: payment cards collapse at 760px; assistant fills mobile width with 16px controls/padding and fixed composer around independently scrollable content.
- Interaction: terminal refresh removes stale payment controls; async assistant result scrolls into view; booking handoff narrows to persisted booking ID.

Existing small shell labels/eyebrow styling and technical tool labels were not canonized as new rules or repaired outside scope. Fixture images are automated test evidence, not live payment evidence. Final print-only correction uses an A4 stylesheet and does not change screen tokens.
