import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "../data/mockData";
import api from "../lib/api";
import { DashboardShell, StatCard } from "./SellerDashboard";

const tabs = ["Overview", "Users", "Sellers", "Orders", "Categories"];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAdminData() {
    setLoading(true);

    try {
      const [summaryRes, usersRes, sellersRes, ordersRes, categoriesRes] = await Promise.all([
        api.get("/admin/summary"),
        api.get("/admin/users", { params: { limit: 20 } }),
        api.get("/admin/sellers"),
        api.get("/admin/orders", { params: { limit: 20 } }),
        api.get("/admin/categories"),
      ]);

      setSummary(summaryRes.data);
      setUsers(usersRes.data.users || []);
      setSellers(sellersRes.data.sellers || []);
      setOrders(ordersRes.data.orders || []);
      setCategories(categoriesRes.data.categories || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  async function handleUserStatus(user, isActive) {
    try {
      await api.put(`/admin/users/${user.id}/status`, { isActive });
      toast.success(isActive ? "User activated." : "User suspended.");
      await loadAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update user.");
    }
  }

  async function handleSellerStatus(seller, status) {
    try {
      await api.put(`/admin/sellers/${seller.id}/status`, { status });
      toast.success(`Seller ${status}.`);
      await loadAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update seller.");
    }
  }

  const stats = summary?.stats;

  return (
    <DashboardShell label="Admin Dashboard" title="Marketplace control center">
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-2 text-sm font-black ${
              activeTab === tab ? "bg-emerald-500 text-white" : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm font-semibold text-slate-500">Loading admin data...</p> : null}
      {!loading && error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

      {!loading && !error && activeTab === "Overview" && stats ? (
        <>
          <div className="grid gap-5 md:grid-cols-4">
            <StatCard title="Gross volume" value={formatCurrency(stats.grossVolume)} note="Across all sellers" />
            <StatCard title="Active users" value={String(stats.users)} note={`${stats.customers} customers, ${stats.sellers} sellers`} />
            <StatCard title="Pending sellers" value={String(stats.pendingSellers)} note="Approval queue" />
            <StatCard title="Products" value={String(stats.products)} note={`${stats.outOfStockProducts} out of stock`} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-navy-950">Revenue Reports</h2>
              <div className="mt-5 grid h-56 grid-cols-7 items-end gap-3">
                {(summary.revenue || []).map((point) => {
                  const max = Math.max(...(summary.revenue || []).map((item) => item.revenue), 1);
                  const height = Math.max((point.revenue / max) * 100, point.revenue > 0 ? 12 : 4);

                  return (
                    <div key={point.day} className="flex h-full flex-col justify-end gap-2">
                      <div className="rounded-t-md bg-navy-950" style={{ height: `${height}%` }} title={formatCurrency(point.revenue)} />
                      <span className="truncate text-center text-[11px] font-bold text-slate-500">
                        {new Date(point.day).toLocaleDateString("en-NG", { weekday: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <Panel title="Recent Orders">
              {summary.recentOrders.map((order) => (
                <Row key={order.id} left={order.orderNumber} middle={order.customerName} right={formatCurrency(order.grandTotal)} />
              ))}
            </Panel>
          </div>
        </>
      ) : null}

      {!loading && !error && activeTab === "Users" ? (
        <Panel title="Manage Users">
          {users.map((user) => (
            <div key={user.id} className="grid gap-3 border-b border-slate-200 p-4 text-sm last:border-0 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="font-black text-navy-950">{user.name}</p>
                <p className="text-slate-500">{user.email} - {user.role}</p>
              </div>
              <span className={`font-bold ${user.isActive ? "text-emerald-700" : "text-red-600"}`}>
                {user.isActive ? "Active" : "Suspended"}
              </span>
              <button
                type="button"
                onClick={() => handleUserStatus(user, !user.isActive)}
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-navy-950 hover:border-emerald-300"
              >
                {user.isActive ? "Suspend" : "Activate"}
              </button>
            </div>
          ))}
        </Panel>
      ) : null}

      {!loading && !error && activeTab === "Sellers" ? (
        <Panel title="Manage Sellers">
          {sellers.map((seller) => (
            <div key={seller.id} className="grid gap-3 border-b border-slate-200 p-4 text-sm last:border-0 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="font-black text-navy-950">{seller.storeName}</p>
                <p className="text-slate-500">{seller.ownerName} - {seller.productCount} products</p>
              </div>
              <span className="font-bold text-slate-700">{seller.status}</span>
              <div className="flex flex-wrap gap-2">
                <ActionButton label="Approve" onClick={() => handleSellerStatus(seller, "approved")} />
                <ActionButton label="Suspend" onClick={() => handleSellerStatus(seller, "suspended")} />
              </div>
            </div>
          ))}
        </Panel>
      ) : null}

      {!loading && !error && activeTab === "Orders" ? (
        <Panel title="Manage Orders">
          {orders.map((order) => (
            <Row key={order.id} left={order.orderNumber} middle={`${order.customerName} - ${order.status}`} right={formatCurrency(order.grandTotal)} />
          ))}
        </Panel>
      ) : null}

      {!loading && !error && activeTab === "Categories" ? (
        <Panel title="Manage Categories">
          {categories.map((category) => (
            <Row key={category.id} left={category.name} middle={category.slug} right={`${category.productCount} products`} />
          ))}
        </Panel>
      ) : null}
    </DashboardShell>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-navy-950">{title}</h2>
      <div className="mt-4 overflow-hidden rounded-md border border-slate-200">{children}</div>
    </div>
  );
}

function Row({ left, middle, right }) {
  return (
    <div className="grid gap-2 border-b border-slate-200 p-4 text-sm last:border-0 md:grid-cols-[1fr_1fr_auto] md:items-center">
      <p className="font-black text-navy-950">{left}</p>
      <p className="font-semibold text-slate-500">{middle}</p>
      <p className="font-black text-emerald-700">{right}</p>
    </div>
  );
}

function ActionButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-navy-950 hover:border-emerald-300"
    >
      {label}
    </button>
  );
}
