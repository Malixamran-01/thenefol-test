/** Matches backend `customerSegmentService.computeSegmentDiscountAmount` */
export function computeSegmentDiscountAmount(subtotal: number, discountPercent: number): number {
  if (subtotal <= 0 || discountPercent <= 0) return 0
  return Math.round((subtotal * discountPercent) / 100)
}
