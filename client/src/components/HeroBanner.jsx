import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SearchBar from "./SearchBar";

export default function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-navy-950 text-white">
      <img
        src="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1800&q=85"
        alt="Vendora marketplace shoppers browsing premium products"
        className="absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-900/40" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <span className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-400/15 px-4 py-2 text-sm font-bold text-emerald-100">
            Trusted deals from verified Nigerian sellers
          </span>
          <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
            Shop smarter across every market, every day.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
            Discover phones, fashion, beauty, groceries, and home essentials from top-rated sellers with fast checkout and clear pricing.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchBar />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="rounded-md bg-emerald-500 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-400"
            >
              Start Shopping
            </Link>
            <Link
              to="/seller"
              className="rounded-md border border-white/30 px-6 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              Sell on Vendora
            </Link>
          </div>
        </motion.div>
        <div className="hidden items-end justify-end lg:flex">
          <div className="w-full max-w-md rounded-md border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="rounded-md bg-white p-4 text-slate-900 shadow-2xl">
              <p className="text-sm font-bold text-emerald-600">Today on Vendora</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {["Flash deals", "Verified sellers", "Secure checkout", "Fast dispatch"].map((item) => (
                  <div key={item} className="rounded-md bg-slate-50 p-4 text-sm font-bold text-navy-950">
                    {item}
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-md bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                Save up to 35% on selected marketplace picks before midnight.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
