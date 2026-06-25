import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      await login(form);
      toast.success("Welcome back to Vendora.");
      navigate(location.state?.from?.pathname || "/profile", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Access your orders, profile, seller tools, and saved marketplace picks.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={(password) => setForm({ ...form, password })}
        />
        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-md bg-emerald-500 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
      <p className="mt-5 text-sm text-slate-500">
        New to Vendora?{" "}
        <Link to="/register" className="font-bold text-emerald-700">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <section className="mx-auto grid min-h-[70vh] max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
      <div className="hidden overflow-hidden rounded-md bg-navy-950 text-white lg:block">
        <img
          src="https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1200&q=85"
          alt="Marketplace packages prepared for delivery"
          className="h-96 w-full object-cover opacity-70"
        />
        <div className="p-6">
          <p className="text-sm font-bold text-emerald-300">Vendora account</p>
          <h2 className="mt-2 text-3xl font-black">One account for shopping, selling, and managing orders.</h2>
        </div>
      </div>
      <div className="mx-auto w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-navy-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

export function Field({ label, type = "text", value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-md border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        required
      />
    </label>
  );
}
