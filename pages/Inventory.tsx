import React from 'react';
import { useStore } from '../context/Store';
import { Package, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const Inventory: React.FC = () => {
  const { products } = useStore();

  const data = products.map(p => ({ name: p.name, value: p.stock }));
  // First color replaced to #97c5a7
  const COLORS = ['#97c5a7', '#10b981', '#3b82f6', '#a855f7'];

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-white">Inventory System</h1>
            <p className="text-slate-400">Real-time stock tracking and valuation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((product) => (
                <div key={product.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${product.type === 'Brick' ? 'bg-brand-500/10 text-brand-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            <Package size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">{product.name}</h3>
                            <p className="text-xs text-slate-400">{product.type} • ₹{product.rate}/{product.unit}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-white">{product.stock.toLocaleString()}</p>
                        {product.stock < 3000 && (
                            <div className="flex items-center gap-1 text-xs text-red-400 justify-end mt-1">
                                <AlertTriangle size={10} /> Low Stock
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* Stock Distribution Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center">
            <h3 className="text-white font-semibold mb-4 w-full text-left">Stock Distribution</h3>
            <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                            itemStyle={{ color: '#f1f5f9' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 mt-4">
                {products.map((p, i) => (
                    <div key={p.id} className="flex justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                            {p.name}
                        </span>
                        <span>{((p.stock / products.reduce((a, b) => a + b.stock, 0)) * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;