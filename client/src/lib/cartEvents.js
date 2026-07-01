export const CART_UPDATED_EVENT = "vendora:cart-updated";

export function getCartItemCount(cartData) {
  return cartData?.summary?.itemCount ?? cartData?.summary?.totalItems ?? null;
}

export function publishCartUpdate(cartData) {
  const itemCount = getCartItemCount(cartData);
  window.dispatchEvent(
    new CustomEvent(CART_UPDATED_EVENT, {
      detail: {
        itemCount: typeof itemCount === "number" ? itemCount : null,
      },
    })
  );
}
