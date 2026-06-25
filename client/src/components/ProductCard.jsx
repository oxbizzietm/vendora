import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import { formatCurrency } from "../data/mockData";
import { resolveAssetUrl } from "../lib/api";
import { Icon } from "./Icons";
import api from "../lib/api";

export default function ProductCard({ product }) {
  const { isAuthenticated } = useAuth();

  async function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Login to add items to cart.");
      return;
    }

    try {
      await api.post("/cart", { productId: product.id, quantity: 1 });
      toast.success(`${product.name} added to cart`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add to cart.");
    }
  }

  async function handleAddToWishlist(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Login to save items.");
      return;
    }

    try {
      await api.post(`/wishlist/${product.id}`);
      toast.success(`${product.name} saved to wishlist`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save item.");
    }
  }

  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="group overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:shadow-xl"
    >
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <img
            src={resolveAssetUrl(product.image)}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-navy-950 px-3 py-1 text-xs font-bold text-white">
            {product.badge}
          </span>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            {product.category}
          </p>
          <Link
            to={`/products/${product.id}`}
            className="mt-1 line-clamp-2 min-h-11 text-sm font-bold text-slate-900 transition hover:text-emerald-600"
          >
            {product.name}
          </Link>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1 text-amber-500">
            <Icon name="star" className="h-4 w-4 fill-amber-400" />
            {product.rating}
          </span>
          <span>({product.reviews} reviews)</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-black text-navy-950">{formatCurrency(product.price)}</p>
            {product.oldPrice ? (
              <p className="text-xs text-slate-400 line-through">{formatCurrency(product.oldPrice)}</p>
            ) : null}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleAddToWishlist}
              className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
              title="Save to wishlist"
            >
              <Icon name="heart" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-600"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
