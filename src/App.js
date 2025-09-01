import React, { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Package, Upload, Download, Pencil, Trash2, Layers, AlertTriangle, Home, FileText, Settings, Save, RefreshCcw } from "lucide-react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

/*********************************
 * Firebase Initialization
 *********************************/
const firebaseConfig = {
  apiKey: "AIzaSyDGVeI8p4D3YF5UsJBPsSkmTSlt25KOMgs",
  authDomain: "stock-management-eae2b.firebaseapp.com",
  projectId: "stock-management-eae2b",
  storageBucket: "stock-management-eae2b.firebasestorage.app",
  messagingSenderId: "155573704727",
  appId: "1:155573704727:web:88842103e4f594e995a452",
  measurementId: "G-4KNYLFZ1Y5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/*********************************
 * Utilities
 *********************************/
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = new Intl.NumberFormat();
const currency = (v) => (isFinite(v) ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(v) : "—");
const todayISO = () => new Date().toISOString().slice(0,10);

/*********************************
 * Firestore Helpers
 *********************************/
async function fetchProducts() {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function fetchMoves() {
  const snap = await getDocs(collection(db, "movements"));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function saveProduct(product) {
  if (!product.id) {
    const docRef = await addDoc(collection(db, "products"), product);
    return { ...product, id: docRef.id };
  } else {
    await updateDoc(doc(db, "products", product.id), product);
    return product;
  }
}

async function removeProduct(id) {
  await deleteDoc(doc(db, "products", id));
}

async function saveMove(move) {
  const docRef = await addDoc(collection(db, "movements"), move);
  return { ...move, id: docRef.id };
}

/*********************************
 * Data Computation Helpers
 *********************************/
function computeStockByProduct(products, moves) {
  const map = Object.fromEntries(products.map(p => [p.id, 0]));
  for (const m of moves) {
    if (!(m.productId in map)) continue;
    map[m.productId] += m.type === 'in' ? m.qty : -m.qty;
  }
  return map;
}

function lastNDaysData(moves, days=30) {
  const today = new Date();
  const buckets = [];
  for (let i = days-1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0,10);
    buckets.push({ date: key, IN: 0, OUT: 0 });
  }
  const idx = Object.fromEntries(buckets.map((b,i)=>[b.date,i]));
  for (const m of moves) {
    if (m.date in idx) {
      const b = buckets[idx[m.date]];
      if (m.type==='in') b.IN += m.qty; else b.OUT += m.qty;
    }
  }
  return buckets;
}

/*********************************
 * Page Shell & Navigation
 *********************************/
const PageShell = ({ children, onReset, current, setCurrent }) => (
  <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <Layers className="w-6 h-6" />
        <h1 className="text-xl font-semibold">Stock Management (Firestore)</h1>
        <nav className="ml-auto flex gap-1 flex-wrap">
          <NavBtn icon={<Home className="w-4 h-4" />} label="Dashboard" active={current==='dashboard'} onClick={()=>setCurrent('dashboard')} />
          <NavBtn icon={<Package className="w-4 h-4" />} label="Products" active={current==='products'} onClick={()=>setCurrent('products')} />
          <NavBtn icon={<Upload className="w-4 h-4" />} label="Stock In" active={current==='in'} onClick={()=>setCurrent('in')} />
          <NavBtn icon={<Download className="w-4 h-4" />} label="Stock Out" active={current==='out'} onClick={()=>setCurrent('out')} />
          <NavBtn icon={<FileText className="w-4 h-4" />} label="Reports" active={current==='reports'} onClick={()=>setCurrent('reports')} />
          <button onClick={onReset} className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm hover:bg-slate-50">
            <Settings className="w-4 h-4"/> Reset Data
          </button>
        </nav>
      </div>
    </header>
    <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    <footer className="max-w-7xl mx-auto px-4 pt-2 pb-8 text-xs text-slate-500">Data stored in Firestore. © {new Date().getFullYear()}</footer>
  </div>
);

const NavBtn = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition ${active? 'bg-slate-900 text-white border-slate-900':'hover:bg-slate-50'}`}>
    {icon} {label}
  </button>
);

/*********************************
 * Dashboard
 *********************************/
function Dashboard({ products, moves }) {
  const stockMap = useMemo(()=>computeStockByProduct(products, moves), [products, moves]);
  const totals = useMemo(()=>{
    const totalProducts = products.length;
    const totalQty = Object.values(stockMap).reduce((a,b)=>a+b,0);
    const low = products.filter(p => (stockMap[p.id]||0) <= p.minStock).length;
    return { totalProducts, totalQty, low };
  }, [products, stockMap]);

  const chartData = useMemo(()=> lastNDaysData(moves, 30), [moves]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5"/>
          <div>
            <div className="text-slate-500 text-sm">Products</div>
            <div className="text-2xl font-semibold">{fmt.format(totals.totalProducts)}</div>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5"/>
          <div>
            <div className="text-slate-500 text-sm">Total Qty</div>
            <div className="text-2xl font-semibold">{fmt.format(totals.totalQty)}</div>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5"/>
          <div>
            <div className="text-slate-500 text-sm">Low stock</div>
            <div className="text-2xl font-semibold">{fmt.format(totals.low)}</div>
          </div>
        </div>
      </Card>
      <div className="md:col-span-3">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Last 30 days – Stock Movement</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{fontSize:12}} interval={4} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="IN" />
                <Bar dataKey="OUT" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold mb-3">Low-stock Alerts</h3>
          <LowStockList products={products} stockMap={stockMap} />
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Recent Movements</h3>
          <RecentMoves moves={moves} products={products} />
        </Card>
      </div>
    </div>
  );
}

const LowStockList = ({ products, stockMap }) => {
  const items = products
    .map(p=>({p, qty: stockMap[p.id]||0}))
    .filter(({p, qty}) => qty <= p.minStock)
    .sort((a,b)=> (a.qty - a.p.minStock) - (b.qty - b.p.minStock));
  if (items.length===0) return <div className="text-sm text-slate-500">All good — no items at or below minimum stock.</div>;
  return (
    <ul className="divide-y">
      {items.map(({p, qty}) => (
        <li key={p.id} className="py-2 flex items-center justify-between">
          <div>
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-slate-500">SKU {p.sku} · Min {p.minStock} {p.unit}</div>
          </div>
          <div className={`text-sm px-2 py-1 rounded-lg ${qty<=0? 'bg-red-50 text-red-700 border border-red-200':'bg-amber-50 text-amber-800 border border-amber-200'}`}>{qty} {p.unit}</div>
        </li>
      ))}
    </ul>
  );
};

const RecentMoves = ({ moves, products }) => {
  const pmap = Object.fromEntries(products.map(p => [p.id, p]));
  const recent = [...moves].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  if (recent.length === 0) return <div className="text-sm text-slate-500">No movements yet.</div>;
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-2">Date</th>
            <th>Type</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Party</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {recent.map(m => (
            <tr key={m.id}>
              <td className="py-2">{m.date}</td>
              <td className={m.type === 'in' ? 'text-green-700' : 'text-sky-700'}>{m.type.toUpperCase()}</td>
              <td>{pmap[m.productId]?.name || '—'}</td>
              <td>{fmt.format(m.qty)}</td>
              <td>{m.party || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/*********************************
 * Products Page
 *********************************/
function ProductsPage({ products, setProducts, moves }) {
  const stockMap = useMemo(() => computeStockByProduct(products, moves), [products, moves]);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");

  const filtered = products.filter(p =>
    [p.name, p.sku, p.category].some(s => s.toLowerCase().includes(query.toLowerCase()))
  );

  const upsertProduct = async (prod) => {
    const saved = await saveProduct(prod);
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next;
      }
      return [...prev, saved];
    });
    setEditing(null);
  };

  const removeProductHandler = async (id) => {
    if (!window.confirm("Delete this product? Movements remain but product reference will be lost.")) return;
    await removeProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold">Products</h3>
            <span className="ml-auto"></span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, SKU, category..." className="border rounded-xl px-3 py-2 text-sm w-64" />
            <button onClick={() => setEditing({ id: "", name: "", sku: "", category: "", unit: "pcs", cost: 0, price: 0, minStock: 0, createdAt: new Date().toISOString() })} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm">
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Name</th>
                  <th>SKU</th>
                  <th>Cat.</th>
                  <th>Stock</th>
                  <th>Min</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td className="py-2">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">Added {new Date(p.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td>{p.sku}</td>
                    <td>{p.category}</td>
                    <td>{fmt.format(stockMap[p.id] || 0)} {p.unit}</td>
                    <td>{fmt.format(p.minStock)}</td>
                    <td>{currency(p.cost)}</td>
                    <td>{currency(p.price)}</td>
                    <td className="text-right">
                      <button onClick={() => setEditing(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border mr-2"><Pencil className="w-4 h-4" /> Edit</button>
                      <button onClick={() => removeProductHandler(p.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-red-600"><Trash2 className="w-4 h-4" /> Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <div>
        <Card>
          <h3 className="font-semibold mb-2">{editing ? 'Product Details' : 'Tips'}</h3>
          {editing ? (
            <ProductForm key={editing.id} initial={editing} onCancel={() => setEditing(null)} onSave={upsertProduct} />
          ) : (
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
              <li>Use <b>Search</b> to quickly filter by name, SKU, or category.</li>
              <li>Set a sensible <b>Min Stock</b> for alerting on the dashboard.</li>
              <li>Prices are optional but unlock margin insights in reports.</li>
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/*********************************
 * Product Form
 *********************************/
function ProductForm({ initial, onSave, onCancel }) {
  const [p, setP] = useState(initial);
  const set = (k, v) => setP(prev => ({ ...prev, [k]: v }));
  const valid = p.name.trim() && p.sku.trim() && p.unit.trim();
  return (
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (valid) onSave({ ...p, cost: +p.cost || 0, price: +p.price || 0, minStock: Math.max(0, Math.floor(+p.minStock || 0)) }); }}>
      <InputRow label="Name" value={p.name} onChange={v => set('name', v)} required />
      <InputRow label="SKU / Code" value={p.sku} onChange={v => set('sku', v)} required />
      <InputRow label="Category" value={p.category} onChange={v => set('category', v)} />
      <InputRow label="Unit" value={p.unit} onChange={v => set('unit', v)} placeholder="pcs, box, kg…" required />
      <div className="grid grid-cols-2 gap-2">
        <InputRow label="Cost Price" type="number" step="0.01" value={p.cost} onChange={v => set('cost', v)} />
        <InputRow label="Selling Price" type="number" step="0.01" value={p.price} onChange={v => set('price', v)} />
      </div>
      <InputRow label="Min Stock" type="number" value={p.minStock} onChange={v => set('minStock', v)} />
      <div className="flex gap-2 pt-2">
        <button className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ${valid ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`} disabled={!valid}>
          <Save className="w-4 h-4" /> Save
        </button>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border">Cancel</button>
      </div>
    </form>
  );
}

