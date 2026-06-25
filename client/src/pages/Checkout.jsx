import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import { formatCurrency } from "../data/mockData";
import api, { resolveAssetUrl } from "../lib/api";

export default function Checkout() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ subtotal: 0, itemCount: 0 });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    recipientName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    label: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountTotal, setDiscountTotal] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
      return;
    }

    try {
      const [cartRes, addrRes] = await Promise.all([
        api.get("/cart"),
        api.get("/addresses"),
      ]);

      if (!cartRes.data.items || cartRes.data.items.length === 0) {
        navigate("/cart");
        toast.error("Your cart is empty.");
        return;
      }

      setItems(cartRes.data.items);
      setSummary(cartRes.data.summary);
      setAddresses(addrRes.data.addresses || []);

      const defaultAddr = (addrRes.data.addresses || []).find((a) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else if (addrRes.data.addresses?.length > 0) {
        setSelectedAddressId(addrRes.data.addresses[0].id);
      }
    } catch {
      setError("Unable to load checkout data.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddAddress(event) {
    event.preventDefault();

    try {
      const { data } = await api.post("/addresses", {
        ...addressForm,
        isDefault: addresses.length === 0,
      });
      setSelectedAddressId(data.address.id);
      setShowAddressForm(false);
      setAddressForm({ recipientName: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", label: "" });

      const addrRes = await api.get("/addresses");
      setAddresses(addrRes.data.addresses || []);
      toast.success("Address added.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add address.");
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) {
      toast.error("Please select a shipping address.");
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await api.post("/orders", {
        shippingAddressId: selectedAddressId,
        couponCode,
      });

      toast.success("Order placed successfully!");
      navigate(`/orders/${data.order.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not place order.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) {
      setDiscountTotal(0);
      setCouponMessage("");
      return;
    }

    try {
      const { data } = await api.post("/orders/coupon", {
        code: couponCode,
        subtotal: summary.subtotal,
      });
      setDiscountTotal(data.discountTotal || 0);
      setCouponMessage(`${data.coupon?.code || couponCode.toUpperCase()} applied.`);
      toast.success("Coupon applied.");
    } catch (err) {
      setDiscountTotal(0);
      setCouponMessage("");
      toast.error(err.response?.data?.message || "Coupon could not be applied.");
    }
  }

  const discountedSubtotal = Math.max(summary.subtotal - discountTotal, 0);
  const delivery = discountedSubtotal >= 50000 ? 0 : 6500;
  const tax = Number((discountedSubtotal * 0.075).toFixed(2));
  const total = discountedSubtotal + delivery + tax;

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-slate-500">Loading checkout...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-slate-500">{error}</p>
        <Link to="/cart" className="mt-4 inline-block text-sm font-bold text-emerald-700">
          Back to cart
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/cart" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
        Back to cart
      </Link>
      <h1 className="mt-4 text-4xl font-black text-navy-950">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Shipping Address */}
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-navy-950">Shipping Address</h2>

            {addresses.length > 0 && !showAddressForm ? (
              <div className="mt-4 space-y-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 ${
                      Number(selectedAddressId) === Number(addr.id)
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={Number(selectedAddressId) === Number(addr.id)}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-bold text-navy-950">
                        {addr.recipientName}
                        {addr.label ? <span className="ml-2 text-xs text-slate-400">({addr.label})</span> : null}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {addr.addressLine1}
                        {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                      </p>
                      <p className="text-sm text-slate-600">
                        {addr.city}, {addr.state} {addr.postalCode}
                      </p>
                      {addr.phone ? <p className="text-sm text-slate-600">{addr.phone}</p> : null}
                    </div>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAddressForm(true)}
                  className="mt-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
                >
                  + Add new address
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddAddress} className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <input
                    placeholder="Label (e.g. Home, Office)"
                    value={addressForm.label}
                    onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                    className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <InputField
                  placeholder="Recipient name *"
                  value={addressForm.recipientName}
                  onChange={(v) => setAddressForm({ ...addressForm, recipientName: v })}
                />
                <InputField
                  placeholder="Phone"
                  value={addressForm.phone}
                  onChange={(v) => setAddressForm({ ...addressForm, phone: v })}
                />
                <div className="sm:col-span-2">
                  <InputField
                    placeholder="Address line 1 *"
                    value={addressForm.addressLine1}
                    onChange={(v) => setAddressForm({ ...addressForm, addressLine1: v })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <InputField
                    placeholder="Address line 2 (optional)"
                    value={addressForm.addressLine2}
                    onChange={(v) => setAddressForm({ ...addressForm, addressLine2: v })}
                  />
                </div>
                <InputField
                  placeholder="City *"
                  value={addressForm.city}
                  onChange={(v) => setAddressForm({ ...addressForm, city: v })}
                />
                <InputField
                  placeholder="State *"
                  value={addressForm.state}
                  onChange={(v) => setAddressForm({ ...addressForm, state: v })}
                />
                <InputField
                  placeholder="Postal code"
                  value={addressForm.postalCode}
                  onChange={(v) => setAddressForm({ ...addressForm, postalCode: v })}
                />
                <div className="flex gap-3 sm:col-span-2">
                  <button
                    type="submit"
                    className="h-11 flex-1 rounded-md bg-emerald-500 text-sm font-black text-white hover:bg-emerald-600"
                  >
                    Save Address
                  </button>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="h-11 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Order Items */}
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-navy-950">Items ({items.length})</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.itemId} className="flex gap-3 rounded-md bg-slate-50 p-3">
                  <img src={resolveAssetUrl(item.image)} alt={item.name} className="h-16 w-16 rounded-md object-cover" />
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-navy-950">{item.name}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-navy-950">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <aside className="h-fit rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-navy-950">Order Summary</h2>
          <CheckoutRow label="Subtotal" value={formatCurrency(summary.subtotal)} />
          <div className="mt-4">
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="rounded-md border border-slate-200 px-3 text-xs font-black text-navy-950 hover:border-emerald-300 hover:text-emerald-700"
              >
                Apply
              </button>
            </div>
            {couponMessage ? <p className="mt-2 text-xs font-bold text-emerald-700">{couponMessage}</p> : null}
          </div>
          {discountTotal > 0 ? <CheckoutRow label="Discount" value={`-${formatCurrency(discountTotal)}`} /> : null}
          <CheckoutRow label="Delivery" value={delivery === 0 ? "Free" : formatCurrency(delivery)} />
          <CheckoutRow label="Tax (7.5%)" value={formatCurrency(tax)} />
          <div className="mt-4 border-t border-slate-200 pt-4">
            <CheckoutRow label="Total" value={formatCurrency(total)} strong />
          </div>

          {/* Payment Info */}
          <div className="mt-4 rounded-md bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Payment</p>
            <p className="mt-1 text-sm font-bold text-navy-950">Pay on Delivery</p>
            <p className="mt-1 text-xs text-slate-400">No real payment will be processed. Mock payment only.</p>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={submitting || !selectedAddressId}
            className="mt-6 h-12 w-full rounded-md bg-emerald-500 text-sm font-black text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "Placing order..." : `Place Order (${formatCurrency(total)})`}
          </button>
        </aside>
      </div>
    </section>
  );
}

function InputField({ placeholder, value, onChange }) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      required={placeholder.includes("*")}
    />
  );
}

function CheckoutRow({ label, value, strong = false }) {
  return (
    <div className={`mt-4 flex justify-between gap-4 ${strong ? "text-lg font-black" : "text-sm font-semibold"}`}>
      <span className="text-slate-500">{label}</span>
      <span className="text-navy-950">{value}</span>
    </div>
  );
}
