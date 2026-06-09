"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createProduct,
  deleteProduct,
  getProductFormOptions,
  getProducts,
  setProductAvailability,
  updateProduct,
} from "@/app/actions/product-actions";
import { getCategories } from "@/app/actions/category-actions";
import { useAuth } from "@/context/AuthContext";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Eye, Loader2, Plus, Search, Trash2, UploadCloud, X } from "lucide-react";
import Image from "next/image";

type ProductType = "SHALWAR_KAMEEZ" | "T_SHIRT" | "PANTS" | "FORMAL_SHIRT";

const PRODUCT_TYPES: Array<{ value: ProductType; label: string; preview: string }> = [
  { value: "SHALWAR_KAMEEZ", label: "Men's Shalwar Kameez", preview: "shalwar_qameez" },
  { value: "T_SHIRT", label: "Men's T-Shirt", preview: "tshirt" },
  { value: "PANTS", label: "Men's Pants", preview: "pants" },
  { value: "FORMAL_SHIRT", label: "Men's Formal Shirt", preview: "formal_shirt" },
];

interface Category {
  id: number;
  name: string;
  code: string;
}

interface Fabric {
  id: number;
  name: string;
  stockQuantity: number;
  isAvailable: boolean;
  compatibleTypes: Array<{ productType: ProductType }>;
}

interface Color {
  id: number;
  name: string;
  hexCode: string;
  isAvailable: boolean;
}

interface StyleOption {
  id: number;
  name: string;
  imageUrl: string;
  additionalPrice: string;
  frontOverlayAsset?: string | null;
  backOverlayAsset?: string | null;
  overlayImageUrl?: string | null;
  zIndex?: number;
  isAvailable: boolean;
}

interface Style {
  id: number;
  name: string;
  productType: ProductType | null;
  isRequired: boolean;
  allowMultiple: boolean;
  groupType: string | null;
  isAvailable: boolean;
  options: StyleOption[];
}

interface Product {
  id: number;
  name: string;
  code: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  modelImageUrl?: string | null;
  topOverlayUrl?: string | null;
  bottomOverlayUrl?: string | null;
  overlayKey?: string | null;
  previewEnabled?: boolean;
  basePrice: string;
  categoryId: number;
  category: Category;
  description?: string | null;
  productType?: ProductType | null;
  previewType?: string | null;
  frontPreviewAsset?: string | null;
  backPreviewAsset?: string | null;
  previewStorageType?: "LOCAL" | "REMOTE";
  estimatedDays?: number | null;
  measurementProfile?: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: number;
  supportedFabrics: Array<{ fabricId: number; isDefault: boolean; priceAdjustment: string }>;
  supportedColors: Array<{ colorId: number; isDefault: boolean }>;
  supportedStyles: Array<{ styleOptionId: number; isDefault: boolean }>;
}

const emptyForm = {
  name: "",
  code: "",
  imageUrl: "",
  thumbnailUrl: "",
  modelImageUrl: "",
  topOverlayUrl: "",
  bottomOverlayUrl: "",
  overlayKey: "",
  previewEnabled: false,
  basePrice: "",
  categoryId: "",
  description: "",
  productType: "FORMAL_SHIRT" as ProductType,
  previewType: "formal_shirt",
  frontPreviewAsset: "assets/previews/formal_shirt/base/front.png",
  backPreviewAsset: "assets/previews/formal_shirt/base/back.png",
  previewStorageType: "LOCAL" as "LOCAL" | "REMOTE",
  estimatedDays: "",
  measurementProfile: "FORMAL_SHIRT",
  isAvailable: true,
  isFeatured: false,
  displayOrder: "0",
};

