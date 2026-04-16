# Commerce App

A React + Vite commerce demo application with robust frontend-only resilience, state management, checkout validation, timeline tracking, and cross-tab synchronization.

## Overview

This app demonstrates a production-oriented frontend architecture with:

- client-side session and cart persistence in `localStorage`
- cross-tab synchronization via browser `storage` events
- checkout validation, rollback, and idempotency controls
- state machine behavior for cart lifecycle management
- remote history/bootstrap simulation via `jsonplaceholder.typicode.com`
- optimized product browsing using virtualization and search debouncing
- structured timeline logging and notification rules

## Run Locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Architecture

### Core modules

- `src/context/CommerceContext.jsx`
  - central application state provider
  - local storage hydration, persistence, and cross-tab sync
  - checkout orchestration and timeline event tracking
  - product loading, login flow, cart updates, and notifications

- `src/api/fakeStore.js`
  - remote product fetch with browser caching
  - expands base catalog into a large variant set for UX/load testing

- `src/api/jsonPlaceholder.js`
  - simulates remote bootstrap and writeback via JSONPlaceholder
  - maintains a local mirror cache to preserve remote-like state

- `src/patterns/observer/NotificationCenter.js`
  - publishes notification events to the UI without tightly coupling producers and consumers

- `src/patterns/memento/CartMemento.js`
  - captures cart snapshots before checkout and supports rollback on failures

- `src/patterns/state/*`
  - cart lifecycle states: `NoProductState`, `HasProductState`, and `SuccessfulState`
  - encapsulated cart behavior and checkout entrypoints per state

- `src/patterns/template/CheckoutTemplate.js`
  - defines the checkout validation pipeline, including tamper checks and token guard

## Design Patterns

- Observer: `NotificationCenter` decouples event production from toast rendering.
- Memento: `CartMemento` stores cart state snapshots to enable rollback.
- State: `NoProductState`, `HasProductState`, and `SuccessfulState` isolate cart behavior based on lifecycle phase.
- Template Method: `CheckoutTemplate.execute()` orchestrates validation, tamper detection, token verification, and order creation.

## Data Flow

1. Pages use `useCommerce()` to call provider actions.
2. `CommerceContext` updates React state and writes to `localStorage`.
3. Cross-tab changes are synchronized via `storage` event listeners.
4. Checkout uses the template pipeline and state machine guards.
5. Timeline events and remote snapshots are pushed to simulated remote storage.

## State Machine Table

| State | Description | Allowed Actions | Resulting State | Notes |
|---|---|---|---|---|
| `noProduct` | Empty cart | `addProduct` | `hasProduct` | First cart item added transitions to active state |
| `hasProduct` | Active cart | `addProduct`, `increaseQuantity`, `decreaseQuantity`, `removeProduct` | `hasProduct` / `noProduct` | Regular cart operations remain in active state |
| `hasProduct` | Checkout attempted | `checkOut` | `successful` or rollback | Checkout validation, tamper detection, and idempotency enforced |
| `successful` | Recent successful order | `addProduct` | `hasProduct` | New cart starts after successful checkout |
| `successful` | No cart items | `decreaseQuantity`, `removeProduct`, `checkOut` | `successful` | No-op warnings preserve safe post-checkout behavior |

### Timeline / audit states

| Timeline Event | Trigger | Purpose |
|---|---|---|
| `CART_READY` | Cart becomes non-empty or app loads | Tracks readiness for checkout |
| `CHECKOUT_VALIDATED` | Validation passed before submission | Confirms pre-submit integrity |
| `ORDER_SUBMITTED` | Checkout is submitted | Marks an order attempt |
| `ORDER_SUCCESS` | Checkout completed | Confirms final success |
| `ORDER_FAILED` | Checkout failed | Captures failure event |
| `ORDER_INCONSISTENT` | Cross-tab state mismatch detected | Signals stale / inconsistent UI state |
| `ROLLED_BACK` | Checkout error led to rollback | Audits rollback recovery |

## Edge Case Matrix

| Requirement | Implementation | Outcome |
|---|---|---|
| Refresh during checkout | `localStorage` persists session, cart, timeline, token, and idempotency keys | App recovers safely and avoids data loss on refresh |
| Double-click `Place Order` | `checkoutLockRef` blocks reentry; `isCheckoutLocked` disables button; idempotency blocks duplicate submission | Prevents duplicate checkout attempts |
| Two tabs, one cart update | `storage` event syncs cart, state, history, token, timeline, and product signature | Tabs stay synchronized and user is notified |
| API delay / timeout | simulated delay inside checkout and remote API calls via fetch | Latency is handled explicitly, UI remains responsive |
| Partial / invalid API response | API helpers validate responses; JSON parsing is wrapped in `try/catch` | Invalid data is ignored and users are notified rather than crashing |
| State mismatch / persistence failure | `ensureLatestBeforeCheckout()` compares cart checksum and storage state, writes `ORDER_INCONSISTENT` timeline | Prevents checkout with stale UI state |
| Retry vs rollback | Failed checkout calls `rollbackMemento()` and logs `ROLLED_BACK` | Failed orders revert cart safely; user may retry afterward |

## Performance Techniques + Evidence

- Virtualized product list using `react-window` in `src/pages/ItemsPage.jsx`.
- Debounced search inputs via `src/hooks/useDebouncedValue.jsx`.
- Memoized filters and derived collections with `useMemo`.
- Product catalog browser cache stored under `commerce.catalog.500`.
- Lazily loaded routes with `React.lazy` and `Suspense`.
- Runtime metrics captured in `performanceMetrics` for:
  - `productsLoadMs`
  - `checkoutValidationMs`
  - `checkoutSubmissionMs`

> Evidence: runtime instrumentation is implemented in the provider and can be used for profiling and performance validation.

## Security / Tampering Strategy

- Product catalog signature stored in `productsSignature` and compared against stored catalog.
- Cart checksum validation detects any modification to cart line items.
- `validateCheckoutSecurity()` verifies product data and cart integrity before checkout.
- Checkout tokens expire and are one-time use.
- Idempotency keys are derived from cart checksum plus checkout token.
- Tampering or invalid state triggers checkout failure, rollback, and notification.

## Notification Design & Rules

- Notifications are emitted through `NotificationCenter` and consumed by `NotificationList`.
- Toasts are shown with `role="status"` and `aria-live="polite"` for accessibility.
- Notifications auto-dismiss after 3.2 seconds and can be closed manually.
- Event queue is capped at 30 entries to prevent overload.
- Timeline events guard against duplicate identical status/reason entries.

## Debugging & Observability

- Centralized state in `CommerceContext` supports easy breakpoint placement.
- Timeline logs provide a trace of checkout lifecycle events.
- `performanceMetrics` adds measurable timing data for load and checkout steps.
- Cross-tab and persistence behavior can be traced through storage events.
- Notifications surface runtime failures and state changes directly to users.

## Originality Declaration

This repository is an original frontend commerce implementation designed to showcase resilient client-side state management, safe checkout processing, and edge-case handling in a React application.