const InputRow = ({ label, value, onChange, type = "text", placeholder, step, required }) => (
  <label className="block text-sm">
    <span className="text-slate-600">{label} {required && <span className="text-red-600">*</span>}</span>
    <input type={type} step={step} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="mt-1 w-full border rounded-xl px-3 py-2" required={required} />
  </label>
);

/*********************************
 * Stock In / Out Page
 *********************************/
function StockPage({ type, products, setMoves }) {
  const submitHandler = async (m) => {
    const saved = await saveMove(m);
    setMoves(prev => [...prev, saved]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <h3 className="font-semibold mb-2">{type === 'in' ? 'Add Stock' : 'Remove Stock'}</h3>
        {products.length === 0 ? (
          <div className="text-sm text-slate-600">Add products first.</div>
        ) : (
          <StockForm type={type} products={products} onSubmit={submitHandler} />
        )}
      </Card>
      <Card>
        <h3 className="font-semibold mb-2">Tips</h3>
        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
          <li>Quantities are integers. Negative quantities are not allowed.</li>
          <li>Use accurate dates for reports and charting.</li>
          <li>Unit price is optional; leave blank if not needed.</li>
        </ul>
      </Card>
    </div>
  );
}

function StockForm({ type, products, onSubmit }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(todayISO());
  const [party, setParty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const q = Math.max(1, Math.floor(+qty || 0));
    if (!productId || !q) return;
    onSubmit({ id: uid(), type, productId, qty: q, date, party: party.trim() || undefined, unitPrice: unitPrice === "" ? undefined : +unitPrice });
    setQty(""); setParty(""); setUnitPrice("");
  };

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div>
        <label className="block text-sm">Product</label>
        <select value={productId} onChange={e => setProductId(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2">
          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
        </select>
      </div>
      <InputRow label="Quantity" type="number" value={qty} onChange={setQty} required />
      <InputRow label="Date" type="date" value={date} onChange={setDate} required />
      <InputRow label="Party / Supplier" value={party} onChange={setParty} />
      <InputRow label="Unit Price" type="number" step="0.01" value={unitPrice} onChange={setUnitPrice} />
      <button type="submit" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white">
        <Save className="w-4 h-4" /> Save
      </button>
    </form>
  );
}

/*********************************
 * Reports Page
 *********************************/
function ReportsPage({ products, moves }) {
  const stockMap = useMemo(() => computeStockByProduct(products, moves), [products, moves]);
  const totalValue = products.reduce((sum, p) => sum + (stockMap[p.id] || 0) * (p.cost || 0), 0);
  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <h3 className="font-semibold mb-3">Stock Summary</h3>
        <div className="text-sm text-slate-600">Total products: {products.length}, Total value: {currency(totalValue)}</div>
        <div className="overflow-auto mt-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th>Name</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Unit Cost</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{stockMap[p.id] || 0} {p.unit}</td>
                  <td>{currency(p.cost)}</td>
                  <td>{currency((stockMap[p.id] || 0) * (p.cost || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/*********************************
 * Card Component
 *********************************/
const Card = ({ children }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">{children}</div>
);

/*********************************
 * Main App
 *********************************/
export default function App() {
  const [products, setProducts] = useState([]);
  const [moves, setMoves] = useState([]);
  const [current, setCurrent] = useState('dashboard');

  useEffect(() => { fetchProducts().then(setProducts); fetchMoves().then(setMoves); }, []);

  const resetData = async () => {
    if (!window.confirm("This will delete all Firestore data. Continue?")) return;
    for (const p of products) await removeProduct(p.id);
    // Note: movements cleanup is manual here, could implement batch delete
    setProducts([]); setMoves([]);
  };

  return (
    <PageShell current={current} setCurrent={setCurrent} onReset={resetData}>
      {current === 'dashboard' && <Dashboard products={products} moves={moves} />}
      {current === 'products' && <ProductsPage products={products} setProducts={setProducts} moves={moves} />}
      {current === 'in' && <StockPage type="in" products={products} setMoves={setMoves} />}
      {current === 'out' && <StockPage type="out" products={products} setMoves={setMoves} />}
      {current === 'reports' && <ReportsPage products={products} moves={moves} />}
    </PageShell>
  );
}