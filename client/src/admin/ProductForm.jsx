import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Upload, ArrowUp } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Field from '../components/Field';
import Img from '../components/Img';
import Spinner from '../components/Spinner';

const PRESETS = {
  Apparel: ['XS', 'S', 'M', 'L', 'XL'],
  Waist: ['28', '30', '32', '34', '36'],
  Shoes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
  'Free size': ['Free Size'],
};
const EMPTY = {
  name: '', description: '', details: '', price: '', discountPrice: '', gender: 'women', category: '', hsn: '',
  images: [], sizes: [{ name: 'S', stock: 10 }, { name: 'M', stock: 10 }, { name: 'L', stock: 10 }], colors: [{ name: 'Black', hex: '#000000' }],
  isNewArrival: false, isBestSeller: false, isTrending: false, isActive: true,
};

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);
  const colorFileRef = useRef(null);
  const colorTarget = useRef(null);
  const [v, setV] = useState(id ? null : EMPTY);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/categories?all=true').then((d) => {
      setCategories(d.categories);
      if (!id) setV((s) => ({ ...s, category: s.category || d.categories[0]?._id || '' }));
    });
    if (id) {
      api(`/products/${id}`).then(({ product: p }) => setV({
        ...p,
        category: p.category._id,
        details: (p.details || []).join('\n'),
        discountPrice: p.discountPrice ?? '',
        hsn: p.hsn || '',
      })).catch((e) => toast(e.message, 'error'));
    }
  }, [id, toast]);

  if (!v) return <Spinner />;
  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setRow = (k, i, field, value) => setV({ ...v, [k]: v[k].map((r, j) => (j === i ? { ...r, [field]: value } : r)) });

  const upload = async (files) => {
    if (!files?.length) return;
    const form = new FormData();
    [...files].forEach((f) => form.append('images', f));
    setUploading(true);
    try {
      const d = await api('/admin/uploads', { method: 'POST', form });
      setV((s) => ({ ...s, images: [...s.images, ...d.urls] }));
      toast(`${d.urls.length} image${d.urls.length > 1 ? 's' : ''} uploaded`);
    } catch (e) { toast(e.message, 'error'); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const uploadColor = async (files) => {
    if (!files?.length || colorTarget.current === null) return;
    const form = new FormData();
    [...files].forEach((f) => form.append('images', f));
    setUploading(true);
    try {
      const d = await api('/admin/uploads', { method: 'POST', form });
      const i = colorTarget.current;
      setV((s) => ({ ...s, colors: s.colors.map((c, j) => (j === i ? { ...c, images: [...(c.images || []), ...d.urls] } : c)) }));
      toast('Colour photos uploaded');
    } catch (e) { toast(e.message, 'error'); } finally { setUploading(false); if (colorFileRef.current) colorFileRef.current.value = ''; }
  };

  const addUrl = () => {
    const url = imageUrl.trim();
    if (!/^https?:\/\/.+/i.test(url)) { setErrors({ ...errors, images: 'Enter a full image URL starting with http(s)://' }); return; }
    setV({ ...v, images: [...v.images, url] });
    setImageUrl('');
    setErrors({ ...errors, images: '' });
  };

  const validate = () => {
    const e = {};
    if (v.name.trim().length < 2) e.name = 'Name is required';
    if (v.description.trim().length < 10) e.description = 'Write at least 10 characters';
    if (!(Number(v.price) > 0)) e.price = 'Enter a price above 0';
    if (v.discountPrice !== '' && Number(v.discountPrice) >= Number(v.price)) e.discountPrice = 'Sale price must be lower than the price';
    if (!v.category) e.category = 'Choose a category';
    if (!v.images.length) e.images = 'Add at least one image';
    const sizes = v.sizes.filter((s) => s.name.trim());
    if (!sizes.length) e.sizes = 'Add at least one size';
    else if (new Set(sizes.map((s) => s.name.trim())).size !== sizes.length) e.sizes = 'Each size can only be listed once';
    else if (sizes.some((s) => !(Number(s.stock) >= 0))) e.sizes = 'Stock must be 0 or more';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) { toast('Fix the highlighted fields', 'error'); return; }
    setSaving(true);
    const body = {
      ...v,
      price: Number(v.price),
      discountPrice: v.discountPrice === '' ? null : Number(v.discountPrice),
      details: v.details.split('\n').map((d) => d.trim()).filter(Boolean),
      sizes: v.sizes.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), stock: Number(s.stock) })),
      colors: v.colors.filter((c) => c.name.trim()),
    };
    try {
      await api(id ? `/admin/products/${id}` : '/admin/products', { method: id ? 'PUT' : 'POST', body });
      toast(id ? 'Product updated' : 'Product created');
      navigate('/admin/products');
    } catch (err) {
      setErrors(err.details || {});
      toast(err.message, 'error');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={save} noValidate className="max-w-4xl">
      <Link to="/admin/products" className="btn-ghost">All products</Link>
      <h1 className="mt-3 text-4xl">{id ? 'Edit product' : 'Add product'}</h1>

      <section className="mt-8 grid gap-5 bg-paper p-6 sm:grid-cols-2">
        <Field label="Name" name="name" value={v.name} onChange={set('name')} error={errors.name} className="sm:col-span-2" />
        <Field label="Description" name="description" as="textarea" rows={4} value={v.description} onChange={set('description')} error={errors.description} className="sm:col-span-2" />
        <Field label="Details and care (one per line)" name="details" as="textarea" rows={4} value={v.details} onChange={set('details')} className="sm:col-span-2" />
        <Field label="Price (₹)" name="price" type="number" min="1" value={v.price} onChange={set('price')} error={errors.price} />
        <Field label="Sale price (₹, optional)" name="discountPrice" type="number" min="0" value={v.discountPrice} onChange={set('discountPrice')} error={errors.discountPrice} />
        <Field label="Collection" name="gender" as="select" value={v.gender} onChange={set('gender')}>
          <option value="women">Women</option><option value="men">Men</option><option value="unisex">Unisex</option>
        </Field>
        <Field label="Category" name="category" as="select" value={v.category} onChange={set('category')} error={errors.category}>
          <option value="">Choose a category</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Field>
        <Field label={`GST HSN code (optional, overrides the category's${categories.find((c) => c._id === v.category)?.hsn ? ` ${categories.find((c) => c._id === v.category).hsn}` : ''})`} name="hsn" inputMode="numeric" maxLength={8} value={v.hsn} onChange={(e) => setV({ ...v, hsn: e.target.value.replace(/\D/g, '') })} />
      </section>

      <section className="mt-6 bg-paper p-6">
        <h2 className="font-sans text-base font-medium">Images</h2>
        <p className="text-xs text-stone">The first image is the main photo. JPG, PNG, WEBP or AVIF up to 5 MB.</p>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {v.images.map((src, i) => (
            <div key={src + i} className="relative">
              <Img src={src} alt={`Image ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/60 text-paper">
                <button type="button" disabled={i === 0} className="p-1.5 disabled:opacity-30" aria-label="Make main image" onClick={() => setV({ ...v, images: [src, ...v.images.filter((_, j) => j !== i)] })}><ArrowUp size={14} /></button>
                <button type="button" className="p-1.5" aria-label="Remove image" onClick={() => setV({ ...v, images: v.images.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          <button type="button" className="btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload size={14} /> {uploading ? 'Uploading…' : 'Upload images'}</button>
          <div className="flex min-w-[260px] flex-1">
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Or paste an image URL" className="input py-2" aria-label="Image URL" />
            <button type="button" className="btn btn-sm" onClick={addUrl}>Add</button>
          </div>
        </div>
        {errors.images && <p className="field-error">{errors.images}</p>}
      </section>

      <section className="mt-6 grid gap-6 bg-paper p-6 md:grid-cols-2">
        <div>
          <h2 className="font-sans text-base font-medium">Sizes and stock</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {Object.entries(PRESETS).map(([label, names]) => (
              <button key={label} type="button" className="chip py-1" onClick={() => setV({ ...v, sizes: names.map((n) => ({ name: n, stock: v.sizes.find((s) => s.name === n)?.stock ?? 10 })) })}>{label}</button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {v.sizes.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input value={s.name} onChange={(e) => setRow('sizes', i, 'name', e.target.value)} placeholder="Size" className="input py-2" aria-label="Size name" />
                <input type="number" min="0" value={s.stock} onChange={(e) => setRow('sizes', i, 'stock', e.target.value)} className="input w-28 py-2" aria-label={`Stock for ${s.name}`} />
                <button type="button" onClick={() => setV({ ...v, sizes: v.sizes.filter((_, j) => j !== i) })} className="p-2 text-stone hover:text-sale" aria-label="Remove size"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-ghost mt-3" onClick={() => setV({ ...v, sizes: [...v.sizes, { name: '', stock: 0 }] })}><Plus size={14} /> Add size</button>
          {errors.sizes && <p className="field-error">{errors.sizes}</p>}
        </div>
        <div>
          <h2 className="font-sans text-base font-medium">Colours</h2>
          <p className="text-xs text-stone">Optional: add photos of the product in each colour. Shoppers see them when they pick that colour.</p>
          <div className="mt-3 space-y-4">
            {v.colors.map((c, i) => (
              <div key={i} className="border-b border-ink/10 pb-4">
                <div className="flex gap-2">
                  <input type="color" value={c.hex} onChange={(e) => setRow('colors', i, 'hex', e.target.value)} className="h-10 w-12 cursor-pointer border border-ink/20 bg-white" aria-label="Colour swatch" />
                  <input value={c.name} onChange={(e) => setRow('colors', i, 'name', e.target.value)} placeholder="Colour name" className="input py-2" aria-label="Colour name" />
                  <button type="button" onClick={() => setV({ ...v, colors: v.colors.filter((_, j) => j !== i) })} className="p-2 text-stone hover:text-sale" aria-label="Remove colour"><Trash2 size={16} /></button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(c.images || []).map((src, k) => (
                    <div key={src + k} className="relative">
                      <Img src={src} alt={`${c.name} ${k + 1}`} className="h-16 w-12 object-cover" />
                      <button type="button" className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-0.5 text-paper" aria-label="Remove photo" onClick={() => setRow('colors', i, 'images', c.images.filter((_, j) => j !== k))}><Trash2 size={10} /></button>
                    </div>
                  ))}
                  <button type="button" className="btn-ghost text-xs" onClick={() => { colorTarget.current = i; colorFileRef.current?.click(); }} disabled={uploading}><Upload size={12} /> Upload {c.name || 'colour'} photos</button>
                  <button type="button" className="btn-ghost text-xs" onClick={() => { const url = window.prompt('Paste an image URL (https://…)'); if (url && /^https?:\/\/\S+$/i.test(url.trim())) setRow('colors', i, 'images', [...(c.images || []), url.trim()]); }}>Add URL</button>
                </div>
              </div>
            ))}
          </div>
          <input ref={colorFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => uploadColor(e.target.files)} />
          <button type="button" className="btn-ghost mt-3" onClick={() => setV({ ...v, colors: [...v.colors, { name: '', hex: '#D8CFC2' }] })}><Plus size={14} /> Add colour</button>
        </div>
      </section>

      <section className="mt-6 flex flex-wrap gap-6 bg-paper p-6 text-sm">
        {[['isActive', 'Visible in store'], ['isNewArrival', 'New arrival'], ['isBestSeller', 'Best seller'], ['isTrending', 'Trending']].map(([k, label]) => (
          <label key={k} className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-ink" checked={v[k]} onChange={set(k)} /> {label}</label>
        ))}
      </section>

      <div className="mt-6 flex gap-3">
        <button className="btn" disabled={saving}>{saving ? 'Saving…' : id ? 'Save changes' : 'Create product'}</button>
        <Link to="/admin/products" className="btn-outline">Cancel</Link>
      </div>
    </form>
  );
}
