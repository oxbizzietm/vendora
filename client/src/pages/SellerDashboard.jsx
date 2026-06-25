import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { formatCurrency } from "../data/mockData";
import api, { resolveAssetUrl } from "../lib/api";

export default function SellerDashboard() {
  const [products, setProducts] = useState([]);
  const [orderCount, setOrderCount] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const [prodRes, orderRes, analyticsRes] = await Promise.allSettled([
          api.get("/products/mine", { params: { limit: 48, sort: "newest" } }),
          api.get("/orders/seller", { params: { limit: 1 } }),
          api.get("/seller/analytics"),
        ]);

        if (active) {
          if (prodRes.status === "fulfilled") {
            setProducts(prodRes.value.data.products || []);
          }
          if (orderRes.status === "fulfilled") {
            setOrderCount(orderRes.value.data.pagination?.total || 0);
          }
          if (analyticsRes.status === "fulfilled") {
            setAnalytics(analyticsRes.value.data);
          }
          setError("");
        }
      } catch {
        if (active) {
          setError("Unable to load your data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  async function handleDelete(product) {
    try {
      await api.delete(`/products/${product.id}`);
      toast.success(`${product.name} deleted.`);
      setProducts((items) => items.filter((item) => item.id !== product.id));
    } catch (deleteError) {
      toast.error(deleteError.response?.data?.message || "Product could not be deleted.");
    }
  }

  const lowStock = products.filter((product) => product.stock <= 5).length;
  const activeProducts = products.filter((product) => product.status === "active").length;
  const totalValue = products.reduce((sum, product) => sum + product.price * product.stock, 0);
  const stats = [
    ["Inventory value", formatCurrency(totalValue), "Across your listed stock"],
    ["Active products", String(activeProducts), `${lowStock} products low on stock`],
    ["Products", String(products.length), "Live MySQL product records"],
    ["Incoming orders", String(orderCount), "Orders containing your products"],
  ];

  return (
    <DashboardShell label="Seller Dashboard" title="Manage your Vendora store">
      <div className="mb-6 flex flex-wrap justify-end gap-3">
        <Link
          to="/seller/orders"
          className="rounded-md border border-slate-200 px-4 py-3 text-sm font-black text-navy-950 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          View Orders
        </Link>
        <Link
          to="/seller/products/new"
          className="rounded-md bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600"
        >
          Add Product
        </Link>
      </div>
      <div className="grid gap-5 md:grid-cols-4">
        {stats.map(([title, value, note]) => (
          <StatCard key={title} title={title} value={value} note={note} />
        ))}
      </div>
      {analytics ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-navy-950">Revenue Chart</h2>
              <p className="text-sm font-bold text-emerald-700">{formatCurrency(analytics.summary.revenue)} total revenue</p>
            </div>
            <div className="mt-5 grid h-56 grid-cols-7 items-end gap-3">
              {(analytics.revenue || []).map((point) => {
                const max = Math.max(...(analytics.revenue || []).map((item) => item.revenue), 1);
                const height = Math.max((point.revenue / max) * 100, point.revenue > 0 ? 12 : 4);

                return (
                  <div key={point.day} className="flex h-full flex-col justify-end gap-2">
                    <div className="rounded-t-md bg-emerald-500" style={{ height: `${height}%` }} title={formatCurrency(point.revenue)} />
                    <span className="truncate text-center text-[11px] font-bold text-slate-500">
                      {new Date(point.day).toLocaleDateString("en-NG", { weekday: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-navy-950">Sales Report</h2>
            <div className="mt-4 grid gap-3">
              <ReportRow label="Orders" value={analytics.summary.orders} />
              <ReportRow label="Units sold" value={analytics.summary.unitsSold} />
              <ReportRow label="Average line value" value={formatCurrency(analytics.summary.averageLineValue)} />
              <ReportRow label="Low stock alerts" value={analytics.summary.lowStock} />
              <ReportRow label="Out of stock" value={analytics.summary.outOfStock} />
            </div>
          </div>
        </div>
      ) : null}
      {analytics ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <InventoryPanel title="Low Stock Alerts" products={analytics.lowStockProducts} empty="No low stock products." />
          <InventoryPanel title="Out of Stock Products" products={analytics.outOfStockProducts} empty="No products are out of stock." />
        </div>
      ) : null}
      {analytics?.productPerformance?.length ? (
        <div className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-navy-950">Product Performance</h2>
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            {analytics.productPerformance.map((product) => (
              <div key={product.id} className="grid gap-3 border-b border-slate-200 p-4 text-sm last:border-0 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                <p className="font-bold text-navy-950">{product.name}</p>
                <p className="font-semibold text-slate-600">{product.unitsSold} sold</p>
                <p className="font-semibold text-slate-600">{formatCurrency(product.revenue)}</p>
                <p className="font-semibold text-slate-600">{product.rating}/5 rating</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-navy-950">My Products</h2>
          <Link
            to="/seller/products/new"
            className="text-sm font-bold text-emerald-700 hover:text-emerald-800"
          >
            + Add
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {loading ? <p className="text-sm font-semibold text-slate-500">Loading your products...</p> : null}
          {!loading && error ? <p className="text-sm font-semibold text-slate-500">{error}</p> : null}
          {!loading && !error && products.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">You have not added products yet.</p>
          ) : null}
          {products.map((product) => (
            <div
              key={product.id}
              className="grid gap-4 rounded-md bg-slate-50 p-4 text-sm font-bold text-slate-700 md:grid-cols-[72px_1fr_auto] md:items-center"
            >
              <img src={resolveAssetUrl(product.image)} alt={product.name} className="h-16 w-16 rounded-md object-cover" />
              <div>
                <p className="text-navy-950">{product.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {product.category} - {formatCurrency(product.price)} - {product.stock} in stock - {product.status}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/seller/products/${product.id}/edit`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-navy-950 hover:border-emerald-300 hover:text-emerald-700"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(product)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-navy-950 hover:border-emerald-300 hover:text-emerald-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

function ReportRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm font-bold">
      <span className="text-slate-500">{label}</span>
      <span className="text-navy-950">{value}</span>
    </div>
  );
}

function InventoryPanel({ title, products, empty }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-navy-950">{title}</h2>
      <div className="mt-4 grid gap-2">
        {products?.length ? (
          products.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm">
              <span className="font-bold text-navy-950">{product.name}</span>
              <span className="font-black text-emerald-700">{product.stock} left</span>
            </div>
          ))
        ) : (
          <p className="text-sm font-semibold text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  );
}

export function DashboardShell({ label, title, children }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-black uppercase tracking-wide text-emerald-600">{label}</p>
      <h1 className="mt-2 text-4xl font-black text-navy-950">{title}</h1>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function StatCard({ title, value, note }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-navy-950">{value}</p>
      <p className="mt-2 text-sm text-emerald-700">{note}</p>
    </article>
  );
}
