"use client";

import React, { useState } from 'react';

type UserRole = 'Admin' | 'Pro' | 'Free';

interface UserData {
  id: string;
  name: string;
  handle: string;
  role: UserRole;
  status: string;
  avatarUrl: string;
  online: boolean;
}

const MOCK_USERS: UserData[] = [
  { id: '1', name: 'Alex Rivers', handle: '@arivers_dev', role: 'Admin', status: 'Last seen 2m ago', online: true, avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAytwvrHmfCGWw5JxmR83gX-lpvKGYrvFQeLlw5MkMJYd84km2BwhGlZyP3gxHtDq9Ud9qQQrIh0vSv3JF7k2X2BveZb26sOIFwb5l-pVrzafri7PF-mM55vJJwAbyZigLCoYX4UREHftVQdNjgATzP5bZz-fOjXBwgPDCnF14tHc5SgzkQywjFjLNduOpbFzCADZzyFuTJYqG_xT4d0txznKnnpNMGxuqLt-12b3dNAh1lz84jSQI6TtNlTMETy1mEvvzmYSb_oKE' },
  { id: '2', name: 'Sarah Jenkins', handle: '@sjenkins', role: 'Pro', status: 'Last seen 1h ago', online: false, avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFnsKeZDKfzIRp-83dJolm2zrsO-pwK2IKvIT2F_on70cuVODG6xTN6wxfhCgE0fEDfqzrAsjxeNt8NVrdH31CY8qqmzvS7bH5xCaYC0cinztiyZGNWsjI3ir5Xx7WfbBIx4a-RjrTK2fsFGVgVVUOD4ugU-8xQVDMrX1ZTb_XTUf1rJN-Yt-ClymiUUxOwPvgiQk09-BF5IjBIqKQWnqkoTXpiOQ4UN69qwgo7KLTHRLIcS62tSBbSRzcVbGEJHdIhSdvMsjCg7E' },
  { id: '3', name: 'Michael Scott', handle: '@m_scott', role: 'Free', status: 'Offline', online: false, avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7E2DK4M3wrenPpqXgP6ODCft6u-0KdyVoRiDZky5OXQE73BJvqjwSmvJYJ4WxSv-pl1B9oYu2rvn-8BJ2VcUkGl2rTiEdJueGxpIom_vuaSTH49ZmctCGFaLqDzF6mDupHsLplgizh2mCuhifKpQxf1SiEZ5HCo3YAA4LfpG8-CmlfNv9cNaqlar6z7YZKtkwwaTYosNNxdisnSFnI_jCs2fN8hL9ZhamVcAbwkZRLm6r9f4MmDkAPbHTB93kKH99HfDHxMvLrEE' },
  { id: '4', name: 'Emma Stone', handle: '@estone_x', role: 'Pro', status: 'Online', online: true, avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDgiamk2ypKAZJGpc-waPg6eExNLIZ1gYTy-m0YKb-Az5aZrqr69lsm_wIodt_I2oBxfOBUKCyFbykkbR-pgc-pJo2T-Pqlxz7DJTb3wsrQDKixKjzmO29i_kWMDzV7OqVS6zaHuj59a_XuvHEfrUGf1LEDoEBzlJWAWKvmZ7-LjLIhJBTUJBGK7OvjJjDH0_D5CQ31_nviW6d4AK2adoHw5a5QVXnifnYQgiCaC1pzKRP70mUDK8n9h8TDHEB4KWTZ7_Xf8hXxKQ' },
  { id: '5', name: 'Liam Neeson', handle: '@taken_master', role: 'Free', status: 'Yesterday', online: false, avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADnY7wWLLLSdOHuwpTpOoVAt3XufBuj8lQe2jYE9IW_NDrC8_sZ_AKZktDisf0r7dUTd66UtBJz7leEGSuU9xfF8yCyV6P8doHFGxhq5F8iL_z4fAqCwI5XXNWxeYvrKIwytkAPZUw7owmwgUC8T066rNeOR5A8VpsCqzRFwsvvkYTOZ7ScaodNKP1aGp90qt7UPHBzoFYLLnFbAKMsVtt3U-Jk18MS8KiXi7Tdm6TlWVRSb2-16dpWCenWg7BW9Rlb772sCSyc-E' }
];

export function AdminUsersWidget() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Users");

  const filters = ["All Users", "Admin", "Pro", "Free"];

  const filteredUsers = MOCK_USERS.filter(user => {
    const matchesFilter = activeFilter === "All Users" || user.role === activeFilter;
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.handle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search Section */}
      <div className="px-4 py-4 space-y-4 shrink-0">
        <label className="relative flex items-center w-full group">
          <div className="absolute left-4 text-slate-400 dark:text-slate-500 flex items-center pointer-events-none group-focus-within:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-slate-200/50 dark:bg-[#1c262f] border-none rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-primary/50 text-sm font-normal outline-none"
            placeholder="Search by name, ID or role..."
          />
        </label>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? 'bg-primary text-white'
                  : 'bg-slate-200 dark:bg-[#1c262f] text-slate-600 dark:text-slate-400 hover:bg-primary/20 dark:hover:bg-primary/20'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* User List Section */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        <div className="space-y-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
            Recent Members — {filteredUsers.length} Total
          </h3>

          {filteredUsers.map(user => (
            <UserRow key={user.id} user={user} />
          ))}

          {filteredUsers.length === 0 && (
            <div className="py-10 text-center text-slate-500 text-sm">
              No users found.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function UserRow({ user }: { user: UserData }) {
  let roleBadgeClass = "";
  if (user.role === 'Admin') roleBadgeClass = "bg-primary/10 text-primary";
  else if (user.role === 'Pro') roleBadgeClass = "bg-amber-500/10 text-amber-500";
  else roleBadgeClass = "bg-slate-500/10 text-slate-500 dark:text-slate-400";

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-[#1c262f]/40 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1c262f] transition-colors border border-transparent dark:border-[#2a3744]/50 mb-2">
      <div className="relative shrink-0">
        <img
          src={user.avatarUrl}
          alt={`Avatar of ${user.name}`}
          className="size-12 rounded-full bg-primary/10 object-cover"
        />
        {user.online && (
          <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white dark:border-[#121a20] rounded-full"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-slate-900 dark:text-slate-100 text-[15px] font-semibold truncate">{user.name}</p>
          <span className={`flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${roleBadgeClass}`}>
            {user.role}
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-xs truncate">
          {user.handle} • {user.status}
        </p>
      </div>
      <button className="flex shrink-0 items-center justify-center h-8 px-4 bg-primary/10 dark:bg-primary/20 text-primary text-xs font-bold rounded-lg hover:bg-primary hover:text-white transition-all">
        Edit
      </button>
    </div>
  );
}
