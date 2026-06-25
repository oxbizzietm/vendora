import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import api from "../lib/api";

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sort = searchParams.get("sort") || "featured";

  useEffect(() => {
    let active = true;

    async function loadShopData() {
      setLoading(true);

      try {
        const params = {
          search: searchParams.get("search") || undefined,
          category: searchParams.get("category") || undefined,
          seller: searchParams.get("seller") || undefined,
          minPrice: searchParams.get("minPrice") || undefined,
          maxPrice: searchParams.get("maxPrice") || undefined,
          rating: searchParams.get("rating") || undefined,
          sort,
          page: searchParams.get("page") || 1,
          limit: 12,
        };
        const [productsResponse, categoriesResponse] = await Promise.all([
          api.get("/products", { params }),
          api.get("/products/categories"),
        ]);

        if (active) {
          setProducts(productsResponse.data.products || []);
          setPagination(productsResponse.data.pagination || { page: 1, pages: 1, total: 0 });
          setCategories(categoriesResponse.data.categories || []);
          setError("");
        }
      } catch {
        if (active) {
          setError("Unable to load products. Try again shortly.");
          setProducts([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadShopData();

    return () => {
      active = false;
    };
  }, [searchParams, sort]);

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    next.delete("page");
    setSearchParams(next);
  }

  function setPage(page) {
    const next = new URLSearchParams(searchParams);
    next.set("page", page);
    setSearchParams(next);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-emerald-600">Shop marketplace</p>
          <h1 className="mt-2 text-4xl font-black text-navy-950">Discover trusted deals</h1>
          <p className="mt-3 max-w-2xl text-slate-500">
            Browse curated products from verified sellers across daily essentials, gadgets, fashion, home, and beauty.
          </p>
        </div>
        <select
          value={sort}
          onChange={(event) => updateParam("sort", event.target.value)}
          className="h-11 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
        >
          <option value="featured">Sort by featured</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="rating">Highest rated</option>
          <option value="newest">Newest</option>
          <option value="best_selling">Best Selling</option>
        </select>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-navy-950">Categories</h2>
          <div className="mt-4 space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => updateParam("category", searchParams.get("category") === String(category.id) ? "" : String(category.id))}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                <span>{category.name}</span>
                <span className="text-xs text-slate-400">{category.count?.split(" ")[0] || 0}</span>
              </button>
            ))}
          </div>
        </aside>
        <div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? <StateText text="Loading products..." /> : null}
            {!loading && error ? <StateText text={error} /> : null}
            {!loading && !error && products.length === 0 ? <StateText text="No products match your search yet." /> : null}
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {pagination.pages > 1 ? (
            <div className="mt-8 flex items-center justify-between rounded-md border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage(String(pagination.page - 1))}
                className="rounded-md border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPage(String(pagination.page + 1))}
                className="rounded-md border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StateText({ text }) {
  return <p className="text-sm font-semibold text-slate-500">{text}</p>;
}
