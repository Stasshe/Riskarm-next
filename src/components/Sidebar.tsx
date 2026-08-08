"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { FaBars, FaCog, FaListAlt, FaSignOutAlt, FaTrash, FaUser } from "react-icons/fa";

import { useAuth } from "@/lib/auth";

const SIDEBAR_STORAGE_KEY = "isSidebarOpen";

interface NavItemProps {
  href: string;
  icon: IconType;
  label: string;
  isOpen: boolean;
  isActive: boolean;
}

function NavItem({ href, icon: Icon, label, isOpen, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center py-2 transition-colors duration-200 hover:bg-primary-light ${
        isOpen ? "justify-start px-4" : "justify-center px-0"
      } ${isActive ? "bg-primary-light text-accent-color" : "text-light-text"}`}
    >
      <div className={isOpen ? "" : "mx-auto"}>
        <Icon size="1.25em" />
      </div>
      {isOpen && (
        <span className="ml-3 overflow-hidden text-sm font-medium whitespace-nowrap">{label}</span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const { user, isAdmin, signOutUser } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) {
      setIsOpen(JSON.parse(saved) as boolean);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(isOpen));
  }, [isOpen, hydrated]);

  const isActive = (href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);

  const widthClass = isOpen ? "w-48" : "w-16";

  const handleLogout = (): void => {
    void signOutUser();
  };

  return (
    <div className={`${widthClass} shrink-0 transition-all duration-300`}>
      <aside
        className={`${widthClass} fixed z-50 flex min-h-screen flex-col bg-dark-bg text-light-text transition-all duration-300`}
      >
        <div className={`flex items-center p-4 ${isOpen ? "justify-between" : "justify-center"}`}>
          {isOpen && <h1 className="text-2xl font-bold">Riskarm</h1>}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded p-2 text-medium-text hover:bg-primary-light"
          >
            <FaBars size="1.25em" />
          </button>
        </div>
        <nav className="mt-8 flex-1">
          <NavItem
            href="/domains"
            icon={FaListAlt}
            label="ドメイン一覧"
            isOpen={isOpen}
            isActive={isActive("/domains")}
          />
          <NavItem
            href="/findings"
            icon={FaListAlt}
            label="Finding一覧"
            isOpen={isOpen}
            isActive={isActive("/findings")}
          />
          <NavItem
            href="/templates"
            icon={FaListAlt}
            label="テンプレート一覧"
            isOpen={isOpen}
            isActive={isActive("/templates")}
          />
          {user && (
            <>
              <NavItem
                href={`/user/${user.uid}/findings`}
                icon={FaUser}
                label="担当Finding一覧"
                isOpen={isOpen}
                isActive={isActive(`/user/${user.uid}/findings`)}
              />
              <NavItem
                href={`/user/${user.uid}/reviews`}
                icon={FaUser}
                label="レビュー待ち一覧"
                isOpen={isOpen}
                isActive={isActive(`/user/${user.uid}/reviews`)}
              />
            </>
          )}
          {isAdmin && (
            <>
              <NavItem
                href="/admin/users"
                icon={FaUser}
                label="ユーザー一覧"
                isOpen={isOpen}
                isActive={isActive("/admin/users")}
              />
              <NavItem
                href="/admin/settings"
                icon={FaCog}
                label="設定"
                isOpen={isOpen}
                isActive={isActive("/admin/settings")}
              />
              <NavItem
                href="/admin/deleted-items"
                icon={FaTrash}
                label="削除済みアイテム"
                isOpen={isOpen}
                isActive={isActive("/admin/deleted-items")}
              />
            </>
          )}
        </nav>
        <div className="p-4">
          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full items-center py-2 text-left transition-colors duration-200 hover:bg-primary-light ${
              isOpen ? "justify-start px-4" : "justify-center px-0"
            }`}
          >
            <div className={isOpen ? "" : "mx-auto"}>
              <FaSignOutAlt size="1.25em" />
            </div>
            {isOpen && (
              <span className="ml-3 overflow-hidden text-sm font-medium whitespace-nowrap">
                ログアウト
              </span>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
}
