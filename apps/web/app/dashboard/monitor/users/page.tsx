"use client";

import { useState } from "react";
import {
  Search,
  User as UserIcon,
  MoreHorizontal,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useUsers } from "@/lib/convex-client";

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Get users from Convex
  const users = useUsers();

  // Loading state
  if (users === undefined) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#09090b] text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-zinc-400">Loading users...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (users === null || users.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#09090b] text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-medium">No users yet</p>
          <p className="text-sm text-zinc-400">
            Users will appear here when they interact with your bot
          </p>
        </div>
      </div>
    );
  }

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) =>
      user.identifier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-full w-full flex-col bg-[#09090b] text-zinc-100 p-8 space-y-8 overflow-y-auto">
      {/* --- HEADER --- */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        {/* Bisa tambah deskripsi kalau mau */}
      </div>

      {/* --- TOOLBAR (Filter & Search) --- */}
      <div className="flex items-center gap-4">
        {/* Tombol Filters */}
        <Button
          variant="outline"
          className="h-10 border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2 px-4"
        >
          Filters
          <ArrowUpDown className="h-3.5 w-3.5 opacity-70" />
        </Button>

        {/* Search Input */}
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by identifier or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-blue-600 focus-visible:border-blue-600"
          />
        </div>
      </div>

      {/* --- USERS TABLE --- */}
      <div className="rounded-lg border border-zinc-800 bg-[#0c0c0e] overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 border-b border-zinc-800 bg-zinc-900/50 px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
          <div className="col-span-5">User Identifier</div>
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Last Modified</div>
        </div>

        {/* Table Body */}
        {filteredUsers.length > 0 ? (
          <div className="divide-y divide-zinc-800/50">
            {filteredUsers.map((user) => (
              <div
                key={user._id}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-900/40 transition-colors group"
              >
                {/* Column 1: Identifier */}
                <div className="col-span-5 flex items-center gap-3 overflow-hidden">
                  {/* Avatar Box */}
                  <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 border border-white/5 bg-blue-600">
                    <span className="text-xs font-bold text-white">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>

                  {/* Icon + ID Text */}
                  <div className="flex items-center gap-2 min-w-0">
                    <UserIcon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="text-sm font-mono text-zinc-400 truncate underline decoration-zinc-800 underline-offset-4 decoration-dashed hover:text-zinc-200 hover:decoration-zinc-500 cursor-pointer transition-all">
                      {user.identifier}
                    </span>
                  </div>
                </div>

                {/* Column 2: Name */}
                <div className="col-span-3">
                  <span className="text-sm text-zinc-400 font-medium">
                    {user.name || "Unknown User"}
                  </span>
                </div>

                {/* Column 3: Tags / Status */}
                <div className="col-span-2 flex items-center gap-2">
                  {user.is_active ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-green-400 font-medium">
                        Active
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-zinc-600"></div>
                      <span className="text-xs text-zinc-500 font-medium">
                        Inactive
                      </span>
                    </>
                  )}
                </div>

                {/* Column 4: Last Active */}
                <div className="col-span-2 flex items-center justify-end gap-4">
                  <span className="text-sm text-zinc-500">
                    {user.last_active_at
                      ? new Date(user.last_active_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "Never"}
                  </span>

                  {/* Action Menu (Hidden by default, show on hover) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-zinc-900 border-zinc-800 text-zinc-200"
                    >
                      <DropdownMenuItem className="focus:bg-zinc-800 cursor-pointer">
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="focus:bg-zinc-800 cursor-pointer text-red-400 focus:text-red-400">
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* --- EMPTY STATE (Kalo data kosong / hasil search ga ketemu) --- */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
              <UserIcon className="h-8 w-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-zinc-200">
              No users found
            </h3>
            <p className="text-sm text-zinc-500 mt-2 max-w-sm">
              We could not fin users matching your criteria. Try adjusting your
              filters or wait for new interactions.
            </p>
            {searchQuery && (
              <Button
                variant="link"
                className="mt-4 text-blue-400 hover:text-blue-300"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Footer Info (Opsional, biar makin mirip dashboard pro) */}
      <div className="text-xs text-zinc-600 px-1">
        Showing {filteredUsers.length} users
      </div>
    </div>
  );
}
