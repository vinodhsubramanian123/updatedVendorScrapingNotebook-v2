import React from 'react';
import { TrendingUp, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function PriceTrendModal({ selectedSkuTrend, onClose, loadingHistory, realPriceTrail }) {
  if (!selectedSkuTrend) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              Historical Price Elasticity & Trend Trail
            </h3>
            <p className="text-xs mono text-slate-500">{selectedSkuTrend.sku || selectedSkuTrend.partNumber}</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loadingHistory ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">Loading price history...</div>
        ) : (
          <div className="h-64 w-full my-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={realPriceTrail}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={10} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="price" stroke="#D97706" strokeWidth={2} dot={{ fill: '#D97706' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <button onClick={onClose} className="w-full btn-secondary justify-center text-xs cursor-pointer">
          Close Price Chart
        </button>
      </div>
    </div>
  );
}
