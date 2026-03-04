"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";

interface User {
  id: number;
  label: string;
  role: string;
}

export default function AdminUsersPage() {
  return (
    <AppShell>
      <UsersContent />
    </AppShell>
  );
}

function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New user form
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editRole, setEditRole] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async () => {
    if (!newLabel.trim() || !newPin.trim()) {
      setError("Label and PIN are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel, pin: newPin, role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add user");
        return;
      }
      setNewLabel("");
      setNewPin("");
      setNewRole("staff");
      setShowAdd(false);
      setSuccess("User added");
      setTimeout(() => setSuccess(""), 3000);
      await fetchUsers();
    } catch {
      setError("Failed to add user");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, string | number> = { id };
      if (editLabel.trim()) body.label = editLabel;
      if (editPin.trim()) body.pin = editPin;
      if (editRole) body.role = editRole;

      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update user");
        return;
      }
      setEditingId(null);
      setSuccess("User updated");
      setTimeout(() => setSuccess(""), 3000);
      await fetchUsers();
    } catch {
      setError("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, label: string) => {
    if (!confirm(`Delete user "${label}"?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete user");
        return;
      }
      setSuccess("User deleted");
      setTimeout(() => setSuccess(""), 3000);
      await fetchUsers();
    } catch {
      setError("Failed to delete user");
    }
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditLabel(user.label);
    setEditPin("");
    setEditRole(user.role);
  };

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    nurse: "bg-green-100 text-green-700",
    staff: "bg-blue-100 text-blue-700",
    bussing: "bg-teal-100 text-teal-700",
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Users & PINs</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium"
        >
          {showAdd ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {/* Add user form */}
      {showAdd && (
        <div className="bg-white rounded-xl p-4 border border-slate-300 space-y-3">
          <h2 className="font-semibold text-sm text-slate-700">New User</h2>
          <input
            type="text"
            placeholder="Label (e.g. Bus 3 Staff)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="staff">Staff</option>
            <option value="nurse">Nurse</option>
            <option value="bussing">Bussing</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40"
          >
            {saving ? "Adding..." : "Add User"}
          </button>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl p-6 border border-slate-300 text-center text-sm text-slate-400">
          No users configured
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const isEditing = editingId === user.id;
            return (
              <div key={user.id} className="bg-white rounded-xl border border-slate-300 overflow-hidden">
                {isEditing ? (
                  <div className="p-4 space-y-3">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="New PIN (leave blank to keep current)"
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="staff">Staff</option>
                      <option value="nurse">Nurse</option>
                      <option value="bussing">Bussing</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdate(user.id)}
                        disabled={saving}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm text-slate-900">{user.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[user.role] || "bg-slate-100 text-slate-600"}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(user)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.label)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center pt-2">
        PINs are stored securely (hashed). Existing PINs cannot be viewed — only reset.
      </p>
    </div>
  );
}
