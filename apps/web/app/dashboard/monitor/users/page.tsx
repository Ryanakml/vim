"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  User as UserIcon,
  MoreHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

// --- 1. STRUKTUR DATA (Kontrak API) ---
interface UserProfile {
  id: string;
  identifier: string; // ID panjang yang tampil di tabel
  name: string;
  avatarColor: string; // Simulasi warna avatar
  tags: string[];
  lastModified: string;
}

// --- 2. MOCK DATA (Hardcoded buat Preview UI) ---
const MOCK_USERS: UserProfile[] = [
  {
    id: "u1",
    identifier: "user_01KFYJ8WPX4RR360QRXHPFJNT3",
    name: "Unknown User",
    avatarColor: "bg-red-900/50 text-red-500", // Merah tua transparan kayak di gambar
    tags: [],
    lastModified: "12 hours ago",
  },
  {
    id: "u2",
    identifier: "user_01KFYHEAE9M97CXSYY5ZJBCS05",
    name: "Unknown User",
    avatarColor: "bg-red-900/50 text-red-500",
    tags: [],
    lastModified: "12 hours ago",
  },
  // Uncomment object di bawah ini buat nambah variasi data mock
  /*
  {
    id: "u3",
    identifier: "user_02ABCDE...",
    name: "John Doe",
    avatarColor: "bg-blue-900/50 text-blue-500",
    tags: ["vip", "lead"],
    lastModified: "2 days ago",
  },
  */
];

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter logic simpel (opsional, biar search barnya 'hidup' dikit)
  const filteredUsers = MOCK_USERS.filter(
    (user) =>
      user.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()),
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
          <div className="col-span-2">Tags</div>
          <div className="col-span-2 text-right">Last Modified</div>
        </div>

        {/* Table Body */}
        {filteredUsers.length > 0 ? (
          <div className="divide-y divide-zinc-800/50">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-900/40 transition-colors group"
              >
                {/* Column 1: Identifier */}
                <div className="col-span-5 flex items-center gap-3 overflow-hidden">
                  {/* Avatar Box (Merah Kotak) */}
                  <div
                    className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center shrink-0 border border-white/5",
                      user.avatarColor,
                    )}
                  >
                    <span className="text-xs font-bold">U</span>
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
                    {user.name}
                  </span>
                </div>

                {/* Column 3: Tags */}
                <div className="col-span-2">
                  {user.tags.length > 0 ? (
                    <div className="flex gap-2">
                      {user.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-500 font-medium">
                      No tags
                    </span>
                  )}
                </div>

                {/* Column 4: Last Modified */}
                <div className="col-span-2 flex items-center justify-end gap-4">
                  <span className="text-sm text-zinc-500">
                    {user.lastModified}
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
              We couldn't find any users matching your criteria. Try adjusting
              your filters or wait for new interactions.
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
