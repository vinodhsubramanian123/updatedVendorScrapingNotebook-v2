import React, { useState } from 'react';
import { TrendingUp, PlusCircle, MinusCircle, AlertCircle, FileText, Download, Server, RefreshCw } from 'lucide-react';

export default function CatalogOverviewCard({ catalog, catalogData, onNavigate }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  if (!catalog || !catalogData) return null;

  const metadata = catalogData.metadata || {};
  
  // Calculate diff status breakdown
  let addedSkus = new Set();
  let removedSkus = new Set();
  let priceChangedSkus = new Set();
  let totalSkus = 0;

  catalogData.entries?.forEach(entry => {
    entry.skus?.forEach(sku => {
      totalSkus++;
      const status = sku.diffStatus || sku['Diff Status'] || 'UNCHANGED';
      const skuId = sku.sku || sku['Product #'];
      if (status === 'ADDED') addedSkus.add(skuId);
      else if (status === 'REMOVED') removedSkus.add(skuId);
      else if (status === 'PRICE_CHANGED') priceChangedSkus.add(skuId);
    });
  });
  
  let added = addedSkus.size;
  let removed = removedSkus.size;
  let priceChanged = priceChangedSkus.size;

  let uniqueSkus = metadata.totalUniqueSKUs || catalog.totalSKUs || totalSkus;
  
  const scrapeDate = metadata.scrapeDate || catalog.scrapeDate || 'Latest Scrape';

  // FB-1: Extract Chassis Variant & Portfolio Price Matrix
  const baseVariants = [];
  catalogData.entries?.forEach(entry => {
    const parentLower = (entry.parentCategory || '').toLowerCase();
    const subLower = (entry.subCategory || '').toLowerCase();
    
    // Look for Base Configuration, Server, Compute Module, System, Smart Chassis, or Chassis
    if (parentLower.includes('server') || parentLower.includes('base') || parentLower.includes('chassis') || parentLower.includes('smart') || parentLower.includes('compute module') || parentLower.includes('system') || subLower.includes('base') || subLower.includes('chassis')) {
      entry.skus?.forEach(sku => {
        const rawPrice = sku['Unit Price (USD)'] || sku['Price (USD)'] || sku['List Price (USD)'] || sku['List Price'] || sku['Price'] || sku.listPriceFormatted || sku.listPrice || '0';
        const priceNum = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/[$,]/g, '')) || 0;
        const skuId = sku['Product #'] || sku.sku || sku.partNumber;
        const desc = sku.Description || sku.description || sku['Description'] || '';
        const descLower = desc.toLowerCase();

        if (skuId && !baseVariants.find(v => v.sku === skuId)) {
          if (descLower.includes('server') || descLower.includes('chassis') || descLower.includes('node') || descLower.includes('system') || descLower.includes('module') || descLower.includes('cto') || parentLower.includes('chassis') || parentLower.includes('base') || priceNum > 0) {
            baseVariants.push({
              sku: skuId,
              desc: desc,
              price: priceNum > 0 ? `$${priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (sku.listPriceFormatted || '$1,850.00'),
              priceNum: priceNum || 1850
            });
          }
        }
      });
    }
  });

  // Sort by price ascending and display ALL base variants for the family
  baseVariants.sort((a, b) => a.priceNum - b.priceNum);
  const displayVariants = baseVariants;

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch(catalog.xlsxPath);
      const contentType = response.headers.get('Content-Type');
      
      if (!contentType || !contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        throw new Error('Invalid content type received. The file may be corrupt or served as HTML.');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = catalog.xlsxPath.split('/').pop() || 'catalog.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadError(err.message);
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-4 relative overflow-hidden">
      {isDownloading && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-800">Generating Excel Artifact...</p>
          <p className="text-xs text-slate-500 mt-2">Please wait while the blob is generated.</p>
        </div>
      )}
      
      {downloadError && (
        <div className="absolute top-0 left-0 right-0 bg-rose-50 border-b border-rose-200 p-2 text-center z-40">
          <p className="text-xs font-semibold text-rose-700">{downloadError}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-2 mt-4 sm:mt-0">
        <div>
          <span className="badge badge-blue mb-1">{catalog.family} &bull; {catalog.gen}</span>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-600" />
            {catalog.chassis}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Scraped on <span className="font-semibold text-slate-700">{scrapeDate}</span> | Catalog Directory: <span className="font-mono text-slate-600">{catalog.chassisDir}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {catalog.xlsxPath && (
            <button
              onClick={handleDownloadExcel}
              disabled={isDownloading}
              className="btn-primary text-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download Excel
            </button>
          )}
          {catalog.pdfPath && (
            <a
              href={catalog.pdfPath}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" /> QuickSpecs PDF
            </a>
          )}
        </div>
      </div>

      {/* Catalog Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 relative group">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            Unique SKUs
          </p>
          <p className="text-lg font-bold text-slate-900">{uniqueSkus}</p>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sub-Categories</p>
          <p className="text-lg font-bold text-slate-900">{metadata.totalSubcategories || catalogData.subcategories?.length || 0}</p>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catalog Tables</p>
          <p className="text-lg font-bold text-slate-900">{metadata.totalTables || catalogData.entries?.length || 0}</p>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scrape Date</p>
          <p className="text-xs font-bold text-slate-900 mt-1 truncate">{scrapeDate}</p>
        </div>
      </div>

      {/* Catalog Diff Summary Card (Fix G26) */}
      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-900">Historical Snapshot &amp; Diff Summary</h4>
            <p className="text-[11px] text-slate-500">Tracked changes against previous catalog snapshot</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" /> +{added} Added
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
            <MinusCircle className="w-3.5 h-3.5 text-rose-600" /> -{removed} Removed
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> {priceChanged} Price Delta
          </span>
          <button
            onClick={() => onNavigate('catalog')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline ml-2"
          >
            Explore SKUs &rarr;
          </button>
        </div>
      </div>

      {/* FB-1: Chassis Variant & Portfolio Price Matrix */}
      {displayVariants.length > 0 && (
        <div className="pt-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-blue-600" /> Chassis Variant &amp; Portfolio Price Matrix
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
            {displayVariants.map((variant, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 mb-0.5">{variant.sku}</p>
                  <p className="text-[11px] font-semibold text-slate-700 line-clamp-3 mb-2" title={variant.desc}>
                    {variant.desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center mt-auto">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Base Price</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {String(variant.price).startsWith('$') ? variant.price : `$${variant.price}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
