import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CategoryCard from "../components/CategoryCard";
import HeroBanner from "../components/HeroBanner";
import ProductCard from "../components/ProductCard";
import { formatCurrency } from "../data/mockData";
import api, { resolveAssetUrl } from "../lib/api";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          api.get("/products", { params: { limit: 8, sort: "featured" } }),
          api.get("/products/categories"),
        ]);

        if (active) {
          setProducts(productsResponse.data.products || []);
          setCategories(categoriesResponse.data.categories || []);
          setError("");
        }
      } catch {
        if (active) {
          setError("Unable to load live products right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHomeData();

    return () => {
      active = false;
    };
  }, []);

  const flashProducts = products.filter((product) => product.oldPrice).slice(0, 4);
  const featuredProducts = products.slice(0, 4);
  const topSellers = useMemo(() => {
    const sellers = new Map();

    products.forEach((product) => {
      if (!sellers.has(product.seller)) {
        sellers.set(product.seller, {
          id: product.seller,
          name: product.seller,
          specialty: product.category,
          rating: product.rating || 0,
          orders: `${product.soldCount || 0} orders`,
        });
      }
    });

    return [...sellers.values()].slice(0, 3);
  }, [products]);

  return (
    <>
      <HeroBanner />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader title="Featured Categories" action="View all categories" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {loading ? <StateText text="Loading categories..." /> : null}
          {!loading && categories.length === 0 ? <StateText text={error || "No categories available yet."} /> : null}
          {categories.slice(0, 6).map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeader title="Featured Products" action="Shop all" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? <StateText text="Loading featured products..." /> : null}
            {!loading && featuredProducts.length === 0 ? <StateText text={error || "No featured products available yet."} /> : null}
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="rounded-md bg-navy-950 p-6 text-white">
          <p className="text-sm font-black uppercase tracking-wide text-emerald-300">Flash sale</p>
          <h2 className="mt-3 text-3xl font-black">Premium picks ending tonight</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Limited-time deals from verified sellers across mobile, beauty, audio, and home essentials.
          </p>
          <div className="mt-6 grid grid-cols-4 gap-3 text-center">
            {["08h", "21m", "44s", "Live"].map((item) => (
              <div key={item} className="rounded-md bg-white/10 p-3 text-sm font-black">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {loading ? <StateText text="Loading flash deals..." /> : null}
          {!loading && flashProducts.length === 0 ? <StateText text={error || "No flash deals available yet."} /> : null}
          {flashProducts.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="flex gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300"
            >
              <img src={resolveAssetUrl(product.image)} alt={product.name} className="h-24 w-24 rounded-md object-cover" />
              <div>
                <p className="text-sm font-bold text-slate-900">{product.name}</p>
                <p className="mt-1 text-lg font-black text-emerald-600">{formatCurrency(product.price)}</p>
                {product.oldPrice ? (
                  <p className="text-xs text-slate-400 line-through">{formatCurrency(product.oldPrice)}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeader title="Top Sellers" action="Meet sellers" />
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {loading ? <StateText text="Loading sellers..." /> : null}
            {!loading && topSellers.length === 0 ? <StateText text={error || "No sellers available yet."} /> : null}
            {topSellers.map((seller) => (
              <article key={seller.id} className="rounded-md border border-slate-200 p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-100 text-lg font-black text-emerald-700">
                  {seller.name.slice(0, 2)}
                </div>
                <h3 className="mt-4 text-lg font-black text-navy-950">{seller.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{seller.specialty}</p>
                <p className="mt-4 text-sm font-bold text-slate-700">
                  {seller.rating} rating · {seller.orders}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-md bg-emerald-500 p-6 text-white md:grid-cols-[1fr_0.9fr] md:p-8">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-emerald-950">Newsletter</p>
            <h2 className="mt-2 text-3xl font-black">Get early access to verified deals.</h2>
            <p className="mt-3 text-emerald-950">
              Receive weekly marketplace picks, seller spotlights, and limited flash-sale alerts.
            </p>
          </div>
          <form className="flex flex-col gap-3 sm:flex-row md:self-end">
            <input
              className="h-12 min-w-0 flex-1 rounded-md border-0 px-4 text-slate-900 outline-none"
              placeholder="you@example.com"
              type="email"
            />
            <button className="h-12 rounded-md bg-navy-950 px-6 text-sm font-black text-white" type="submit">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

function StateText({ text }) {
  return <p className="text-sm font-semibold text-slate-500">{text}</p>;
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-2xl font-black text-navy-950">{title}</h2>
      <Link to="/shop" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
        {action}
      </Link>
    </div>
  );
}
