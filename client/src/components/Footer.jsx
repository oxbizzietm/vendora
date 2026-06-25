import { Link } from "react-router-dom";

const footerSections = [
  {
    title: "Shop",
    links: ["Phones", "Fashion", "Groceries", "Beauty"],
  },
  {
    title: "Vendora",
    links: ["About", "Seller center", "Delivery", "Payments"],
  },
  {
    title: "Support",
    links: ["Help center", "Returns", "Track order", "Contact"],
  },
];

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <Link to="/" className="text-3xl font-black">
            Vendora<span className="text-emerald-400">.</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
            A modern marketplace for buyers, sellers, and teams who need clear deals, reliable stores, and fast checkout.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-black uppercase tracking-wide text-emerald-300">{section.title}</h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link}>
                    <Link to="/shop" className="text-sm text-slate-300 hover:text-white">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-sm text-slate-400">
        (c) 2026 Vendora. Built for premium marketplace commerce.
      </div>
    </footer>
  );
}
