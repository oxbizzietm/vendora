import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-emerald-600">404</p>
        <h1 className="mt-3 text-5xl font-black text-navy-950">This marketplace aisle is closed.</h1>
        <p className="mt-4 text-slate-500">
          The page you requested is unavailable, but thousands of verified Vendora deals are still waiting in the shop.
        </p>
        <Link
          to="/shop"
          className="mt-8 inline-flex rounded-md bg-emerald-500 px-6 py-3 text-sm font-black text-white hover:bg-emerald-600"
        >
          Browse Shop
        </Link>
      </div>
    </section>
  );
}
