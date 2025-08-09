"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";

interface AdminPanelProps {
  userRole: string;
  currentUserId: string;
}

export function AdminPanel({ userRole, currentUserId }: AdminPanelProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const utils = api.useUtils();

  const { data: users, isLoading: usersLoading } =
    api.admin.getAllUsers.useQuery();
  const { data: stats, isLoading: statsLoading } =
    api.admin.getStats.useQuery();

  const updateUserRole = api.admin.updateUserRole.useMutation({
    onSuccess: () => {
      setSelectedUserId(null);
      setSelectedRole("");
      void utils.admin.getAllUsers.invalidate();
    },
  });

  const handleRoleUpdate = (userId: string, currentRole: string) => {
    setSelectedUserId(userId);
    setSelectedRole(currentRole);
  };

  const handleRoleSubmit = () => {
    if (!selectedUserId || !selectedRole) return;

    updateUserRole.mutate({
      userId: selectedUserId,
      role: selectedRole as "USER" | "MODERATOR" | "ADMIN" | "OWNER",
    });
  };

  const handleRoleCancel = () => {
    setSelectedUserId(null);
    setSelectedRole("");
  };

  return (
    <div className="space-y-8">
      {/* Statistics */}
      <div className="rounded-lg bg-white/10 p-6">
        <h2 className="mb-4 text-xl font-bold">System Statistics</h2>
        {statsLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded bg-white/10" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white/5 p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">
                {stats.userCount}
              </div>
              <div className="text-sm text-gray-400">Total Users</div>
            </div>
            <div className="rounded-lg bg-white/5 p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">
                {stats.quoteCount}
              </div>
              <div className="text-sm text-gray-400">Total Quotes</div>
            </div>
            <div className="rounded-lg bg-white/5 p-4 text-center">
              <div className="text-3xl font-bold text-green-400">
                {stats.speakerCount}
              </div>
              <div className="text-sm text-gray-400">Total Speakers</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Failed to load statistics</p>
        )}
      </div>

      {/* Users Management */}
      <div className="rounded-lg bg-white/10 p-6">
        <h2 className="mb-4 text-xl font-bold">User Management</h2>

        {usersLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-white/10" />
            ))}
          </div>
        ) : !users || users.length === 0 ? (
          <p className="py-8 text-center text-gray-400">No users found.</p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg bg-white/5 p-4"
              >
                <div className="flex items-center gap-4">
                  {user.image && (
                    <Image
                      src={user.image}
                      alt={user.name ?? "User"}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">
                      {user.name ?? "Unknown User"}
                    </h3>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {selectedUserId === user.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="rounded border border-white/20 bg-white/10 px-3 py-1 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="USER" className="bg-gray-800">
                          User
                        </option>
                        <option value="MODERATOR" className="bg-gray-800">
                          Moderator
                        </option>
                        <option value="ADMIN" className="bg-gray-800">
                          Admin
                        </option>
                        {userRole === "OWNER" && user.role !== "OWNER" && (
                          <option value="OWNER" className="bg-gray-800">
                            Owner
                          </option>
                        )}
                      </select>
                      <button
                        onClick={handleRoleSubmit}
                        disabled={updateUserRole.isPending}
                        className="rounded bg-green-600 px-3 py-1 text-sm transition-colors hover:bg-green-700 disabled:bg-gray-600"
                      >
                        {updateUserRole.isPending ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={handleRoleCancel}
                        className="rounded bg-gray-600 px-3 py-1 text-sm transition-colors hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          user.role === "OWNER"
                            ? "bg-red-600/20 text-red-300"
                            : user.role === "ADMIN"
                              ? "bg-orange-600/20 text-orange-300"
                              : user.role === "MODERATOR"
                                ? "bg-blue-600/20 text-blue-300"
                                : "bg-gray-600/20 text-gray-300"
                        }`}
                      >
                        {user.role}
                      </span>
                      {/* Disable role change for OWNER users and current user */}
                      {user.role !== "OWNER" && user.id !== currentUserId ? (
                        <button
                          onClick={() =>
                            handleRoleUpdate(user.id, user.role ?? "USER")
                          }
                          className="rounded bg-purple-600 px-3 py-1 text-sm transition-colors hover:bg-purple-700"
                        >
                          Change Role
                        </button>
                      ) : (
                        <span className="rounded bg-gray-600/50 px-3 py-1 text-sm text-gray-400">
                          {user.role === "OWNER"
                            ? "Owner (Protected)"
                            : "You (Cannot change own role)"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {updateUserRole.error && (
          <div className="mt-3 rounded-lg border border-red-600/50 bg-red-600/20 p-3">
            <p className="text-sm text-red-300">
              Error: {updateUserRole.error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
