import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Utensils,
  ClipboardList,
  History,
  LogOut,
} from "lucide-react";

const AdminSidebar = () => {
  const location = useLocation();
  const active = (path) =>
    location.pathname === path ? "bg-yellow-200 text-black" : "";

  return (
    <div className="h-screen w-64 bg-black text-white flex flex-col shadow-lg">
      <div className="text-2xl font-bold text-yellow-400 p-6 border-b border-gray-700">
        Admin Panel
      </div>
      <nav className="flex flex-col p-4 gap-2">
        <Link
          to="/admin/dashboard"
          className={`flex items-center gap-3 p-3 rounded-md hover:bg-yellow-100 hover:text-black transition ${active("/admin/dashboard")}`}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link
          to="/admin/orders"
          className={`flex items-center gap-3 p-3 rounded-md hover:bg-yellow-100 hover:text-black transition ${active("/admin/orders")}`}
        >
          <ClipboardList size={20} />
          Orders
        </Link>

        <Link
          to="/admin/menu"
          className={`flex items-center gap-3 p-3 rounded-md hover:bg-yellow-100 hover:text-black transition ${active("/admin/menu")}`}
        >
          <Utensils size={20} />
          Menu
        </Link>

        <Link
          to="/admin/history"
          className={`flex items-center gap-3 p-3 rounded-md hover:bg-yellow-100 hover:text-black transition ${active("/admin/history")}`}
        >
          <History size={20} />
          Order History
        </Link>

        <Link
          to="/admin/logout"
          className="flex items-center gap-3 p-3 rounded-md hover:bg-red-400 hover:text-white transition mt-auto"
        >
          <LogOut size={20} />
          Logout
        </Link>
      </nav>
    </div>
  );
};

export default AdminSidebar;
