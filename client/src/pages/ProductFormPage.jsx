import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { DashboardShell } from "./SellerDashboard";
import api, { resolveAssetUrl } from "../lib/api";

const initialForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  oldPrice: "",
  stock: "",
  sku: "",
  status: "active",
};

export default function ProductFormPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(productId);
  const [form, setForm] = useState(initialForm);
  const [existingImages, setExistingImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!editing) {
        return;
      }

      try {
        const { data } = await api.get(`/products/${productId}`);
        const product = data.product;

        if (active) {
          setForm({
            name: product.name || "",
            description: product.description || "",
            category: product.category || "",
            price: product.price || "",
            oldPrice: product.oldPrice || "",
            stock: product.stock || "",
            sku: product.sku || "",
            status: product.status || "active",
          });
          setExistingImages(product.images || []);
          setError("");
        }
      } catch {
        if (active) {
          setError("Unable to load this product for editing.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [editing, productId]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const body = new FormData();

      body.append("name", form.name);
      body.append("description", form.description);
      body.append("category", form.category);
      body.append("price", form.price);
      body.append("compare_at_price", form.oldPrice);
      body.append("stock_quantity", form.stock);
      body.append("sku", form.sku);
      body.append("status", form.status);

      if (editing) {
        body.append("existingImages", JSON.stringify(existingImages));
      }

      files.forEach((file) => body.append("images", file));

      if (editing) {
        await api.put(`/products/${productId}`, body, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Product updated.");
      } else {
        await api.post("/products", body, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Product added.");
      }

      navigate("/seller/dashboard");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Product could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell label={editing ? "Edit Product" : "Add Product"} title={editing ? "Update product details" : "Create a new listing"}>
      <Link to="/seller/dashboard" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
        Back to products
      </Link>
      <div className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? <p className="text-sm font-semibold text-slate-500">Loading product...</p> : null}
        {!loading && error ? <p className="text-sm font-semibold text-slate-500">{error}</p> : null}
        {!loading && !error ? (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <Field label="Product name" value={form.name} onChange={(value) => updateField("name", value)} />
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                className="mt-2 min-h-32 w-full rounded-md border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                required
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Category" value={form.category} onChange={(value) => updateField("category", value)} />
              <Field label="SKU" value={form.sku} onChange={(value) => updateField("sku", value)} required={false} />
              <Field label="Price" type="number" value={form.price} onChange={(value) => updateField("price", value)} />
              <Field
                label="Compare at price"
                type="number"
                value={form.oldPrice}
                onChange={(value) => updateField("oldPrice", value)}
                required={false}
              />
              <Field label="Stock" type="number" value={form.stock} onChange={(value) => updateField("stock", value)} />
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  className="mt-2 h-12 w-full rounded-md border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
            {existingImages.length ? (
              <div>
                <p className="text-sm font-bold text-slate-700">Current images</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-4">
                  {existingImages.map((image) => (
                    <div key={image} className="overflow-hidden rounded-md border border-slate-200">
                      <img src={resolveAssetUrl(image)} alt={form.name} className="aspect-square w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files || []))}
                className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="h-12 rounded-md bg-emerald-500 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "Saving..." : editing ? "Update Product" : "Add Product"}
            </button>
          </form>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function Field({ label, type = "text", value, onChange, required = true }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-md border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        required={required}
      />
    </label>
  );
}
