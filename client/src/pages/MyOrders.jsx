import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { formatCurrency } from "../data/mockData";
import api from "../lib/api";

const statusColors = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-slate-100 text-slate-800",
};

export default function MyOrders() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders(page = 1) {
    try {
      const { data } = await api.get("/orders", { params: { page, limit: 10 } });
      setOrders(data.orders || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
      setError("");
    } catch {
      setError("Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    loadOrders();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-black text-navy-950">My Orders</h1>
        <div className="mt-8 rounded-md border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-500">Login to view your orders.</p>
          <Link to="/login" className="mt-4 inline-block rounded-md bg-emerald-500 px-6 py-3 text-sm font-black text-white">
            Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-navy-950">My Orders</h1>
      {loading ? (
        <p className="mt-8 text-sm font-semibold text-slate-500">Loading orders...</p>
      ) : error ? (
        <p className="mt-8 text-sm font-semibold text-slate-500">{error}</p>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-md border border-slate-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-slate-500">You have not placed any orders yet.</p>
          <Link to="/shop" className="mt-4 inline-block rounded-md bg-emerald-500 px-6 py-3 text-sm font-black text-white">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-navy-950">{order.orderNumber}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(order.placedAt).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${statusColors[order.status] || "bg-slate-100 text-slate-800"}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <p className="text-sm text-slate-600">{order.itemCount} item(s)</p>
                <p className="text-lg font-black text-navy-950">{formatCurrency(order.grandTotal)}</p>
              </div>
            </Link>
          ))}
          {pagination.pages > 1 ? (
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => loadOrders(pagination.page - 1)}
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
                onClick={() => loadOrders(pagination.page + 1)}
                className="rounded-md border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
