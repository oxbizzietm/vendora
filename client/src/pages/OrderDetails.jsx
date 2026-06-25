import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import { formatCurrency } from "../data/mockData";
import api, { resolveAssetUrl } from "../lib/api";

const statusColors = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-slate-100 text-slate-800",
};

export default function OrderDetails() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async function loadOrder() {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.order);
      setError("");
    } catch {
      setError("Order not found.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    loadOrder();
  }, [isAuthenticated, loadOrder]);

  async function handleMockPayment() {
    setPaying(true);

    try {
      await api.post(`/orders/${id}/pay`);
      toast.success("Mock payment completed.");
      await loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not complete mock payment.");
    } finally {
      setPaying(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-black text-navy-950">Order Details</h1>
        <div className="mt-8 rounded-md border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-500">Login to view order details.</p>
          <Link to="/login" className="mt-4 inline-block rounded-md bg-emerald-500 px-6 py-3 text-sm font-black text-white">
            Login
          </Link>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-slate-500">Loading order details...</p>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/orders" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
          Back to orders
        </Link>
        <p className="mt-6 text-sm font-semibold text-slate-500">{error || "Order not found."}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/orders" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
        Back to orders
      </Link>

      <div className="mt-6 rounded-md bg-navy-950 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-emerald-300">Order</p>
            <h1 className="mt-2 text-3xl font-black">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-slate-300">
              Placed on{" "}
              {new Date(order.placedAt).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <span className={`rounded-full px-4 py-2 text-sm font-bold ${statusColors[order.status] || "bg-slate-100 text-slate-800"}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-navy-950">Items</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex gap-3 rounded-md bg-slate-50 p-3">
                  <img src={resolveAssetUrl(item.image)} alt={item.productName} className="h-16 w-16 rounded-md object-cover" />
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-navy-950">{item.productName}</p>
                      <p className="text-xs text-slate-500">
                        Qty: {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                      {item.productId ? (
                        <Link to={`/products/${item.productId}`} className="mt-1 inline-block text-xs font-bold text-emerald-700">
                          Review product
                        </Link>
                      ) : null}
                    </div>
                    <p className="text-sm font-bold text-navy-950">{formatCurrency(item.lineTotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-navy-950">Order Timeline</h2>
            <div className="mt-4 space-y-3">
              {order.timeline?.length ? (
                order.timeline.map((event) => (
                  <div key={event.id} className="rounded-md bg-slate-50 p-3">
                    <p className="text-sm font-black text-navy-950">{event.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {new Date(event.createdAt).toLocaleString("en-NG")}
                    </p>
                    {event.note ? <p className="mt-2 text-sm text-slate-600">{event.note}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-slate-500">No timeline updates yet.</p>
              )}
            </div>
          </div>

          {order.shippingAddress && (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-navy-950">Shipping Address</h2>
              <div className="mt-4 text-sm text-slate-600">
                <p className="font-bold text-navy-950">{order.shippingAddress.recipientName}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.phone && <p>{order.shippingAddress.phone}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-navy-950">Summary</h2>
            <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
            {order.discountTotal > 0 ? <SummaryRow label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`-${formatCurrency(order.discountTotal)}`} /> : null}
            <SummaryRow label="Shipping" value={order.shippingTotal === 0 ? "Free" : formatCurrency(order.shippingTotal)} />
            <SummaryRow label="Tax" value={formatCurrency(order.taxTotal)} />
            <div className="mt-4 border-t border-slate-200 pt-4">
              <SummaryRow label="Total" value={formatCurrency(order.grandTotal)} strong />
            </div>
          </aside>

          {order.payment && (
            <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-navy-950">Payment</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Method</span>
                  <span className="font-bold text-navy-950">Mock Payment</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className={`font-bold ${order.payment.status === "successful" ? "text-emerald-600" : "text-amber-600"}`}>
                    {order.payment.status.charAt(0).toUpperCase() + order.payment.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Amount</span>
                  <span className="font-bold text-navy-950">{formatCurrency(order.payment.amount)}</span>
                </div>
              </div>
              {order.payment.status !== "successful" && order.status !== "cancelled" ? (
                <button
                  type="button"
                  onClick={handleMockPayment}
                  disabled={paying}
                  className="mt-5 h-11 w-full rounded-md bg-emerald-500 text-sm font-black text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {paying ? "Confirming..." : "Complete Mock Payment"}
                </button>
              ) : null}
            </aside>
          )}
        </div>
      </div>
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
