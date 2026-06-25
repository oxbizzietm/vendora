import { Link } from "react-router-dom";
import { resolveAssetUrl } from "../lib/api";

export default function CategoryCard({ category }) {
  return (
    <Link
      to={`/shop?category=${category.id}`}
      className="group relative block overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
    >
      <div className="aspect-[5/4] overflow-hidden bg-slate-100">
        <img
          src={resolveAssetUrl(category.image)}
          alt={category.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950 via-navy-950/75 to-transparent p-4 text-white">
        <h3 className="text-base font-black">{category.name}</h3>
        <p className="text-sm text-emerald-100">{category.count}</p>
      </div>
    </Link>
  );
}
