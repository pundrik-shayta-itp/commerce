export function QuantityControl({ quantity, onIncrease, onDecrease }) {
  return (
    <div className="qty-control">
      <button type="button" onClick={onDecrease}>
        -
      </button>
      <span>{quantity}</span>
      <button type="button" onClick={onIncrease}>
        +
      </button>
    </div>
  )
}
