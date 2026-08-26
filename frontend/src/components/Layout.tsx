import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/pos", label: "New Sale (POS)", icon: "🧾" },
  { to: "/sales", label: "Sales History", icon: "🧮" },
  { to: "/products", label: "Products", icon: "🥩" },
  { to: "/purchases", label: "Purchases", icon: "📦" },
  { to: "/suppliers", label: "Suppliers", icon: "🚚" },
  { to: "/customers", label: "Customers", icon: "👥" },
  { to: "/expenses", label: "Expenses", icon: "💸" },
  { to: "/users", label: "Users", icon: "🔑", adminOnly: true },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <span className="text-2xl">🥩</span>
          <div>
            <div className="text-sm font-bold leading-tight text-slate-800">Meat Shop</div>
            <div className="text-xs text-slate-400">Business Manager</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== "ADMIN") return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-2 text-sm">
            <div className="font-semibold text-slate-800">{user?.name}</div>
            <div className="text-xs uppercase tracking-wide text-slate-400">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
