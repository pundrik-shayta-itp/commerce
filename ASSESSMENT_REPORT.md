# Frontend Assessment Report

## 1. Architecture Write-up (Data Flow + State Machine)

- App uses `Context API` as central orchestrator in `src/context/CommerceContext.jsx`.
- UI routes are split with lazy loading in `src/App.jsx`.
- Cart behavior follows explicit state classes:
  - `noProduct`
  - `hasProduct`
  - `successful` (transient, auto-normalized to `noProduct`)
- Checkout pipeline uses template flow:
  - validate -> tamper detect -> token check -> process -> success.
- Memento snapshots are used for rollback during failed or inconsistent checkout.

## 2. Edge Case Matrix

| Edge case | Handling |
|---|---|
| Refresh during checkout | Hydration + persisted session/cart/timeline restored from localStorage |
| Double-click place order | Logical lock + UI lock + idempotency key duplicate block |
| Two-tab cart change | `storage` event sync + stale snapshot detection + inconsistency transition |
| Tampering via DevTools | Product signature check + line-level validation + rollback |
| Token reuse | Token lifecycle detects used/expired token and rotates on validation failure |
| Inconsistent state | Timeline adds `ORDER_INCONSISTENT`, checkout blocked and snapshot restored |

## 3. Performance Techniques + Evidence Notes

- Virtualized rendering via `react-window` for product list.
- Lazy route code splitting for app pages.
- Debounced search for product/cart filters.
- Memoized selector isolation (`useMemo`) for filtered/sorted views.
- Runtime metrics shown in lifecycle page:
  - product load time
  - checkout validation time
  - checkout submit trigger time

## 4. Security / Tampering Strategy (Frontend-only)

- Persisted catalog signature and cart checksum.
- Cross-tab state verification before checkout.
- Idempotency key persisted per attempt.
- Submission lock during checkout window.
- Memento rollback on failure/tampering.

## 5. Notification Design & Rules

- In-app notifications use observer pattern.
- Types: success, warning, error, info.
- Dedup logic prevents burst duplicates.
- Queue retained (not overwritten immediately).
- Auto dismiss + manual dismiss button.
- ARIA live announcement region enabled.

## 6. Originality Declaration

- This implementation is custom-built for this assignment requirements.
- Public APIs are used only as allowed data sources.
- No private backend or payment gateway integration.

## 7. Debugging / Observability Notes

- Timeline logs persisted and visualized.
- Validation and submission results are surfaced in notifications.
- Cross-tab mutations are observable through sync notifications and lifecycle transitions.
- Performance metrics are collected in-app and shown in UI.

## 8. Video Walkthrough Checklist

- Login and route protection
- Product list performance (virtualized + debounced search + sort/filter)
- Cart operations and state transitions
- Checkout lock + idempotency behavior
- Tampering detection and rollback
- Two-tab stale cart conflict
- Orders page and lifecycle logs page

