# Checkout Security And Stale Snapshot Handling

## Stale cart and product snapshot strategy

- Before checkout, the app compares in-memory cart checksum and state with the latest persisted values in `localStorage`.
- If a mismatch is detected (another tab changed cart/state), checkout is blocked and the tab is synced to the latest snapshot.
- Product tampering is checked by comparing:
  - persisted product signature,
  - current product signature,
  - cart line items against authoritative product snapshot.
- On mismatch/tampering, checkout moves to inconsistent/failure flow and rollback is applied from memento when available.

## Idempotency and submission lock

- Each checkout attempt uses a persisted idempotency key: `<cartChecksum>:<checkoutToken>`.
- Used keys are saved and duplicate attempts are blocked.
- A logical lock and UI lock prevent concurrent submissions and double-click pay.

## Checkout token lifecycle simulation

- Checkout token is persisted with `value`, `expiresAt`, and `used`.
- Expired or used token causes validation failure.
- Reuse detection rotates token and asks user to retry.