export default function ProductsPage() {
  const { role, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [fabricSelections, setFabricSelections] = useState<Record<number, { isDefault: boolean; priceAdjustment: string }>>({});
  const [colorSelections, setColorSelections] = useState<Record<number, boolean>>({});
  const [styleSelections, setStyleSelections] = useState<Record<number, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | ProductType>("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [fabricSearch, setFabricSearch] = useState("");
  const [colorSearch, setColorSearch] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<"thumbnailUrl" | "modelImageUrl" | "topOverlayUrl" | "bottomOverlayUrl">("thumbnailUrl");

  const refreshOptions = useCallback(async () => {
    if (!user) return;
    const optionResult = await getProductFormOptions(role, user.id);
    if (optionResult.success && optionResult.data) {
      setFabrics(optionResult.data.fabrics as Fabric[]);
      setColors(optionResult.data.colors as Color[]);
      setStyles(optionResult.data.styles as unknown as Style[]);
    }
  }, [role, user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getProducts(role, user.id),
      getCategories(role, user.id),
      getProductFormOptions(role, user.id),
    ]).then(([productResult, categoryResult, optionResult]) => {
      if (productResult.success) setProducts((productResult.data ?? []) as unknown as Product[]);
      if (categoryResult.success) setCategories((categoryResult.data ?? []) as Category[]);
      if (optionResult.success && optionResult.data) {
        setFabrics(optionResult.data.fabrics as Fabric[]);
        setColors(optionResult.data.colors as Color[]);
        setStyles(optionResult.data.styles as unknown as Style[]);
      }
      setLoading(false);
    });
  }, [role, user]);

  const compatibleFabrics = useMemo(
    () =>
      fabrics.filter(
        (fabric) =>
          fabric.compatibleTypes.some(
            (entry) => entry.productType === form.productType
          ) &&
          fabric.name.toLowerCase().includes(fabricSearch.toLowerCase())
      ),
    [fabrics, form.productType, fabricSearch]
  );
  const compatibleStyles = useMemo(
    () =>
      styles.filter(
        (style) =>
          style.isAvailable && style.productType === form.productType
      ),
    [styles, form.productType]
  );
  const activeColors = useMemo(
    () =>
      colors.filter(
        (color) =>
          color.isAvailable &&
          color.name.toLowerCase().includes(colorSearch.toLowerCase())
      ),
    [colors, colorSearch]
  );
  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          `${product.name} ${product.code}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (categoryFilter === "ALL" ||
            product.categoryId === Number(categoryFilter)) &&
          (typeFilter === "ALL" || product.productType === typeFilter) &&
          (availabilityFilter === "ALL" ||
            product.isAvailable === (availabilityFilter === "AVAILABLE"))
      ),
    [products, search, categoryFilter, typeFilter, availabilityFilter]
  );

  function applyType(type: ProductType) {
    const preview = PRODUCT_TYPES.find((item) => item.value === type)!.preview;
    setForm((current) => ({
      ...current,
      productType: type,
      previewType: preview,
      measurementProfile: type,
      frontPreviewAsset: `assets/previews/${preview}/base/front.png`,
      backPreviewAsset: `assets/previews/${preview}/base/back.png`,
    }));
    setFabricSelections({});
    setStyleSelections({});
    const matchingCategory = categories.find((category) => category.code === type);
    if (matchingCategory) {
      setForm((current) => ({ ...current, categoryId: String(matchingCategory.id) }));
    }
  }

  function openAdd() {
    const defaultType = emptyForm.productType;
    const matchingCategory = categories.find(
      (category) => category.code === defaultType
    );
    setEditing(null);
    setForm({
      ...emptyForm,
      categoryId: matchingCategory
        ? String(matchingCategory.id)
        : categories[0]
          ? String(categories[0].id)
          : "",
    });
    setFabricSelections({});
    setColorSelections({});
    setStyleSelections({});
    setError("");
    setStep(1);
    setModalOpen(true);
    void refreshOptions();
  }

  function openEdit(product: Product) {
    const type = product.productType ?? "FORMAL_SHIRT";
    setEditing(product);
    setForm({
      name: product.name,
      code: product.code,
      imageUrl: product.imageUrl,
      thumbnailUrl: product.thumbnailUrl ?? "",
      modelImageUrl: product.modelImageUrl ?? "",
      topOverlayUrl: product.topOverlayUrl ?? "",
      bottomOverlayUrl: product.bottomOverlayUrl ?? "",
      overlayKey: product.overlayKey ?? "",
      previewEnabled: product.previewEnabled ?? false,
      basePrice: String(product.basePrice),
      categoryId: String(product.categoryId),
      description: product.description ?? "",
      productType: type,
      previewType: product.previewType ?? PRODUCT_TYPES.find((item) => item.value === type)!.preview,
      frontPreviewAsset: product.frontPreviewAsset ?? "",
      backPreviewAsset: product.backPreviewAsset ?? "",
      previewStorageType: product.previewStorageType ?? "LOCAL",
      estimatedDays: product.estimatedDays == null ? "" : String(product.estimatedDays),
      measurementProfile: product.measurementProfile ?? "",
      isAvailable: product.isAvailable,
      isFeatured: product.isFeatured,
      displayOrder: String(product.displayOrder),
    });
    setFabricSelections(Object.fromEntries(product.supportedFabrics.map((item) => [item.fabricId, { isDefault: item.isDefault, priceAdjustment: String(item.priceAdjustment) }])));
    setColorSelections(Object.fromEntries(product.supportedColors.map((item) => [item.colorId, item.isDefault])));
    setStyleSelections(Object.fromEntries(product.supportedStyles.map((item) => [item.styleOptionId, item.isDefault])));
    setError("");
    setStep(1);
    setModalOpen(true);
    void refreshOptions();
  }

  async function validatePreviewPng(file: File) {
    if (file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png")) {
      throw new Error("Model and overlay files must be PNG. JPG/JPEG is not allowed.");
    }
    const bitmap = await createImageBitmap(file);
    if (bitmap.width !== 1080 || bitmap.height !== 1440) {
      bitmap.close();
      throw new Error("Preview PNGs must be 1080x1440 pixels.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context?.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = context?.getImageData(0, 0, canvas.width, canvas.height).data;
    if (uploadTarget !== "modelImageUrl" && pixels && !pixels.some((value, index) => index % 4 === 3 && value < 255)) {
      throw new Error("Overlay PNGs must contain transparent pixels.");
    }
  }

  async function uploadCatalogImage(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      if (uploadTarget !== "thumbnailUrl") await validatePreviewPng(file);
      if (uploadTarget === "thumbnailUrl" && !["image/jpeg", "image/png"].includes(file.type)) {
        throw new Error("Product thumbnails must be JPG or PNG.");
      }
      const location = ref(storage, `product_images/${uploadTarget}/${Date.now()}_${file.name}`);
      await uploadBytes(location, file);
      const imageUrl = await getDownloadURL(location);
      setForm((current) => ({ ...current, [uploadTarget]: imageUrl }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    if (!form.thumbnailUrl && !form.imageUrl) {
      setSaving(false);
      return setError("Product thumbnail is required.");
    }
    if (!Object.values(fabricSelections).some((item) => item.isDefault)) {
      setSaving(false);
      return setError("A default fabric is required.");
    }
    if (!Object.values(colorSelections).some(Boolean)) {
      setSaving(false);
      return setError("A default color is required.");
    }
    for (const style of compatibleStyles.filter((item) => item.isRequired)) {
      const selected = style.options.filter((option) => option.id in styleSelections);
      if (!selected.length || (!style.allowMultiple && !selected.some((option) => styleSelections[option.id]))) {
        setSaving(false);
        return setError(`${style.name} requires a selected default option.`);
      }
    }
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.set(key, String(value)));
    if (user?.id) data.set("userId", String(user.id));
    data.set("role", role ?? "tailor");
    data.set("fabrics", JSON.stringify(Object.entries(fabricSelections).map(([fabricId, value]) => ({ fabricId: Number(fabricId), ...value }))));
    data.set("colors", JSON.stringify(Object.entries(colorSelections).map(([colorId, isDefault]) => ({ colorId: Number(colorId), isDefault }))));
    data.set("styles", JSON.stringify(Object.entries(styleSelections).map(([styleOptionId, isDefault]) => ({ styleOptionId: Number(styleOptionId), isDefault }))));

    const result = editing
      ? await updateProduct(editing.id, data)
      : await createProduct(data);
    if (!result.success || !result.data) {
      setError(result.error ?? "Unable to save product.");
      setSaving(false);
      return;
    }
    const refreshed = await getProducts(role, user?.id);
    if (refreshed.success) setProducts((refreshed.data ?? []) as unknown as Product[]);
    setModalOpen(false);
    setSaving(false);
  }

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-6">
      <header className="flex flex-col gap-5 rounded-3xl bg-[#223943] p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Controlled Men&apos;s Catalog</h1>
          <p className="mt-2 text-white/70">Catalog photos and layered preview assets are managed separately.</p>
        </div>
        <button onClick={openAdd} className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#223943] sm:w-auto">
          <Plus size={18} /> Add Product
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="relative"><Search className="absolute left-3 top-3.5 text-gray-400" size={18} /><input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" /></label>
        <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="ALL">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "ALL"|ProductType)}><option value="ALL">All product types</option>{PRODUCT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <select className="input" value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}><option value="ALL">Any availability</option><option value="AVAILABLE">Available</option><option value="HIDDEN">Hidden</option></select>
      </div>
      <div className="w-full min-w-0 overflow-hidden rounded-2xl border bg-white text-black shadow-sm">
        <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="bg-slate-50 text-left"><tr>{["Image","Product","Category","Type","Base price","Preview","Fabrics","Colors","Styles","Available","Featured","Actions"].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead>
          <tbody>{filteredProducts.map((product) => <tr key={product.id} className="border-t">
            <td className="p-4"><div className="relative h-12 w-12 overflow-hidden rounded-lg bg-gray-100">{(product.thumbnailUrl ?? product.imageUrl) && <Image unoptimized fill sizes="48px" src={product.thumbnailUrl ?? product.imageUrl} alt={product.name} className="object-cover" />}</div></td>
            <td className="p-4"><strong>{product.name}</strong><p className="text-xs text-gray-500">{product.code}</p></td>
            <td className="p-4">{product.category.name}</td><td className="p-4">{product.productType ?? "Manual review"}</td>
            <td className="p-4">PKR {Number(product.basePrice).toLocaleString()}</td><td className="p-4 font-mono text-xs">{product.previewType ?? "Missing"}</td>
            <td className="p-4">{product.supportedFabrics.length}</td><td className="p-4">{product.supportedColors.length}</td><td className="p-4">{product.supportedStyles.length}</td>
            <td className="p-4"><button onClick={async()=>{await setProductAvailability(product.id,!product.isAvailable);setProducts((current)=>current.map((item)=>item.id===product.id?{...item,isAvailable:!item.isAvailable}:item));}} className={`rounded-full px-2 py-1 text-xs ${product.isAvailable?"bg-emerald-100 text-emerald-800":"bg-red-100 text-red-700"}`}>{product.isAvailable?"Available":"Hidden"}</button></td>
            <td className="p-4">{product.isFeatured?"Yes":"No"}</td>
            <td className="p-4"><div className="flex gap-2"><button onClick={()=>openEdit(product)} title="View / edit" className="rounded-lg border p-2"><Eye size={16}/></button><button onClick={async()=>{if(!confirm(`Delete ${product.name}?`))return;const result=await deleteProduct(product.id);if(result.success)setProducts((items)=>items.filter((item)=>item.id!==product.id));else alert(result.error);}} className="rounded-lg border border-red-200 p-2 text-red-600"><Trash2 size={16}/></button></div></td>
          </tr>)}</tbody>
        </table>
        {!filteredProducts.length && <div className="p-12 text-center text-gray-500">No products match the filters.</div>}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <form onSubmit={submit} className="mx-auto my-6 max-w-4xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between rounded-t-3xl bg-[#223943] px-7 py-5 text-white">
              <h2 className="text-xl font-bold">{editing ? "Edit Product" : "Add Product"}</h2>
              <button type="button" onClick={() => setModalOpen(false)}><X /></button>
            </div>
            <div className="space-y-8 p-7 text-black">
              {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                {["Basic","Preview","Fabrics","Colors","Styles","Review"].map((label,index)=><button key={label} type="button" onClick={()=>setStep(index+1)} className={`rounded-xl px-3 py-2 text-sm ${step===index+1?"bg-[#223943] text-white":"bg-slate-100"}`}>{index+1}. {label}</button>)}
              </div>

              {step === 1 && <section className="space-y-4">
                <h3 className="text-lg font-bold">A. Basic Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Product Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
                  <Field label="Product Code"><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input" /></Field>
                  <Field label="Product Type"><select value={form.productType} onChange={(e) => applyType(e.target.value as ProductType)} className="input">{PRODUCT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                  <Field label="Category"><select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input"><option value="">Select category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                  <Field label="Base Price"><input required min="0" step="0.01" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className="input" /></Field>
                  <Field label="Estimated Stitching Days"><input required min="1" type="number" value={form.estimatedDays} onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })} className="input" /></Field>
                  <Field label="Measurement Profile"><input readOnly value={form.measurementProfile} className="input bg-gray-100" /></Field>
                  <Field label="Display Order"><input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} className="input" /></Field>
                </div>
                <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-24" /></Field>
                <Field label="Catalog Image">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { setUploadTarget("thumbnailUrl"); fileInput.current?.click(); }} className="flex items-center gap-2 rounded-xl border px-4 py-3"><UploadCloud size={18} /> {uploading ? "Uploading..." : "Upload product thumbnail"}</button>
                    <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={(e) => uploadCatalogImage(e.target.files?.[0])} />
                    <input value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} className="input flex-1" placeholder="Thumbnail URL (JPG or PNG)" />
                  </div>
                </Field>
                <div className="flex gap-6"><Check label="Available" checked={form.isAvailable} onChange={(value) => setForm({ ...form, isAvailable: value })} /><Check label="Featured" checked={form.isFeatured} onChange={(value) => setForm({ ...form, isFeatured: value })} /></div>
              </section>}

              {step === 2 && <section className="space-y-4">
                <h3 className="text-lg font-bold">B. Preview Configuration</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Preview Type"><input readOnly value={form.previewType} className="input bg-gray-100" /></Field>
                  <Field label="Storage Type"><select value={form.previewStorageType} onChange={(e) => setForm({ ...form, previewStorageType: e.target.value as "LOCAL" | "REMOTE" })} className="input"><option value="LOCAL">Local</option><option value="REMOTE">Remote</option></select></Field>
                  <Field label="Front Preview Asset"><input value={form.frontPreviewAsset} onChange={(e) => setForm({ ...form, frontPreviewAsset: e.target.value })} className="input" /></Field>
                  <Field label="Back Preview Asset"><input value={form.backPreviewAsset} onChange={(e) => setForm({ ...form, backPreviewAsset: e.target.value })} className="input" /></Field>
                  <UploadField label="Base Male Model PNG" value={form.modelImageUrl} upload={() => { setUploadTarget("modelImageUrl"); fileInput.current?.click(); }} />
                  <UploadField label="Bottom Clothing Overlay PNG" value={form.bottomOverlayUrl} upload={() => { setUploadTarget("bottomOverlayUrl"); fileInput.current?.click(); }} />
                  <UploadField label="Top Clothing Overlay PNG" value={form.topOverlayUrl} upload={() => { setUploadTarget("topOverlayUrl"); fileInput.current?.click(); }} />
                  <Field label="Overlay Key"><input value={form.overlayKey} onChange={(e) => setForm({ ...form, overlayKey: e.target.value })} className="input" placeholder="kameez_classic" /></Field>
                </div>
                <Check label="Enable layered preview" checked={form.previewEnabled} onChange={(value) => setForm({ ...form, previewEnabled: value })} />
                <p className="text-xs text-gray-500">Preview assets must be transparent PNGs at 1080x1440. The base model may be opaque.</p>
                <LayeredPreview model={form.modelImageUrl} bottom={form.bottomOverlayUrl} top={form.topOverlayUrl} styles={compatibleStyles.flatMap((style) => style.options.filter((option) => option.id in styleSelections && option.overlayImageUrl).map((option) => ({ imageUrl: option.overlayImageUrl!, zIndex: option.zIndex ?? 30 })))} />
              </section>}

              {step === 3 && <section className="space-y-3">
                <h3 className="text-lg font-bold">C. Compatible Fabrics</h3>
                <p className="text-sm text-gray-600">Showing fabrics assigned to <strong>{PRODUCT_TYPES.find((item) => item.value === form.productType)?.label}</strong>. Change Product Type in Basic Information to see another type.</p>
                <input className="input" value={fabricSearch} onChange={(e)=>setFabricSearch(e.target.value)} placeholder="Search compatible fabrics" />
                {compatibleFabrics.map((fabric) => {
                  const selected = fabricSelections[fabric.id];
                  return <div key={fabric.id} className="grid items-center gap-3 rounded-xl border p-3 md:grid-cols-[1fr_140px_100px]">
                    <div><Check label={fabric.name} checked={Boolean(selected)} onChange={(checked) => setFabricSelections((current) => {
                      const next = { ...current };
                      if (checked) next[fabric.id] = { isDefault: false, priceAdjustment: "0.00" }; else delete next[fabric.id];
                      return next;
                    })} /><span className={`ml-6 text-xs ${fabric.isAvailable&&fabric.stockQuantity>0?"text-emerald-700":"text-red-600"}`}>{fabric.stockQuantity} in stock · {fabric.isAvailable?"Available":"Hidden"}</span></div>
                    <input disabled={!selected} type="number" step="0.01" value={selected?.priceAdjustment ?? "0.00"} onChange={(e) => setFabricSelections({ ...fabricSelections, [fabric.id]: { ...selected, priceAdjustment: e.target.value } })} className="input" aria-label={`${fabric.name} price adjustment`} />
                    <label className="text-sm"><input disabled={!selected} type="radio" name="defaultFabric" checked={selected?.isDefault ?? false} onChange={() => setFabricSelections(Object.fromEntries(Object.entries(fabricSelections).map(([id, value]) => [id, { ...value, isDefault: Number(id) === fabric.id }] )))} /> Default</label>
                  </div>;
                })}
                {!compatibleFabrics.length && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No fabric is assigned to this product type.{fabrics.length > 0 && <p className="mt-2 text-xs">Current assignments: {fabrics.map((fabric) => `${fabric.name} (${fabric.compatibleTypes.map((item) => PRODUCT_TYPES.find((type) => type.value === item.productType)?.label).join(", ") || "none"})`).join("; ")}</p>}</div>}
              </section>}

              {step === 4 && <section className="space-y-3">
                <h3 className="text-lg font-bold">D. Compatible Colors</h3>
                <input className="input" value={colorSearch} onChange={(e)=>setColorSearch(e.target.value)} placeholder="Search active colors" />
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">{activeColors.map((color) => <div key={color.id} className="flex items-center justify-between rounded-xl border p-3"><div className="flex items-center gap-2"><span className="h-6 w-6 rounded-full border" style={{backgroundColor:color.hexCode}}/><Check label={color.name} checked={color.id in colorSelections} onChange={(checked) => setColorSelections((current) => { const next = { ...current }; if (checked) next[color.id] = false; else delete next[color.id]; return next; })} /></div><input disabled={!(color.id in colorSelections)} type="radio" name="defaultColor" checked={colorSelections[color.id] ?? false} onChange={() => setColorSelections(Object.fromEntries(Object.keys(colorSelections).map((id) => [id, Number(id) === color.id])))} /></div>)}</div>
              </section>}

              {step === 5 && <section className="space-y-4">
                <h3 className="text-lg font-bold">E. Compatible Styles</h3>
                <p className="text-sm text-gray-600">Showing available style groups assigned to <strong>{PRODUCT_TYPES.find((item) => item.value === form.productType)?.label}</strong>.</p>
                {compatibleStyles.map((style) => <fieldset key={style.id} className="rounded-xl border p-4"><legend className="px-2 font-semibold">{style.name}{style.isRequired ? " *" : ""} · {style.allowMultiple?"Multiple":"Single select"}</legend><div className="grid gap-2 sm:grid-cols-2">{style.options.filter((option)=>option.isAvailable).map((option) => <div key={option.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3"><div className="flex gap-3">{option.imageUrl&&<div className="relative h-10 w-10 overflow-hidden rounded-lg"><Image unoptimized fill sizes="40px" src={option.imageUrl} alt={option.name} className="object-cover"/></div>}<div><Check label={option.name} checked={option.id in styleSelections} onChange={(checked) => setStyleSelections((current) => { const next = { ...current }; if (checked) next[option.id] = false; else delete next[option.id]; return next; })} /><p className="ml-5 text-xs text-gray-500">PKR {Number(option.additionalPrice).toLocaleString()} · F {option.frontOverlayAsset?"✓":"✗"} B {option.backOverlayAsset?"✓":"✗"}</p></div></div><input disabled={!(option.id in styleSelections)} type="radio" name={`defaultStyle-${style.id}`} checked={styleSelections[option.id] ?? false} onChange={() => setStyleSelections((current) => ({ ...current, ...Object.fromEntries(style.options.filter((item) => item.id in current).map((item) => [item.id, item.id === option.id])) }))} /></div>)}</div>{!style.options.some((option) => option.isAvailable) && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This group has no available options. Add an option on the Styles page before assigning it.</p>}</fieldset>)}
                {!compatibleStyles.length && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No available style group is assigned to this product type. Check Product Type and Available on the Styles page.</p>}
              </section>}

              {step === 6 && <section className="space-y-5"><h3 className="text-lg font-bold">Review and Publish</h3>
                <div className="grid gap-5 md:grid-cols-2"><div className="overflow-hidden rounded-2xl border"><div className="relative h-52 bg-gray-100">{(form.thumbnailUrl || form.imageUrl)&&<Image unoptimized fill sizes="400px" src={form.thumbnailUrl || form.imageUrl} alt={form.name||"Product"} className="object-cover"/>}</div><div className="p-4"><strong>{form.name||"Unnamed product"}</strong><p>{form.productType} · PKR {Number(form.basePrice||0).toLocaleString()}</p></div></div>
                <div className="space-y-3 rounded-2xl border p-4"><p><strong>Preview:</strong> {form.previewType}</p><p className="break-all text-xs">Front: {form.frontPreviewAsset||"Missing"}</p><p className="break-all text-xs">Back: {form.backPreviewAsset||"Missing"}</p><p><strong>Fabrics:</strong> {Object.keys(fabricSelections).length}</p><p><strong>Colors:</strong> {Object.keys(colorSelections).length}</p><p><strong>Styles:</strong> {Object.keys(styleSelections).length}</p><p><strong>Base configuration:</strong> PKR {(Number(form.basePrice||0)+Object.values(fabricSelections).filter((item)=>item.isDefault).reduce((sum,item)=>sum+Number(item.priceAdjustment||0),0)).toLocaleString()}</p></div></div>
              </section>}

              <div className="flex justify-end gap-3 border-t pt-5">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border px-5 py-3">Cancel</button>
                {step>1&&<button type="button" onClick={()=>setStep((value)=>value-1)} className="rounded-xl border px-5 py-3">Back</button>}
                {step<6?<button type="button" onClick={()=>setStep((value)=>value+1)} className="rounded-xl bg-[#223943] px-6 py-3 font-semibold text-white">Next</button>:<button disabled={saving || uploading} className="flex items-center gap-2 rounded-xl bg-[#223943] px-6 py-3 font-semibold text-white disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />} Publish Product</button>}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

function UploadField({ label, value, upload }: { label: string; value: string; upload: () => void }) {
  return <Field label={label}><button type="button" onClick={upload} className="input truncate text-left">{value || "Upload PNG"}</button></Field>;
}

function LayeredPreview({ model, bottom, top, styles }: {
  model: string;
  bottom: string;
  top: string;
  styles: Array<{ imageUrl: string; zIndex: number }>;
}) {
  const layers = [
    model && { imageUrl: model, zIndex: 0 },
    bottom && { imageUrl: bottom, zIndex: 10 },
    top && { imageUrl: top, zIndex: 20 },
    ...styles,
  ].filter(Boolean) as Array<{ imageUrl: string; zIndex: number }>;
  return <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border bg-slate-50">
    {layers.sort((a, b) => a.zIndex - b.zIndex).map((layer, index) => (
      <Image key={`${layer.imageUrl}-${index}`} unoptimized fill sizes="384px" src={layer.imageUrl} alt="" className="object-contain" style={{ zIndex: layer.zIndex }} />
    ))}
    {!layers.length && <div className="flex h-full items-center justify-center text-sm text-gray-500">Upload preview layers to inspect alignment.</div>}
  </div>;
}
