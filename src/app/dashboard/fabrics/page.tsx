"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getCategories } from "@/app/actions/category-actions";
import {
  createFabric,
  deleteFabric,
  getFabrics,
  updateFabric,
} from "@/app/actions/fabric-actions";
import { CONTROLLED_CATEGORIES } from "@/lib/catalog-rules";
import { PRODUCT_TYPE_LABELS } from "@/lib/catalog-types";
import { Loader2, Plus, Search, Trash2, X } from "lucide-react";

type ProductType = keyof typeof PRODUCT_TYPE_LABELS;
type Category = { id: number; name: string; code: string };
type Fabric = {
  id: number;
  name: string;
  description?: string | null;
  categoryId: number;
  category: Category;
  imageUrl: string;
  textureUrl?: string | null;
  textureStorageType: "LOCAL" | "REMOTE";
  price: string;
  priceAdjustment: string;
  stockQuantity: number;
  lowStockLimit: number;
  unit: string;
  isSeamlessTexture: boolean;
  isAvailable: boolean;
  compatibleTypes: Array<{ productType: ProductType }>;
};

const blank = {
  name: "",
  description: "",
  categoryId: "",
  imageUrl: "",
  textureUrl: "",
  textureStorageType: "REMOTE" as "LOCAL" | "REMOTE",
  price: "0.00",
  priceAdjustment: "0.00",
  stockQuantity: "0",
  lowStockLimit: "5",
  isSeamlessTexture: false,
  isAvailable: true,
};

