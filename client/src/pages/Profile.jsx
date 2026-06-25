import useAuth from "../hooks/useAuth";

export default function Profile() {
  const { user } = useAuth();

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-md bg-navy-950 p-6 text-white">
        <p className="text-sm font-black uppercase tracking-wide text-emerald-300">Profile</p>
        <h1 className="mt-2 text-4xl font-black">{user?.name || "Loading account..."}</h1>
        <p className="mt-2 text-slate-300">{user?.email}</p>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {[
          ["Orders", "Track purchases, returns, and delivery updates."],
          ["Wishlist", "Review saved products before flash deals end."],
          ["Account role", user ? `Current role: ${user.role}` : "Checking your account role."],
        ].map(([title, text]) => (
          <article key={title} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-navy-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
