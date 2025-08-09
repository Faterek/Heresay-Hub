"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [{ href: "/", label: "Home" }];

  // Add authenticated routes
  if (session?.user) {
    navItems.push({ href: "/quotes", label: "Quotes" });
    navItems.push({ href: "/search", label: "Search" });
    navItems.push({ href: "/ranking", label: "Rankings" });
    navItems.push({ href: "/users", label: "Users" });
    navItems.push({ href: "/submit", label: "Submit Quote" });
  }

  // Check if user has admin privileges
  const hasModeratorAccess =
    session?.user &&
    ["MODERATOR", "ADMIN", "OWNER"].includes(session.user.role);
  const hasAdminAccess =
    session?.user && ["ADMIN", "OWNER"].includes(session.user.role);

  return (
    <nav className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="relative flex h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold">
                <span className="text-[hsl(280,100%,70%)]">Hearsay</span> Hub
              </span>
            </Link>
          </div>

          {/* Navigation Links - Absolutely Centered */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 transform items-center space-x-4 md:flex lg:space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:px-3 ${
                  pathname === item.href
                    ? "bg-white/20 text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Admin Dropdown */}
            {hasModeratorAccess && (
              <AdminDropdown
                hasAdminAccess={!!hasAdminAccess}
                pathname={pathname}
              />
            )}
          </div>

          {/* Auth Section - Right Aligned */}
          <div className="ml-auto flex items-center space-x-4">
            {session?.user ? (
              <div className="flex items-center space-x-3">
                <Link
                  href="/profile"
                  className="group flex items-center space-x-3"
                >
                  {/* Avatar */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600/80 text-sm font-medium text-white transition-colors group-hover:bg-purple-600">
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name ?? "User"}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span>
                        {session.user.name
                          ? session.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : "U"}
                      </span>
                    )}
                  </div>
                  {/* User Info - Hidden on small screens */}
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-medium text-white transition-colors group-hover:text-purple-300">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-gray-400">{session.user.role}</p>
                  </div>
                </Link>
                <Link
                  href="/api/auth/signout"
                  className="rounded-md bg-red-600/80 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-600"
                >
                  Sign Out
                </Link>
              </div>
            ) : (
              <Link
                href="/api/auth/signin"
                className="rounded-md bg-purple-600/80 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-600"
              >
                Sign In
              </Link>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <MobileMenuButton navItems={navItems} />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function AdminDropdown({
  hasAdminAccess,
  pathname,
}: {
  hasAdminAccess: boolean;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const adminItems = [
    { href: "/manage", label: "Manage Speakers", access: "moderator" },
    { href: "/admin", label: "Admin Panel", access: "admin" },
  ];

  const availableItems = adminItems.filter(
    (item) =>
      item.access === "moderator" ||
      (item.access === "admin" && hasAdminAccess),
  );

  const isActive = availableItems.some((item) => pathname === item.href);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center rounded-md px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:px-3 ${
          isActive
            ? "bg-white/20 text-white"
            : "text-gray-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        Manage
        <svg
          className="ml-1 h-4 w-4 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 z-50 mt-2 w-48 rounded-md border border-white/10 bg-gray-900/95 shadow-lg backdrop-blur-sm">
            <div className="py-2">
              {availableItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    pathname === item.href
                      ? "bg-white/20 text-white"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MobileMenuButton({
  navItems,
}: {
  navItems: Array<{ href: string; label: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  // Check admin access for mobile
  const hasModeratorAccess =
    session?.user &&
    ["MODERATOR", "ADMIN", "OWNER"].includes(session.user.role);
  const hasAdminAccess =
    session?.user && ["ADMIN", "OWNER"].includes(session.user.role);

  const adminItems = [
    { href: "/manage", label: "Manage Speakers", access: "moderator" },
    { href: "/admin", label: "Admin Panel", access: "admin" },
  ];

  const availableAdminItems = adminItems.filter(
    (item) =>
      item.access === "moderator" ||
      (item.access === "admin" && hasAdminAccess),
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-md p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full right-0 z-50 mt-2 w-48 rounded-md border border-white/10 bg-gray-900/95 shadow-lg backdrop-blur-sm">
            <div className="py-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    pathname === item.href
                      ? "bg-white/20 text-white"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {/* Admin items for mobile */}
              {hasModeratorAccess && availableAdminItems.length > 0 && (
                <>
                  <div className="my-2 border-t border-white/10"></div>
                  {availableAdminItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        pathname === item.href
                          ? "bg-white/20 text-white"
                          : "text-gray-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </>
              )}

              {/* Profile link for mobile */}
              {session?.user && (
                <>
                  <div className="my-2 border-t border-white/10"></div>
                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-2 text-sm transition-colors ${
                      pathname === "/profile"
                        ? "bg-white/20 text-white"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    My Profile
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
