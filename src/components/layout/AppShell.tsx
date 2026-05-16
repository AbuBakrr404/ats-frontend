import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function AppShell() {
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-pt-border flex flex-col">
        <div className="p-6 border-b border-pt-border flex items-center gap-3">
          <img src="/pro_talent_logo.png" alt="Pro Talent" className="w-10 h-10" />
          <div>
            <div className="font-bold text-pt-text">Pro Talent</div>
            <div className="text-xs text-pt-muted">ATS</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarLink to="/" label="Dashboard" end />
          <SidebarLink to="/search" label="AI Search" />
          <SidebarLink to="/candidates" label="Candidates" />
          <SidebarLink to="/jobs" label="Jobs" />
          <SidebarLink to="/pipeline" label="Pipeline" />
        </nav>

        <div className="p-4 border-t border-pt-border">
          <button onClick={signOut} className="text-sm text-pt-muted hover:text-pt-red w-full text-left">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-md text-sm font-medium ${
          isActive
            ? "bg-pt-red text-white"
            : "text-pt-text hover:bg-gray-100"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
