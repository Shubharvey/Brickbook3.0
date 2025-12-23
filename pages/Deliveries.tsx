import React from 'react';
import { useStore } from '../context/Store';
import { DeliveryStatus } from '../types';
import { Truck, MapPin, Clock, CheckCircle } from 'lucide-react';

const Deliveries: React.FC = () => {
  const { deliveries, updateDeliveryStatus } = useStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Delivery Tracking</h1>
        <p className="text-slate-400">Monitor fleet and order dispatch.</p>
      </div>

      <div className="space-y-4">
        {deliveries.map((delivery) => (
          <div key={delivery.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors hover:border-slate-700">
             <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full border-2 ${
                    delivery.status === DeliveryStatus.DELIVERED ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 
                    delivery.status === DeliveryStatus.SCHEDULED ? 'border-blue-500/30 bg-blue-500/10 text-blue-500' : 
                    'border-slate-700 bg-slate-800 text-slate-400'
                }`}>
                    <Truck size={20} />
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-white text-lg">{delivery.customerName}</h3>
                        <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-400 border border-slate-700">Ord: #{delivery.saleId}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1"><MapPin size={14} /> {delivery.address}</span>
                        {delivery.truckNumber && <span className="flex items-center gap-1"><Truck size={14} /> {delivery.truckNumber}</span>}
                        <span className="flex items-center gap-1"><Clock size={14} /> {delivery.date}</span>
                    </div>
                </div>
             </div>

             <div className="flex items-center gap-3 w-full md:w-auto">
                {delivery.status !== DeliveryStatus.DELIVERED && (
                    <select 
                        className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-500"
                        value={delivery.status}
                        onChange={(e) => updateDeliveryStatus(delivery.id, e.target.value as DeliveryStatus)}
                    >
                        <option value={DeliveryStatus.PENDING}>Pending</option>
                        <option value={DeliveryStatus.SCHEDULED}>In Transit</option>
                        <option value={DeliveryStatus.DELIVERED}>Delivered</option>
                    </select>
                )}
                {delivery.status === DeliveryStatus.DELIVERED && (
                    <div className="flex items-center gap-2 text-emerald-500 font-medium bg-emerald-500/10 px-4 py-2 rounded-lg">
                        <CheckCircle size={16} /> Completed
                    </div>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Deliveries;