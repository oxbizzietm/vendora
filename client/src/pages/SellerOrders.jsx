import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "../data/mockData";
import api, { resolveAssetUrl } from "../lib/api";
import { DashboardShell } from "./SellerDashboard";

const statusColors = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-slate-100 text-slate-800",
};

const statusFlow = ["pending", "processing", "shipped", "delivered"];

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadOrders = useCallback(async (page = 1) => {
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;

      const { data } = await api.get("/orders/seller", { params });
      setOrders(data.orders || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleUpdateStatus(orderId, newStatus) {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}.`);
      loadOrders(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update status.");
    }
  }

  function getNextStatus(currentStatus) {
    const index = statusFlow.indexOf(currentStatus);
    if (index === -1 || index >= statusFlow.length - 1) return null;
    return statusFlow[index + 1];
  }

  return (
    <DashboardShell label="Seller Dashboard" title="Incoming Orders">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-slate-700">Filter:</span>
        {["", "pending", "processing", "shipped", "delivered", "cancelled"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-md px-3 py-1 text-xs font-bold transition ${
              statusFilter === status
                ? "bg-emerald-500 text-white"
                : "border border-slate-200 text-slate-600 hover:border-emerald-300"
            }`}
          >
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Loading orders...</p>
      ) : error ? (
        <p className="text-sm font-semibold text-red-600">{error}</p>
      ) : orders.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-slate-500">No incoming orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-navy-950">{order.orderNumber}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Customer: {order.customerName} |{" "}
                    {new Date(order.placedAt).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${statusColors[order.status] || "bg-slate-100 text-slate-800"}`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-md bg-slate-50 p-2">
                    <img src={resolveAssetUrl(item.image)} alt={item.productName} className="h-10 w-10 rounded-md object-cover" />
                    <div className="flex flex-1 items-center justify-between text-sm">
                      <span className="font-semibold text-navy-950">{item.productName}</span>
                      <span className="text-slate-600">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-lg font-black text-navy-950">{formatCurrency(order.grandTotal)}</p>
                <div className="flex gap-2">
                  {getNextStatus(order.status) && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, getNextStatus(order.status))}
                      className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600"
                    >
                      Mark as {getNextStatus(order.status).charAt(0).toUpperCase() + getNextStatus(order.status).slice(1)}
                    </button>
                  )}
                  {order.status !== "cancelled" && order.status !== "delivered" && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, "cancelled")}
                      className="rounded-md border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {pagination.pages > 1 && (
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
          )}
        </div>
      )}
    </DashboardShell>
  );
}
