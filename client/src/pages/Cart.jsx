import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import { formatCurrency } from "../data/mockData";
import api, { resolveAssetUrl } from "../lib/api";

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ subtotal: 0, itemCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCart = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setSummary({ subtotal: 0, itemCount: 0 });
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/cart");
      setItems(data.items || []);
      setSummary(data.summary || { subtotal: 0, itemCount: 0 });
      setError("");
    } catch {
      setError("Unable to load cart.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function handleUpdateQuantity(itemId, newQuantity) {
    if (newQuantity < 1) {
      await handleRemove(itemId);
      return;
    }

    try {
      await api.put(`/cart/${itemId}`, { quantity: newQuantity });
      await loadCart();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update quantity.");
    }
  }

  async function handleRemove(itemId) {
    try {
      await api.delete(`/cart/${itemId}`);
      await loadCart();
      toast.success("Item removed from cart.");
    } catch {
      toast.error("Could not remove item.");
    }
  }

  async function handleClear() {
    try {
      await api.delete("/cart/clear");
      await loadCart();
      toast.success("Cart cleared.");
    } catch {
      toast.error("Could not clear cart.");
    }
  }

  const delivery = summary.subtotal >= 50000 ? 0 : 6500;
  const tax = Number((summary.subtotal * 0.075).toFixed(2));
  const total = summary.subtotal + delivery + tax;

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-black text-navy-950">Cart</h1>
        <div className="mt-8 rounded-md border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-500">Login to view your cart items.</p>
          <Link to="/login" className="mt-4 inline-block rounded-md bg-emerald-500 px-6 py-3 text-sm font-black text-white">
            Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-4xl font-black text-navy-950">Cart</h1>
        {items.length > 0 && (
          <button type="button" onClick={handleClear} className="text-sm font-bold text-red-600 hover:text-red-700">
            Clear cart
          </button>
        )}
      </div>
      {loading ? (
        <p className="mt-8 text-sm font-semibold text-slate-500">Loading cart...</p>
      ) : error ? (
        <p className="mt-8 text-sm font-semibold text-slate-500">{error}</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-md border border-slate-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-slate-500">Your cart is empty.</p>
          <Link to="/shop" className="mt-4 inline-block rounded-md bg-emerald-500 px-6 py-3 text-sm font-black text-white">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.itemId} className="flex gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <Link to={`/products/${item.id}`}>
                  <img src={resolveAssetUrl(item.image)} alt={item.name} className="h-28 w-28 rounded-md object-cover" />
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link to={`/products/${item.id}`} className="font-black text-navy-950 hover:text-emerald-700">
                      {item.name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500">Sold by {item.seller}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg font-black text-emerald-600">{formatCurrency(item.price)}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.itemId, item.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-sm font-bold hover:border-emerald-300"
                      >
                        -
                      </button>
                      <span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={item.quantity >= item.stock}
                        onClick={() => handleUpdateQuantity(item.itemId, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-sm font-bold hover:border-emerald-300 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.itemId)}
                      className="text-sm font-bold text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="h-fit rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-navy-950">Order Summary</h2>
            <SummaryRow label="Subtotal" value={formatCurrency(summary.subtotal)} />
            <SummaryRow label="Delivery" value={delivery === 0 ? "Free" : formatCurrency(delivery)} />
            <SummaryRow label="Tax (7.5% VAT)" value={formatCurrency(tax)} />
            <div className="mt-4 border-t border-slate-200 pt-4">
              <SummaryRow label="Total" value={formatCurrency(total)} strong />
            </div>
            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="mt-6 h-12 w-full rounded-md bg-emerald-500 text-sm font-black text-white hover:bg-emerald-600"
            >
              Checkout ({summary.itemCount} items)
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className={`mt-4 flex justify-between gap-4 ${strong ? "text-lg font-black" : "text-sm font-semibold"}`}>
      <span className="text-slate-500">{label}</span>
      <span className="text-navy-950">{value}</span>
    </div>
  );
}