export default function FabricsPage() {
  const { role, user } = useAuth();
  const [items, setItems] = useState<Fabric[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(blank);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [editing, setEditing] = useState<Fabric | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const thumbnailInput = useRef<HTMLInputElement>(null);
  const textureInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getFabrics(role, user.id), getCategories(role, user.id)]).then(
      ([fabricResult, categoryResult]) => {
        if (fabricResult.success) setItems((fabricResult.data ?? []) as unknown as Fabric[]);
        if (categoryResult.success) setCategories((categoryResult.data ?? []) as Category[]);
        setLoading(false);
      }
    );
  }, [role, user]);

  const filtered = useMemo(
    () => items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  function add() {
    setEditing(null);
    setForm({ ...blank, categoryId: categories[0] ? String(categories[0].id) : "" });
    setTypes([]);
    setMessage("");
    setOpen(true);
  }

  function edit(item: Fabric) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      categoryId: String(item.categoryId),
      imageUrl: item.imageUrl,
      textureUrl: item.textureUrl ?? "",
      textureStorageType: item.textureStorageType,
      price: String(item.price),
      priceAdjustment: String(item.priceAdjustment),
      stockQuantity: String(item.stockQuantity),
      lowStockLimit: String(item.lowStockLimit),
      isSeamlessTexture: item.isSeamlessTexture,
      isAvailable: item.isAvailable,
    });
    setTypes(item.compatibleTypes.map((entry) => entry.productType));
    setMessage("");
    setOpen(true);
  }

  async function upload(file: File | undefined, kind: "thumbnail" | "texture") {
    if (!file) return;
    if (!/\.(png|jpe?g|webp)$/i.test(file.name)) {
      setMessage("Use JPG, JPEG, PNG, or WebP images.");
      return;
    }
    setUploading(true);
    try {
      const location = ref(storage, `fabric_${kind}s/${Date.now()}_${file.name}`);
      await uploadBytes(location, file);
      const url = await getDownloadURL(location);
      setForm((current) => ({
        ...current,
        [kind === "thumbnail" ? "imageUrl" : "textureUrl"]: url,
      }));
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.imageUrl) return setMessage("Fabric thumbnail is required.");
    if (!types.length) return setMessage("Select at least one compatible product type.");
    setSaving(true);
    setMessage("");
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.set(key, String(value)));
    data.set("productTypes", JSON.stringify(types));
    if (user?.id) data.set("userId", String(user.id));
    const result = editing
      ? await updateFabric(editing.id, data)
      : await createFabric(data);
    if (!result.success) {
      setMessage(result.error ?? "Unable to save fabric.");
      setSaving(false);
      return;
    }
    const refreshed = await getFabrics(role, user?.id);
    if (refreshed.success) setItems((refreshed.data ?? []) as unknown as Fabric[]);
    setOpen(false);
    setSaving(false);
  }

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-black">
      <header className="flex flex-col justify-between gap-4 rounded-3xl bg-[#223943] p-7 text-white sm:flex-row sm:items-center">
        <div><h1 className="text-3xl font-bold">Fabrics</h1><p className="text-white/70">Manage catalog thumbnails, seamless textures, stock, and product compatibility.</p></div>
        <button onClick={add} className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-[#223943]"><Plus size={18} /> Add Fabric</button>
      </header>
      <div className="relative max-w-md"><Search className="absolute left-3 top-3.5 text-gray-400" size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fabrics" className="input pl-10" /></div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-[1050px] w-full text-sm">
          <thead className="bg-slate-50 text-left"><tr>{["Thumbnail","Fabric","Compatible types","Adjustment","Stock","Texture","Availability","Actions"].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead>
          <tbody>{filtered.map((item) => {
            const low = item.stockQuantity <= item.lowStockLimit;
            return <tr key={item.id} className="border-t">
              <td className="p-4"><div className="relative h-14 w-14 overflow-hidden rounded-xl bg-gray-100">{item.imageUrl && <Image unoptimized fill sizes="56px" src={item.imageUrl} alt={item.name} className="object-cover" />}</div></td>
              <td className="p-4"><strong>{item.name}</strong><p className="text-xs text-gray-500">{item.unit}</p></td>
              <td className="p-4"><div className="flex max-w-xs flex-wrap gap-1">{item.compatibleTypes.map((entry) => <span key={entry.productType} className="rounded-full bg-slate-100 px-2 py-1 text-xs">{PRODUCT_TYPE_LABELS[entry.productType]}</span>)}</div></td>
              <td className="p-4">PKR {Number(item.priceAdjustment).toLocaleString()}</td>
              <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs ${low ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{item.stockQuantity}{low ? " Low" : " In stock"}</span></td>
              <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs ${item.textureUrl && item.isSeamlessTexture ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{item.textureUrl ? (item.isSeamlessTexture ? "Ready" : "Not marked seamless") : "Missing"}</span></td>
              <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs ${item.isAvailable ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>{item.isAvailable ? "Available" : "Hidden"}</span></td>
              <td className="p-4"><div className="flex gap-2"><button onClick={() => edit(item)} className="rounded-lg bg-[#223943] px-3 py-2 text-white">Edit</button><button onClick={async () => { if (!confirm(`Delete ${item.name}?`)) return; const result = await deleteFabric(item.id); if (result.success) setItems((current) => current.filter((value) => value.id !== item.id)); else alert(result.error); }} className="rounded-lg border border-red-200 p-2 text-red-600"><Trash2 size={16} /></button></div></td>
            </tr>;
          })}</tbody>
        </table>
        {!filtered.length && <div className="p-12 text-center text-gray-500">No fabrics found.</div>}
      </div>

      {open && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
        <form onSubmit={submit} className="mx-auto my-5 max-w-3xl rounded-3xl bg-white shadow-2xl">
          <div className="flex justify-between rounded-t-3xl bg-[#223943] p-6 text-white"><h2 className="text-xl font-bold">{editing ? "Edit Fabric" : "Add Fabric"}</h2><button type="button" onClick={() => setOpen(false)}><X /></button></div>
          <div className="grid gap-5 p-7 md:grid-cols-2">
            {message && <p className="md:col-span-2 rounded-xl bg-red-50 p-3 text-red-700">{message}</p>}
            <Field label="Fabric Name"><input required className="input" value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} /></Field>
            <Field label="Primary Category"><select required className="input" value={form.categoryId} onChange={(e) => setForm({...form,categoryId:e.target.value})}><option value="">Select category</option>{categories.filter((category) => CONTROLLED_CATEGORIES.some((item) => item.code === category.code)).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
            <Field label="Description"><textarea className="input min-h-24" value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} /></Field>
            <Field label="Compatible Product Types"><div className="grid gap-2 rounded-xl border p-3">{Object.entries(PRODUCT_TYPE_LABELS).map(([type,label]) => <label key={type} className="flex gap-2"><input type="checkbox" checked={types.includes(type as ProductType)} onChange={(e) => setTypes((current) => e.target.checked ? [...current,type as ProductType] : current.filter((value) => value !== type))} />{label}</label>)}</div></Field>
            <Field label="Fabric Thumbnail"><UploadBox url={form.imageUrl} onClick={() => thumbnailInput.current?.click()} /><input ref={thumbnailInput} hidden type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => upload(e.target.files?.[0],"thumbnail")} /></Field>
            <Field label="Seamless Texture"><UploadBox url={form.textureUrl} onClick={() => textureInput.current?.click()} /><input ref={textureInput} hidden type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => upload(e.target.files?.[0],"texture")} /><p className="text-xs text-gray-500">Prefer a square 512 x 512 or 1024 x 1024 image.</p></Field>
            <Field label="Base Price (PKR)"><input className="input" min="0" step="0.01" type="number" value={form.price} onChange={(e) => setForm({...form,price:e.target.value})} /></Field>
            <Field label="Price Adjustment (PKR)"><input className="input" min="0" step="0.01" type="number" value={form.priceAdjustment} onChange={(e) => setForm({...form,priceAdjustment:e.target.value})} /></Field>
            <Field label="Stock Quantity"><input className="input" min="0" type="number" value={form.stockQuantity} onChange={(e) => setForm({...form,stockQuantity:e.target.value})} /></Field>
            <Field label="Low Stock Limit"><input className="input" min="0" type="number" value={form.lowStockLimit} onChange={(e) => setForm({...form,lowStockLimit:e.target.value})} /></Field>
            <Field label="Texture Storage"><select className="input" value={form.textureStorageType} onChange={(e) => setForm({...form,textureStorageType:e.target.value as "LOCAL"|"REMOTE"})}><option value="REMOTE">Remote</option><option value="LOCAL">Local Flutter asset</option></select></Field>
            <div className="space-y-3 pt-7"><Check label="Texture is seamless" checked={form.isSeamlessTexture} onChange={(value) => setForm({...form,isSeamlessTexture:value})} /><Check label="Available" checked={form.isAvailable} onChange={(value) => setForm({...form,isAvailable:value})} /></div>
            <div className="md:col-span-2 flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-5 py-3">Cancel</button><button disabled={saving || uploading} className="rounded-xl bg-[#223943] px-6 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Fabric"}</button></div>
          </div>
        </form>
      </div>}
    </div>
  );
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>; }
function Check({label,checked,onChange}:{label:string;checked:boolean;onChange:(value:boolean)=>void}) { return <label className="flex gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} />{label}</label>; }
function UploadBox({url,onClick}:{url:string;onClick:()=>void}) { return <button type="button" onClick={onClick} className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-gray-50">{url ? <Image unoptimized fill sizes="350px" src={url} alt="Upload preview" className="object-cover" /> : <span className="text-sm text-gray-500">Choose image</span>}</button>; }
