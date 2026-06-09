"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  createStyle,
  createStyleOption,
  deleteStyle,
  deleteStyleOption,
  getStyles,
  updateStyle,
  updateStyleOption,
} from "@/app/actions/style-actions";
import { PREVIEW_TYPE_BY_PRODUCT, PRODUCT_TYPE_LABELS } from "@/lib/catalog-types";
import { Loader2, Plus, Trash2, X } from "lucide-react";

type ProductType = keyof typeof PRODUCT_TYPE_LABELS;
type GroupType = "COLLAR"|"NECK"|"SLEEVE"|"CUFF"|"POCKET"|"PLACKET"|"FIT"|"SHALWAR_STYLE"|"WAIST"|"FRONT"|"BOTTOM";
type Option = {
  id:number; styleId:number; name:string; imageUrl:string; additionalPrice:string;
  overlayKey?:string|null; frontOverlayAsset?:string|null; backOverlayAsset?:string|null;
  overlayImageUrl?:string|null; styleType?:"COLLAR"|"CUFF"|"POCKET"|"BUTTON"|"OTHER"|null; zIndex:number;
  assetStorageType:"LOCAL"|"REMOTE"; isDefault:boolean; isAvailable:boolean; displayOrder:number;
};
type Style = {
  id:number; name:string; imageUrl?:string|null; productType:ProductType; groupType:GroupType;
  isRequired:boolean; allowMultiple:boolean; displayOrder:number; isAvailable:boolean; options:Option[];
};

const groupTypes: GroupType[] = ["COLLAR","NECK","SLEEVE","CUFF","POCKET","PLACKET","FIT","SHALWAR_STYLE","WAIST","FRONT","BOTTOM"];
const blankGroup = { name:"", imageUrl:"", productType:"FORMAL_SHIRT" as ProductType, groupType:"COLLAR" as GroupType, isRequired:false, allowMultiple:false, displayOrder:"0", isAvailable:true };
const blankOption = { name:"", imageUrl:"", additionalPrice:"0.00", overlayKey:"", overlayImageUrl:"", styleType:"OTHER" as "COLLAR"|"CUFF"|"POCKET"|"BUTTON"|"OTHER", zIndex:"30", frontOverlayAsset:"", backOverlayAsset:"", assetStorageType:"LOCAL" as "LOCAL"|"REMOTE", isDefault:false, isAvailable:true, displayOrder:"0" };

