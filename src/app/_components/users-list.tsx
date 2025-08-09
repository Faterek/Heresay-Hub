"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "~/trpc/react";

export function UsersList() {
  const [currentPage, setCurrentPage] = useState(1);

  const { data: users, isLoading } = api.user.getAll.useQuery({
    page: currentPage,
    limit: 20,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-gray-400">No users found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Users Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {users.map((user) => (
          <Link
            key={user.id}
            href={`/profile/${user.id}`}
            className="group rounded-lg border border-white/10 bg-white/5 p-6 transition-all hover:border-purple-500/30 hover:bg-white/10"
          >
            {/* User Avatar */}
            <div className="mb-4 flex justify-center">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "User"}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full border-2 border-purple-500/30 transition-all group-hover:border-purple-500/50"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600/30 text-xl font-bold transition-all group-hover:bg-purple-600/50">
                  {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="text-center">
              <h3 className="font-semibold text-white group-hover:text-purple-300">
                {user.name ?? "Anonymous User"}
              </h3>

              <div className="mt-2 flex items-center justify-center space-x-2">
                <span className="rounded-full bg-purple-600/20 px-2 py-1 text-xs font-medium text-purple-300">
                  {user.role}
                </span>
              </div>

              {/* User Stats */}
              <div className="mt-4">
                <div className="text-lg font-bold text-purple-400">
                  {user.quotesCount}
                </div>
                <div className="text-xs text-gray-400">
                  Quote{user.quotesCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Load More Button */}
      {users.length === 20 && (
        <div className="flex justify-center">
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            className="rounded-md bg-purple-600/80 px-6 py-2 text-sm font-medium transition-colors hover:bg-purple-600"
          >
            Load More Users
          </button>
        </div>
      )}
    </div>
  );
}
