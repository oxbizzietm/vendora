import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Icon } from "./Icons";

export default function SearchBar({ compact = false }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!query.trim()) {
      toast.error("Enter a product, brand, or seller to search.");
      return;
    }

    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ring-1 ring-transparent transition focus-within:border-emerald-500 focus-within:ring-emerald-100 ${
        compact ? "h-11" : "h-12"
      }`}
    >
      <div className="pl-4 text-slate-400">
        <Icon name="search" className="h-5 w-5" />
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-full min-w-0 flex-1 border-0 px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        placeholder="Search phones, fashion, beauty, groceries..."
        type="search"
      />
      <button
        type="submit"
        className="h-full bg-emerald-500 px-5 text-sm font-bold text-white transition hover:bg-emerald-600"
      >
        Search
      </button>
    </form>
  );
}
