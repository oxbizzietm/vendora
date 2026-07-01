import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import SearchBar from "./SearchBar";
import { Icon } from "./Icons";
import api from "../lib/api";
import { CART_UPDATED_EVENT } from "../lib/cartEvents";

const baseNavItems = [
  { label: "Categories", href: "/shop" },
  { label: "Flash Sale", href: "/shop?deal=flash" },
];

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const navItems = [
    ...baseNavItems,
    ...(user?.role === "seller" ? [{ label: "Sell", href: "/seller/dashboard" }] : []),
    ...(user?.role === "admin" ? [{ label: "Admin", href: "/admin" }] : []),
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      setCartCount(0);
      setNotifications([]);
      setUnreadNotifications(0);
      return;
    }

    let active = true;

    async function loadCartCount() {
      try {
        const [cartRes, notificationRes] = await Promise.allSettled([
          api.get("/cart"),
          api.get("/notifications"),
        ]);

        if (active) {
          if (cartRes.status === "fulfilled") {
            setCartCount(cartRes.value.data.summary?.itemCount || 0);
          }
          if (notificationRes.status === "fulfilled") {
            setNotifications(notificationRes.value.data.notifications || []);
            setUnreadNotifications(notificationRes.value.data.unreadCount || 0);
          }
        }
      } catch {
        if (active) {
          setCartCount(0);
        }
      }
    }

    loadCartCount();

    function handleCartUpdated(event) {
      const nextCount = event.detail?.itemCount;

      if (typeof nextCount === "number") {
        setCartCount(nextCount);
        return;
      }

      loadCartCount();
    }

    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    const interval = setInterval(loadCartCount, 30000);

    return () => {
      active = false;
      window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  function handleLogout() {
    logout();
    setProfileOpen(false);
    setNotificationsOpen(false);
    setCartCount(0);
    setNotifications([]);
    setUnreadNotifications(0);
  }

  async function handleOpenNotifications() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    setProfileOpen(false);

    if (!nextOpen || !isAuthenticated) {
      return;
    }

    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      setUnreadNotifications(data.unreadCount || 0);
      await api.put("/notifications/read");
      setUnreadNotifications(0);
    } catch {
      setNotifications([]);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="bg-navy-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs font-semibold sm:px-6 lg:px-8">
          <span>Free delivery offers in Lagos, Abuja, and Port Harcourt this week</span>
          {!isAuthenticated && (
            <Link to="/register" className="hidden text-emerald-200 hover:text-white sm:inline">
              Create account
            </Link>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-md border border-slate-200 p-2 text-slate-700 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Icon name="menu" />
          </button>
          <Link to="/" className="text-2xl font-black tracking-tight text-navy-950">
            Vendora<span className="text-emerald-500">.</span>
          </Link>
          <div className="hidden flex-1 lg:block">
            <SearchBar compact />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/shop"
              className="hidden rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 sm:inline-flex"
            >
              Categories
            </Link>
            <IconLink to="/wishlist" label="Wishlist" icon="heart" />
            <IconLink to="/cart" label="Cart" icon="cart" badge={cartCount > 0 ? String(cartCount) : undefined} />
            <div className="relative">
              <button
                type="button"
                onClick={handleOpenNotifications}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                aria-label="Notifications"
                title="Notifications"
              >
                <Icon name="bell" />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1 text-xs font-black text-white">
                    {unreadNotifications}
                  </span>
                ) : null}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-md border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-400">Notifications</p>
                  {isAuthenticated ? (
                    notifications.length ? (
                      notifications.slice(0, 8).map((item) => (
                        <Link
                          key={item.id}
                          to={item.linkUrl || "/profile"}
                          onClick={() => setNotificationsOpen(false)}
                          className="block rounded-md px-3 py-2 hover:bg-emerald-50"
                        >
                          <p className="text-sm font-black text-navy-950">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.message}</p>
                        </Link>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-sm font-semibold text-slate-500">No notifications yet.</p>
                    )
                  ) : (
                    <Link to="/login" className="block rounded-md px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50">
                      Login to view notifications.
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-md bg-navy-950 px-3 py-2 text-sm font-bold text-white"
              >
                <Icon name="user" className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
                <Icon name="chevron" className="hidden h-4 w-4 sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-md border border-slate-200 bg-white p-2 shadow-xl">
                  {isAuthenticated ? (
                    <>
                      <DropdownLink to="/profile" label="My profile" />
                      <DropdownLink to="/orders" label="My Orders" />
                      <DropdownLink to="/wishlist" label="Wishlist" />
                      {user?.role === "seller" && (
                        <>
                          <DropdownLink to="/seller/dashboard" label="Seller dashboard" />
                          <DropdownLink to="/seller/orders" label="Seller orders" />
                        </>
                      )}
                      {user?.role === "admin" && <DropdownLink to="/admin" label="Admin dashboard" />}
                      <DropdownButton onClick={handleLogout} label="Logout" />
                    </>
                  ) : (
                    <>
                      <DropdownLink to="/login" label="Login" />
                      <DropdownLink to="/register" label="Create account" />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 lg:hidden">
          <SearchBar compact />
        </div>
        <nav
          className={`${menuOpen ? "grid" : "hidden"} mt-4 gap-2 border-t border-slate-100 pt-4 lg:flex lg:border-0 lg:pt-0`}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.href}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-bold transition ${
                  isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-navy-950"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function IconLink({ to, label, icon, badge }) {
  return (
    <Link
      to={to}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
      aria-label={label}
      title={label}
    >
      <Icon name={icon} />
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1 text-xs font-black text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function DropdownLink({ to, label }) {
  return (
    <Link to={to} className="block rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">
      {label}
    </Link>
  );
}

function DropdownButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
    >
      {label}
    </button>
  );
}
