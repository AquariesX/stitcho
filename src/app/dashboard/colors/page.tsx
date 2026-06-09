"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createColor,
  deleteColor,
  getColors,
  updateColor,
} from "@/app/actions/color-actions";
import { Loader2, Plus, Search, Trash2, X } from "lucide-react";

type ColorItem = {
  id: number;
  name: string;
  hexCode: string;
  isAvailable: boolean;
  displayOrder: number;
  _count: { supportedProducts: number };
};

const blank = {
  name: "",
  hexCode: "#1F2A44",
  isAvailable: true,
  displayOrder: "0",
};

export default function ColorsPage() {
  const { role, user } = useAuth();
  const [items, setItems] = useState<ColorItem[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<ColorItem | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    getColors(role, user.id).then((result) => {
      if (result.success) setItems((result.data ?? []) as ColorItem[]);
      setLoading(false);
    });
  }, [role, user]);

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.name} ${item.hexCode}`.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  function show(item?: ColorItem) {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            name: item.name,
            hexCode: item.hexCode,
            isAvailable: item.isAvailable,
            displayOrder: String(item.displayOrder),
          }
        : blank
    );
    setError("");
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.set(key, String(value)));
    if (user?.id) data.set("userId", String(user.id));
    const result = editing
      ? await updateColor(editing.id, data)
      : await createColor(data);
    if (!result.success) {
      setError(result.error ?? "Unable to save color.");
      setSaving(false);
      return;
    }
    const refreshed = await getColors(role, user?.id);
    if (refreshed.success) setItems((refreshed.data ?? []) as ColorItem[]);
    setOpen(false);
    setSaving(false);
  }

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-black">
      <header className="flex flex-col justify-between gap-4 rounded-3xl bg-[#223943] p-7 text-white sm:flex-row sm:items-center">
        <div><h1 className="text-3xl font-bold">Colors</h1><p className="text-white/70">Manage mobile swatches and solid-color preview rendering.</p></div>
        <button onClick={() => show()} className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-[#223943]"><Plus size={18} /> Add Color</button>
      </header>
      <div className="relative max-w-md"><Search className="absolute left-3 top-3.5 text-gray-400" size={18} /><input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or hex" /></div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-[800px] w-full text-sm">
          <thead className="bg-slate-50 text-left"><tr>{["Swatch","Color","Hex code","Products","Availability","Order","Actions"].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead>
          <tbody>{filtered.map((item) => <tr key={item.id} className="border-t">
            <td className="p-4"><span className="block h-10 w-10 rounded-full border shadow-sm" style={{backgroundColor:item.hexCode}} /></td>
            <td className="p-4 font-semibold">{item.name}</td>
            <td className="p-4 font-mono">{item.hexCode}</td>
            <td className="p-4">{item._count.supportedProducts}</td>
            <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs ${item.isAvailable ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>{item.isAvailable ? "Available" : "Hidden"}</span></td>
            <td className="p-4">{item.displayOrder}</td>
            <td className="p-4"><div className="flex gap-2"><button onClick={() => show(item)} className="rounded-lg bg-[#223943] px-3 py-2 text-white">Edit</button><button onClick={async () => { if (!confirm(`Delete ${item.name}?`)) return; const result = await deleteColor(item.id); if (result.success) setItems((current) => current.filter((value) => value.id !== item.id)); else alert(result.error); }} className="rounded-lg border border-red-200 p-2 text-red-600"><Trash2 size={16} /></button></div></td>
          </tr>)}</tbody>
        </table>
        {!filtered.length && <div className="p-12 text-center text-gray-500">No colors found.</div>}
      </div>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <form onSubmit={submit} className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
          <div className="flex justify-between rounded-t-3xl bg-[#223943] p-6 text-white"><h2 className="text-xl font-bold">{editing ? "Edit Color" : "Add Color"}</h2><button type="button" onClick={() => setOpen(false)}><X /></button></div>
          <div className="space-y-5 p-7">
            {error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
            <label className="block space-y-2"><span className="font-semibold">Color Name</span><input required className="input" value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} /></label>
            <label className="block space-y-2"><span className="font-semibold">Hex Code</span><div className="flex gap-3"><input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(form.hexCode) ? form.hexCode : "#000000"} onChange={(e) => setForm({...form,hexCode:e.target.value.toUpperCase()})} className="h-12 w-16 rounded-lg border p-1" /><input required pattern="^#[0-9A-Fa-f]{6}$" className="input font-mono" value={form.hexCode} onChange={(e) => setForm({...form,hexCode:e.target.value.toUpperCase()})} /></div></label>
            <div className="flex items-center gap-4 rounded-xl border p-4"><span className="h-14 w-14 rounded-full border shadow" style={{backgroundColor:/^#[0-9A-Fa-f]{6}$/.test(form.hexCode) ? form.hexCode : "#FFFFFF"}} /><div><strong>Live Preview</strong><p className="font-mono text-sm text-gray-500">{form.hexCode}</p></div></div>
            <label className="block space-y-2"><span className="font-semibold">Display Order</span><input className="input" type="number" value={form.displayOrder} onChange={(e) => setForm({...form,displayOrder:e.target.value})} /></label>
            <label className="flex gap-2"><input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({...form,isAvailable:e.target.checked})} /> Available</label>
            <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-5 py-3">Cancel</button><button disabled={saving} className="rounded-xl bg-[#223943] px-6 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Color"}</button></div>
          </div>
        </form>
      </div>}
    </div>
  );
}
