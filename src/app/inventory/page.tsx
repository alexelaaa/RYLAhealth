"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import type { InventoryItem } from "@/types";

const ALLOWED_ROLES = ["nurse", "staff", "admin"];

const CATEGORIES = [
  "Apparel",
  "Supplies",
  "Swag",
  "Office",
  "Medical",
  "First Aid",
  "Food",
  "Other",
];

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

function InventoryContent() {
  const { campWeekend, session } = useCamp();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    quantity: "",
    size: "",
    unit: "",
    notes: "",
  });

  const fetchItems = useCallback(async () => {
    try {
      const params = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
      const res = await fetch(`/api/inventory${params}`);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [campWeekend]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const resetForm = () => {
    setFormData({ itemName: "", category: "", quantity: "", size: "", unit: "", notes: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingId ? `/api/inventory/${editingId}` : "/api/inventory";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity) || 0,
          campWeekend,
        }),
      });

      if (res.ok) {
        resetForm();
        fetchItems();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({
      itemName: item.itemName,
      category: item.category || "",
      quantity: String(item.quantity),
      size: item.size || "",
      unit: item.unit || "",
      notes: item.notes || "",
    });
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    fetchItems();
  };

  const filtered = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      (item.notes || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filterCategory || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalQuantity = filtered.reduce((sum, item) => sum + item.quantity, 0);
  const isAdmin = session?.role === "admin";
  const hasAccess = session?.role && ALLOWED_ROLES.includes(session.role);

  if (!hasAccess) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-slate-500 text-lg">Access restricted to nurse, staff, and admin roles.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Inventory</h1>
        <button
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium"
        >
          {showForm ? "Cancel" : "+ Add Item"}
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex gap-3 text-sm">
        <div className="bg-green-50 text-green-800 px-3 py-1.5 rounded-lg border border-green-200">
          <span className="font-semibold">{filtered.length}</span> items
        </div>
        <div className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200">
          <span className="font-semibold">{totalQuantity}</span> total qty
        </div>
        <div className="ml-auto flex gap-2">
          <a
            href={`/api/inventory/export?format=csv${campWeekend ? `&weekend=${encodeURIComponent(campWeekend)}` : ""}`}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-300 text-sm hover:bg-slate-200"
          >
            CSV
          </a>
          <a
            href={`/api/inventory/export?format=pdf${campWeekend ? `&weekend=${encodeURIComponent(campWeekend)}` : ""}`}
            target="_blank"
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-300 text-sm hover:bg-slate-200"
          >
            PDF
          </a>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
        >
          <h2 className="font-semibold text-slate-900">
            {editingId ? "Edit Item" : "Add New Item"}
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              placeholder="e.g. Sweatshirts, Tote Bags, Lanyards..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Size
              </label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">N/A</option>
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g. packs, boxes, each"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional details..."
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Update Item" : "Add Item"}
          </button>
        </form>
      )}

      {/* Search and Filter */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Items List */}
      {loading ? (
        <p className="text-slate-500 text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          {items.length === 0
            ? "No inventory items yet. Add your first item!"
            : "No items match your search."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{item.itemName}</span>
                    {item.size && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        {item.size}
                      </span>
                    )}
                    {item.category && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                    <span className="font-semibold text-green-700">
                      Qty: {item.quantity}
                      {item.unit ? ` ${item.unit}` : ""}
                    </span>
                    <span>by {item.enteredBy}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-slate-500 mt-1">{item.notes}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1.5 text-slate-400 hover:text-blue-600"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <AppShell>
      <InventoryContent />
    </AppShell>
  );
}
