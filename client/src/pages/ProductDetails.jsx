import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import ProductCard from "../components/ProductCard";
import { formatCurrency } from "../data/mockData";
import { Icon } from "../components/Icons";
import api, { resolveAssetUrl } from "../lib/api";
import { publishCartUpdate } from "../lib/cartEvents";

export default function ProductDetails() {
  const { productId } = useParams();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [activeImage, setActiveImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);

      try {
        const { data } = await api.get(`/products/${productId}`);
        const nextProduct = data.product;
        const [relatedResponse, recentResponse] = await Promise.all([
          api.get("/products/recommendations", {
            params: {
              category: nextProduct.categorySlug || nextProduct.category,
              limit: 5,
            },
          }),
          isAuthenticated
            ? api.get("/products/recently-viewed", { params: { limit: 5 } }).catch(() => ({ data: { products: [] } }))
            : Promise.resolve({ data: { products: [] } }),
        ]);

        if (active) {
          setProduct(nextProduct);
          setActiveImage(nextProduct.images?.[0] || nextProduct.image);
          setRelated((relatedResponse.data.products || []).filter((item) => item.id !== nextProduct.id).slice(0, 4));
          setRecentlyViewed((recentResponse.data.products || []).filter((item) => item.id !== nextProduct.id).slice(0, 4));
          setError("");
        }
      } catch {
        if (active) {
          setError("Product details could not be loaded.");
          setProduct(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [isAuthenticated, productId]);

  async function handleAddToCart() {
    if (!isAuthenticated) {
      toast.error("Login to add items to cart.");
      return;
    }

    try {
      const { data } = await api.post("/cart", { productId: product.id, quantity: 1 });
      publishCartUpdate(data);
      toast.success(`${product.name} added to cart`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add to cart.");
    }
  }

  async function handleAddToWishlist() {
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

  async function handleSubmitReview(event) {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.error("Login to review this product.");
      return;
    }

    setReviewing(true);

    try {
      await api.post(`/products/${product.id}/reviews`, reviewForm);
      const { data } = await api.get(`/products/${product.id}`);
      setProduct(data.product);
      setReviewForm({ rating: 5, comment: "" });
      toast.success("Review saved.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save review.");
    } finally {
      setReviewing(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-slate-500">Loading product details...</p>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/shop" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
          Back to shop
        </Link>
        <p className="mt-6 text-sm font-semibold text-slate-500">{error || "Product not found."}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/shop" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
        Back to shop
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <img src={resolveAssetUrl(activeImage)} alt={product.name} className="aspect-[4/3] w-full object-cover" />
          {product.images?.length > 1 ? (
            <div className="grid grid-cols-4 gap-3 p-4">
              {product.images.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(image)}
                  className="overflow-hidden rounded-md border border-slate-200 bg-white"
                >
                  <img src={resolveAssetUrl(image)} alt={product.name} className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-6">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            {product.badge}
          </span>
          <h1 className="mt-4 text-4xl font-black text-navy-950">{product.name}</h1>
          <p className="mt-3 text-sm font-semibold text-slate-500">Sold by {product.seller}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">Category: {product.category}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <span className="flex items-center gap-1 text-amber-500">
              <Icon name="star" className="h-4 w-4 fill-amber-400" />
              {product.rating}
            </span>
            <span>{product.reviews} verified reviews</span>
          </div>
          <div className="mt-6">
            <p className="text-4xl font-black text-navy-950">{formatCurrency(product.price)}</p>
            {product.oldPrice ? <p className="mt-1 text-sm text-slate-400 line-through">{formatCurrency(product.oldPrice)}</p> : null}
          </div>
          <p className="mt-6 leading-7 text-slate-600">{product.description}</p>
          <div className="mt-6 rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            {product.stock} units available - secure checkout - seller dispatch within 24 hours
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleAddToCart} className="h-12 flex-1 rounded-md bg-emerald-500 text-sm font-black text-white hover:bg-emerald-600">
              Add to Cart
            </button>
            <button
              type="button"
              onClick={handleAddToWishlist}
              className="h-12 flex-1 rounded-md border border-slate-200 text-sm font-black text-navy-950 hover:border-emerald-300 hover:text-emerald-700"
            >
              Save Item
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black text-navy-950">Reviews</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Average rating: {product.averageRating || product.rating || 0} from {product.reviewCount || product.reviews || 0} reviews
        </p>
        <form onSubmit={handleSubmitReview} className="mt-5 grid gap-3 rounded-md bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-bold text-navy-950" htmlFor="rating">
              Your rating
            </label>
            <select
              id="rating"
              value={reviewForm.rating}
              onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
            >
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} star{rating > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={reviewForm.comment}
            onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
            placeholder="Share your experience"
            className="min-h-24 rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={reviewing}
            className="h-10 w-fit rounded-md bg-emerald-500 px-5 text-sm font-black text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {reviewing ? "Saving..." : "Submit Review"}
          </button>
        </form>
        <div className="mt-5 grid gap-3">
          {product.reviewItems?.length ? (
            product.reviewItems.map((review) => (
              <article key={review.id} className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-black text-navy-950">
                  {review.user} - {review.rating}/5
                </p>
                <p className="mt-2 text-sm text-slate-600">{review.comment || "No comment left."}</p>
              </article>
            ))
          ) : (
            <p className="text-sm font-semibold text-slate-500">No reviews yet.</p>
          )}
        </div>
      </div>

      <ProductGrid title="Recommended Products" products={related} />
      {recentlyViewed.length ? <ProductGrid title="Recently Viewed" products={recentlyViewed} /> : null}
    </section>
  );
}

function ProductGrid({ title, products }) {
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-black text-navy-950">{title}</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </div>
  );
}