export default function StylesPage() {
  const { role,user } = useAuth();
  const [items,setItems] = useState<Style[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [filter,setFilter] = useState<ProductType|"ALL">("ALL");
  const [groupOpen,setGroupOpen] = useState(false);
  const [optionOpen,setOptionOpen] = useState(false);
  const [groupForm,setGroupForm] = useState(blankGroup);
  const [optionForm,setOptionForm] = useState(blankOption);
  const [editingGroup,setEditingGroup] = useState<Style|null>(null);
  const [editingOption,setEditingOption] = useState<Option|null>(null);
  const [optionStyle,setOptionStyle] = useState<Style|null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [uploadTarget,setUploadTarget] = useState<"group"|"option"|"overlay">("group");

  async function refresh() {
    const result = await getStyles(role,user?.id);
    if (result.success) setItems((result.data ?? []) as unknown as Style[]);
  }
  useEffect(() => {
    if (!user) return;
    let active = true;
    getStyles(role, user.id).then((result) => {
      if (!active) return;
      if (result.success) setItems((result.data ?? []) as unknown as Style[]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [role,user]);
  const filtered = useMemo(()=>items.filter((item)=>filter==="ALL"||item.productType===filter),[items,filter]);

  function showGroup(item?:Style) {
    setEditingGroup(item??null);
    setGroupForm(item ? {name:item.name,imageUrl:item.imageUrl??"",productType:item.productType,groupType:item.groupType,isRequired:item.isRequired,allowMultiple:item.allowMultiple,displayOrder:String(item.displayOrder),isAvailable:item.isAvailable} : blankGroup);
    setError(""); setGroupOpen(true);
  }
  function showOption(style:Style,item?:Option) {
    const preview = PREVIEW_TYPE_BY_PRODUCT[style.productType];
    setOptionStyle(style); setEditingOption(item??null);
    setOptionForm(item ? {name:item.name,imageUrl:item.imageUrl,additionalPrice:String(item.additionalPrice),overlayKey:item.overlayKey??"",overlayImageUrl:item.overlayImageUrl??"",styleType:item.styleType??"OTHER",zIndex:String(item.zIndex??30),frontOverlayAsset:item.frontOverlayAsset??"",backOverlayAsset:item.backOverlayAsset??"",assetStorageType:item.assetStorageType,isDefault:item.isDefault,isAvailable:item.isAvailable,displayOrder:String(item.displayOrder)} : {...blankOption,frontOverlayAsset:`assets/previews/${preview}/styles/`,backOverlayAsset:`assets/previews/${preview}/styles/`});
    setError(""); setOptionOpen(true);
  }
  async function upload(file?:File) {
    if (!file) return;
    if(uploadTarget==="overlay"){
      if(file.type!=="image/png"&&!file.name.toLowerCase().endsWith(".png")){setError("Style overlays must be PNG; JPG/JPEG is rejected.");return;}
      const bitmap=await createImageBitmap(file);
      if(bitmap.width!==1080||bitmap.height!==1440){bitmap.close();setError("Style overlays must be 1080x1440 pixels.");return;}
      const canvas=document.createElement("canvas");canvas.width=bitmap.width;canvas.height=bitmap.height;
      const context=canvas.getContext("2d",{willReadFrequently:true});context?.drawImage(bitmap,0,0);bitmap.close();
      const pixels=context?.getImageData(0,0,canvas.width,canvas.height).data;
      if(pixels&&!pixels.some((value,index)=>index%4===3&&value<255)){setError("Style overlay PNG must contain transparent pixels.");return;}
    } else if(!["image/jpeg","image/png"].includes(file.type)){setError("Selector thumbnails must be JPG or PNG.");return;}
    const location = ref(storage,`${uploadTarget==="overlay"?"style_overlays":"style_thumbnails"}/${Date.now()}_${file.name}`);
    await uploadBytes(location,file); const url=await getDownloadURL(location);
    if(uploadTarget==="group") setGroupForm((value)=>({...value,imageUrl:url}));
    else if(uploadTarget==="option") setOptionForm((value)=>({...value,imageUrl:url}));
    else setOptionForm((value)=>({...value,overlayImageUrl:url}));
  }
  async function saveGroup(event:React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const data=new FormData(); Object.entries(groupForm).forEach(([key,value])=>data.set(key,String(value))); if(user?.id)data.set("userId",String(user.id));
    const result=editingGroup?await updateStyle(editingGroup.id,data):await createStyle(data);
    if(!result.success){setError(result.error??"Unable to save style group.");setSaving(false);return;}
    await refresh();setGroupOpen(false);setSaving(false);
  }
  async function saveOption(event:React.FormEvent) {
    event.preventDefault(); if(!optionStyle)return; setSaving(true);setError("");
    const data=new FormData();Object.entries(optionForm).forEach(([key,value])=>data.set(key,String(value)));data.set("styleId",String(optionStyle.id));
    const result=editingOption?await updateStyleOption(editingOption.id,data):await createStyleOption(data);
    if(!result.success){setError(result.error??"Unable to save option.");setSaving(false);return;}
    await refresh();setOptionOpen(false);setSaving(false);
  }
  if(loading)return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin"/></div>;

  return <div className="mx-auto max-w-7xl space-y-6 text-black">
    <header className="flex flex-col justify-between gap-4 rounded-3xl bg-[#223943] p-7 text-white sm:flex-row sm:items-center"><div><h1 className="text-3xl font-bold">Style Groups</h1><p className="text-white/70">Create structured, product-specific options and preview overlays.</p></div><button onClick={()=>showGroup()} className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-[#223943]"><Plus size={18}/> Add Group</button></header>
    <div className="flex flex-wrap gap-2"><button onClick={()=>setFilter("ALL")} className={`rounded-full px-4 py-2 text-sm ${filter==="ALL"?"bg-[#223943] text-white":"bg-white border"}`}>All</button>{Object.entries(PRODUCT_TYPE_LABELS).map(([type,label])=><button key={type} onClick={()=>setFilter(type as ProductType)} className={`rounded-full px-4 py-2 text-sm ${filter===type?"bg-[#223943] text-white":"bg-white border"}`}>{label}</button>)}</div>
    <div className="space-y-4">{filtered.map((style)=><section key={style.id} className="rounded-2xl border bg-white p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row"><div className="flex gap-3">{style.imageUrl&&<div className="relative h-14 w-14 overflow-hidden rounded-xl"><Image unoptimized fill sizes="56px" src={style.imageUrl} alt={style.name} className="object-cover"/></div>}<div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{style.name}</h2><Badge>{style.groupType}</Badge><Badge>{PRODUCT_TYPE_LABELS[style.productType]}</Badge>{style.isRequired&&<Badge>Required</Badge>}{style.allowMultiple&&<Badge>Multiple</Badge>}</div><p className="text-xs text-gray-500">Display order {style.displayOrder} · {style.isAvailable?"Available":"Hidden"}</p></div></div>
      <div className="flex gap-2"><button onClick={()=>showOption(style)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white">Add Option</button><button onClick={()=>showGroup(style)} className="rounded-lg bg-[#223943] px-3 py-2 text-sm text-white">Edit Group</button><button onClick={async()=>{if(!confirm(`Delete ${style.name}?`))return;const result=await deleteStyle(style.id);if(result.success)await refresh();else alert(result.error);}} className="rounded-lg border border-red-200 p-2 text-red-600"><Trash2 size={16}/></button></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{style.options.map((option)=><article key={option.id} className="rounded-xl border p-3">
        <div className="flex gap-3">{option.imageUrl&&<div className="relative h-12 w-12 overflow-hidden rounded-lg"><Image unoptimized fill sizes="48px" src={option.imageUrl} alt={option.name} className="object-cover"/></div>}<div className="min-w-0"><strong>{option.name}</strong><p className="text-xs text-gray-500">PKR {Number(option.additionalPrice).toLocaleString()}</p></div></div>
        <div className="mt-3 flex flex-wrap gap-1 text-xs"><Badge>{option.isDefault?"Default":"Optional"}</Badge><Badge>{option.frontOverlayAsset?"Front ✓":"Front missing"}</Badge><Badge>{option.backOverlayAsset?"Back ✓":"Back missing"}</Badge></div>
        <div className="mt-3 flex gap-2"><button onClick={()=>showOption(style,option)} className="rounded-lg border px-3 py-1.5 text-xs">Edit</button><button onClick={async()=>{if(!confirm(`Delete ${option.name}?`))return;const result=await deleteStyleOption(option.id);if(result.success)await refresh();else alert(result.error);}} className="text-xs text-red-600">Delete</button></div>
      </article>)}</div>{!style.options.length&&<p className="mt-4 rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">No options in this group.</p>}
    </section>)}</div>

    {groupOpen&&<Modal title={editingGroup?"Edit Style Group":"Add Style Group"} close={()=>setGroupOpen(false)}><form onSubmit={saveGroup} className="grid gap-4 md:grid-cols-2">{error&&<ErrorText>{error}</ErrorText>}<Field label="Group Name"><input required className="input" value={groupForm.name} onChange={(e)=>setGroupForm({...groupForm,name:e.target.value})}/></Field><Field label="Product Type"><select className="input" value={groupForm.productType} onChange={(e)=>setGroupForm({...groupForm,productType:e.target.value as ProductType})}>{Object.entries(PRODUCT_TYPE_LABELS).map(([type,label])=><option key={type} value={type}>{label}</option>)}</select></Field><Field label="Group Type"><select className="input" value={groupForm.groupType} onChange={(e)=>setGroupForm({...groupForm,groupType:e.target.value as GroupType})}>{groupTypes.map((type)=><option key={type}>{type}</option>)}</select></Field><Field label="Display Order"><input className="input" type="number" value={groupForm.displayOrder} onChange={(e)=>setGroupForm({...groupForm,displayOrder:e.target.value})}/></Field><Field label="Group Icon / Image"><button type="button" onClick={()=>{setUploadTarget("group");imageInput.current?.click();}} className="input text-left">{groupForm.imageUrl||"Upload thumbnail"}</button></Field><div className="space-y-2 pt-7"><Check label="Required" checked={groupForm.isRequired} onChange={(value)=>setGroupForm({...groupForm,isRequired:value})}/><Check label="Allow multiple" checked={groupForm.allowMultiple} onChange={(value)=>setGroupForm({...groupForm,allowMultiple:value})}/><Check label="Available" checked={groupForm.isAvailable} onChange={(value)=>setGroupForm({...groupForm,isAvailable:value})}/></div><Actions saving={saving} cancel={()=>setGroupOpen(false)} label="Save Group"/></form></Modal>}
    {optionOpen&&optionStyle&&<Modal title={editingOption?`Edit ${optionStyle.name} Option`:`Add ${optionStyle.name} Option`} close={()=>setOptionOpen(false)}><form onSubmit={saveOption} className="grid gap-4 md:grid-cols-2">{error&&<ErrorText>{error}</ErrorText>}<Field label="Option Name"><input required className="input" value={optionForm.name} onChange={(e)=>setOptionForm({...optionForm,name:e.target.value})}/></Field><Field label="Additional Price (PKR)"><input className="input" min="0" step="0.01" type="number" value={optionForm.additionalPrice} onChange={(e)=>setOptionForm({...optionForm,additionalPrice:e.target.value})}/></Field><Field label="Selector Thumbnail"><button type="button" onClick={()=>{setUploadTarget("option");imageInput.current?.click();}} className="input text-left">{optionForm.imageUrl||"Upload JPG or PNG thumbnail"}</button></Field><Field label="Transparent Overlay PNG"><button type="button" onClick={()=>{setUploadTarget("overlay");imageInput.current?.click();}} className="input text-left">{optionForm.overlayImageUrl||"Upload 1080x1440 PNG"}</button></Field><Field label="Style Type"><select className="input" value={optionForm.styleType} onChange={(e)=>setOptionForm({...optionForm,styleType:e.target.value as typeof optionForm.styleType})}>{["COLLAR","CUFF","POCKET","BUTTON","OTHER"].map((type)=><option key={type}>{type}</option>)}</select></Field><Field label="Overlay Key"><input className="input" value={optionForm.overlayKey} onChange={(e)=>setOptionForm({...optionForm,overlayKey:e.target.value})}/></Field><Field label="Z-index"><input className="input" type="number" value={optionForm.zIndex} onChange={(e)=>setOptionForm({...optionForm,zIndex:e.target.value})}/></Field><Field label="Front Overlay Asset (legacy)"><input className="input" value={optionForm.frontOverlayAsset} onChange={(e)=>setOptionForm({...optionForm,frontOverlayAsset:e.target.value})}/></Field><Field label="Back Overlay Asset (legacy)"><input className="input" value={optionForm.backOverlayAsset} onChange={(e)=>setOptionForm({...optionForm,backOverlayAsset:e.target.value})}/></Field><Field label="Storage Type"><select className="input" value={optionForm.assetStorageType} onChange={(e)=>setOptionForm({...optionForm,assetStorageType:e.target.value as "LOCAL"|"REMOTE"})}><option value="LOCAL">Local Flutter asset</option><option value="REMOTE">Remote</option></select></Field><Field label="Display Order"><input className="input" type="number" value={optionForm.displayOrder} onChange={(e)=>setOptionForm({...optionForm,displayOrder:e.target.value})}/></Field><div className="space-y-2"><Check label="Default option" checked={optionForm.isDefault} onChange={(value)=>setOptionForm({...optionForm,isDefault:value})}/><Check label="Available" checked={optionForm.isAvailable} onChange={(value)=>setOptionForm({...optionForm,isAvailable:value})}/></div><Actions saving={saving} cancel={()=>setOptionOpen(false)} label="Save Option"/></form></Modal>}
    <input ref={imageInput} hidden type="file" accept={uploadTarget==="overlay"?".png":".jpg,.jpeg,.png"} onChange={(e)=>upload(e.target.files?.[0])}/>
  </div>;
}

function Badge({children}:{children:React.ReactNode}){return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{children}</span>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>}
function Check({label,checked,onChange}:{label:string;checked:boolean;onChange:(value:boolean)=>void}){return <label className="flex gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)}/>{label}</label>}
function ErrorText({children}:{children:React.ReactNode}){return <p className="md:col-span-2 rounded-xl bg-red-50 p-3 text-red-700">{children}</p>}
function Actions({saving,cancel,label}:{saving:boolean;cancel:()=>void;label:string}){return <div className="md:col-span-2 flex justify-end gap-3 border-t pt-5"><button type="button" onClick={cancel} className="rounded-xl border px-5 py-3">Cancel</button><button disabled={saving} className="rounded-xl bg-[#223943] px-6 py-3 font-bold text-white disabled:opacity-50">{saving?"Saving...":label}</button></div>}
function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"><div className="mx-auto my-5 max-w-3xl rounded-3xl bg-white shadow-2xl"><div className="flex justify-between rounded-t-3xl bg-[#223943] p-6 text-white"><h2 className="text-xl font-bold">{title}</h2><button onClick={close}><X/></button></div><div className="p-7">{children}</div></div></div>}
