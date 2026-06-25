import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import { formatCurrency } from "../data/mockData";
import api, { resolveAssetUrl } from "../lib/api";

export default function Wishlist() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/wishlist");
      setItems(data.items || []);
      setError("");
    } catch {
      setError("Unable to load wishlist.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  async function handleRemove(productId) {
    try {
      await api.delete(`/wishlist/${productId}`);
      setItems((current) => current.filter((item) => item.id !== productId));
      toast.success("Removed from wishlist.");
    } catch {
      toast.error("Could not remove item.");
    }
  }

  async function handleAddToCart(productId) {
    try {
      await api.post("/cart", { productId, quantity: 1 });
      toast.success("Added to cart!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add to cart.");
    }
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-black text-navy-950">Wishlist</h1>
        <div className="mt-8 rounded-md border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-500">Login to view your wishlist.</p>
          <Link to="/login" className="mt-4 inline-block rounded-md bg-emerald-500 px-6 py-3 text-sm font-black text-white">
            Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-navy-950">Wishlist</h1>
      {loading ? (
        <p className="mt-8 text-sm font-semibold text-slate-500">Loading wishlist...</p>
      ) : error ? (
        <p className="mt-8 text-sm font-semibold text-slate-500">{error}</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-md border border-slate-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-slate-500">Your wishlist is empty.</p>
          <Link to="/shop" className="mt-4 inline-block rounded-md bg-emerald-500 px-6 py-3 text-sm font-black text-white">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <article key={item.wishlistId} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              <Link to={`/products/${item.id}`}>
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  <img src={resolveAssetUrl(item.image)} alt={item.name} className="h-full w-full object-cover" />
                </div>
              </Link>
              <div className="p-4">
                <Link to={`/products/${item.id}`} className="text-sm font-bold text-navy-950 hover:text-emerald-700">
                  {item.name}
                </Link>
                <p className="mt-1 text-xs text-slate-500">Sold by {item.seller}</p>
                <p className="mt-2 text-lg font-black text-emerald-600">{formatCurrency(item.price)}</p>
                {item.oldPrice ? (
                  <p className="text-xs text-slate-400 line-through">{formatCurrency(item.oldPrice)}</p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item.id)}
                    className="flex-1 rounded-md bg-emerald-500 py-2 text-xs font-bold text-white hover:bg-emerald-600"
                  >
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-red-300 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
