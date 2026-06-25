import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import { AuthShell, Field } from "./Login";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      await register(form);
      toast.success("Your Vendora account is ready.");
      navigate("/profile");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed. Try again with valid details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Join Vendora to shop premium deals or start selling to marketplace customers.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={(password) => setForm({ ...form, password })}
        />
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Account type</span>
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
            className="mt-2 h-12 w-full rounded-md border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="customer">Customer</option>
            <option value="seller">Seller</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-md bg-emerald-500 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
      <p className="mt-5 text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-emerald-700">
          Login
        </Link>
      </p>
    </AuthShell>
  );
}
