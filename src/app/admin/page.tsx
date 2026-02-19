//src/app/admin/page.tsx
"use client";


// In admin dashboard header:
import LogoutButton from "@/components/LogoutButton";
import ProtectedRoute from "@/components/ProtectedRoute";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getQuotes, getAllPartners, deleteQuote, type Quote, type Partner } from "@/lib/supabase";

export default function AdminDashboard() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartner]);

  const loadData = async () => {
    setLoading(true);
    const [quotesData, partnersData] = await Promise.all([
      getQuotes(selectedPartner || undefined),
      getAllPartners()
    ]);
    setQuotes(quotesData);
    setPartners(partnersData);
    setLoading(false);
  };

  const handleDelete = async (id: string, quoteNumber: string) => {
    if (!confirm(`Delete quote ${quoteNumber}? This cannot be undone.`)) return;
    const success = await deleteQuote(id);
    if (success) {
      alert("Quote deleted");
      loadData();
    }
  };

  const stats = {
    total: quotes.length,
    totalValue: quotes.reduce((sum, q) => sum + q.final_total, 0),
    byPartner: partners.map(p => ({
      name: p.company_name,
      count: quotes.filter(q => q.partner_id === p.partner_code).length,
      value: quotes
        .filter(q => q.partner_id === p.partner_code)
        .reduce((sum, q) => sum + q.final_total, 0)
    }))
  };

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">View and manage all quotes across all partners</p>
          </div>
          <div className="flex gap-4 items-start">
            <Link
              href="/admin/partners"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-colors font-medium"
            >
              🏢 Manage Partners
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Quotes</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              ${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Partners</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{partners.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">By Partner</h2>
          <div className="space-y-3">
            {stats.byPartner.map((p, i) => (
              <div key={i} className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">{p.name}</span>
                <div className="text-right">
                  <span className="text-sm text-gray-600">{p.count} quotes</span>
                  <span className="text-sm text-gray-600 ml-4">
                    ${p.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8 relative z-10">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Partner
          </label>
          <select
            value={selectedPartner}
            onChange={(e) => setSelectedPartner(e.target.value)}
            className="w-full md:w-64 p-2 border border-gray-300 rounded relative z-10"
          >
            <option value="">All Partners</option>
            {partners.map(p => (
              <option key={p.partner_code} value={p.partner_code}>
                {p.company_name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">All Quotes</h2>
            
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : quotes.length === 0 ? (
              <p className="text-gray-500">No quotes found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotes.map((quote) => (
                      <tr key={quote.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {quote.quote_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {quote.customer_company || quote.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {quote.partner_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${quote.final_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(quote.created_at!).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => {
                              console.log('Clicked View Details for:', quote);
                              setDetailQuote(quote);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleDelete(quote.id!, quote.quote_number)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {detailQuote && (
        <QuoteDetailModal 
          quote={detailQuote} 
          onClose={() => setDetailQuote(null)} 
        />
      )}
    </div>
    </ProtectedRoute>
  );
}

interface ModelPriceStructure {
  system: number;
  ship: number;
  pad: number;
  mobility: number;
  warranty5: number;
  warranty8: number;
}

interface QuoteDetailModalProps {
  quote: Quote;
  onClose: () => void;
}

function QuoteDetailModal({ quote, onClose }: QuoteDetailModalProps) {
  const config = quote.quote_config;
  const pricing = quote.partner_pricing || {};

  // Use saved pricing from the quote with proper typing
  const modelPrices: Record<string, ModelPriceStructure> = (pricing.modelPrices as Record<string, ModelPriceStructure>) || {};
  const tankPrices: Record<string, number> = (pricing.tankPrices as Record<string, number>) || {};
  const tankPads: Record<string, number> = (pricing.tankPads as Record<string, number>) || {};
  const cityDelivery: Record<string, number> = (pricing.cityDelivery as Record<string, number>) || {};
  const sensorPrices: Record<string, number> = (pricing.sensorPrices as Record<string, number>) || {};
  const filterPrices: Record<string, number> = (pricing.filterPrices as Record<string, number>) || {};
  const pumpPrices: Record<string, number> = (pricing.pumpPrices as Record<string, number>) || {};
  const trenchRates: Record<string, number> = (pricing.trenchRates as Record<string, number>) || {};
  const ab_trenchRates: Record<string, number> = (pricing.ab_trenchRates as Record<string, number>) || {};
  const fees = (pricing.fees as {
    admin: number;
    commission: number;
    aquariaManagement: number;
    disposal: number;
    net30: number;
  }) || {
    admin: 500,
    commission: 2500,
    aquariaManagement: 500,
    disposal: 200,
    net30: 100,
  };

  // Calculate breakdown with unit cost
  const breakdown: { 
    item: string; 
    quantity?: number | string; 
    unitCost?: number; 
    cost: number 
  }[] = [];

  // Model
  if (config.model && modelPrices[config.model]) {
    const modelPrice = modelPrices[config.model];
    breakdown.push({ 
      item: `Hydropack ${config.model.toUpperCase()} - System`, 
      unitCost: modelPrice.system || 0,
      cost: modelPrice.system || 0 
    });
    breakdown.push({ 
      item: `Hydropack ${config.model.toUpperCase()} - Shipping`, 
      unitCost: modelPrice.ship || 0,
      cost: modelPrice.ship || 0 
    });
    if (config.mobility) {
      breakdown.push({ 
        item: 'Mobility Assistance', 
        unitCost: modelPrice.mobility || 0,
        cost: modelPrice.mobility || 0 
      });
    }
    if (config.unitPad) {
      breakdown.push({ 
        item: 'Unit Concrete Pad', 
        unitCost: modelPrice.pad || 0,
        cost: modelPrice.pad || 0 
      });
    }
  }

  // Tank
  if (config.tank) {
    const tankCost = tankPrices[config.tank] || 0;
    breakdown.push({ 
      item: `${config.tank} Gallon Tank`, 
      unitCost: tankCost,
      cost: tankCost 
    });
    if (config.city && cityDelivery[config.city]) {
      const deliveryCost = cityDelivery[config.city];
      breakdown.push({ 
        item: `Tank Delivery to ${config.city}`, 
        unitCost: deliveryCost,
        cost: deliveryCost 
      });
    }
    if (config.tankPad && tankPads[config.tank]) {
      const padCost = tankPads[config.tank];
      breakdown.push({ 
        item: 'Tank Concrete Pad', 
        unitCost: padCost,
        cost: padCost 
      });
    }
  }

  // Sensor
  if (config.sensor && sensorPrices[config.sensor]) {
    const sensorCost = sensorPrices[config.sensor];
    breakdown.push({ 
      item: 'Tank Sensor', 
      unitCost: sensorCost,
      cost: sensorCost 
    });
  }

  // Filters
  if (config.filter && config.filterQty > 0 && filterPrices[config.filter]) {
    const filterUnit = filterPrices[config.filter];
    breakdown.push({ 
      item: `Extra ${config.filter.toUpperCase()} Filters`, 
      quantity: config.filterQty,
      unitCost: filterUnit,
      cost: filterUnit * config.filterQty 
    });
  }

  // Pump
  if (config.pump && pumpPrices[config.pump]) {
    const pumpCost = pumpPrices[config.pump];
    breakdown.push({ 
      item: 'External Water Pump', 
      unitCost: pumpCost,
      cost: pumpCost 
    });
    breakdown.push({ 
      item: 'Pump Installation', 
      unitCost: 200,
      cost: 200 
    });
  }

  // Connection
  if (config.connection === "2way-t-valve") {
    breakdown.push({ item: 'Manual 2-way T-valve', unitCost: 100, cost: 100 });
  }
  if (config.connection === "3way-t-valve") {
    breakdown.push({ item: 'Automatic 3-way T-valve', unitCost: 300, cost: 300 });
  }

  // Trenching
  if (config.trenchingSections) {
    config.trenchingSections.forEach(({ type, distance }) => {
      if (type && distance > 0 && trenchRates[type]) {
        const rate = trenchRates[type];
        breakdown.push({ 
          item: `Trenching - ${type.replace('trench_', '').toUpperCase()}`, 
          quantity: `${distance} ft`,
          unitCost: rate,
          cost: rate * distance 
        });
      }
    });
  }

  // Above ground
  if (config.ab_trenchingSections) {
    config.ab_trenchingSections.forEach(({ type, distance }) => {
      if (type && distance > 0 && ab_trenchRates[type]) {
        const rate = ab_trenchRates[type];
        breakdown.push({ 
          item: `Above Ground - ${type.replace('ab_', '').toUpperCase()}`, 
          quantity: `${distance} ft`,
          unitCost: rate,
          cost: rate * distance 
        });
      }
    });
  }

  // Panel
  if (config.panelUpgrade === "panel") {
    breakdown.push({ item: 'Panel Upgrade', unitCost: 8000, cost: 8000 });
  } else if (config.panelUpgrade === "subpanel") {
    breakdown.push({ item: 'Subpanel Upgrade', unitCost: 3000, cost: 3000 });
  }

  // Warranty
  if (config.warranty === "warranty5" && config.model && modelPrices[config.model]) {
    const warrantyCost = modelPrices[config.model].warranty5 || 0;
    breakdown.push({ 
      item: '5-Year Extended Warranty', 
      unitCost: warrantyCost,
      cost: warrantyCost 
    });
  } else if (config.warranty === "warranty8" && config.model && modelPrices[config.model]) {
    const warrantyCost = modelPrices[config.model].warranty8 || 0;
    breakdown.push({ 
      item: '8-Year Extended Warranty', 
      unitCost: warrantyCost,
      cost: warrantyCost 
    });
  }

  // Demolition
  if (config.demolition?.enabled && config.demolition?.distance > 0) {
    breakdown.push({ 
      item: 'Demolition', 
      quantity: `${config.demolition.distance} ft`,
      unitCost: 150,
      cost: config.demolition.distance * 150 
    });
  }

  // Custom adjustments
  if (config.customAdjs) {
    config.customAdjs.forEach((adj) => {
      if (adj.enabled && adj.amount !== 0) {
        breakdown.push({ 
          item: adj.label || 'Custom Adjustment', 
          unitCost: adj.amount,
          cost: adj.amount 
        });
      }
    });
  }

  // Fees
  breakdown.push({ item: 'Administrative Fee', unitCost: fees.admin, cost: fees.admin });
  breakdown.push({ item: 'Net 30 Fee', unitCost: fees.net30, cost: fees.net30 });
  
  const hasInstall = config.unitPad || config.tankPad || 
                     config.trenchingSections?.some(t => t.type) || 
                     config.ab_trenchingSections?.some(t => t.type) || 
                     config.panelUpgrade;
  
  if (hasInstall) {
    breakdown.push({ item: 'Commissioning Fee', unitCost: fees.commission, cost: fees.commission });
    breakdown.push({ item: 'Aquaria Management Fee', unitCost: fees.aquariaManagement, cost: fees.aquariaManagement });
    breakdown.push({ item: 'Disposal Fee', unitCost: fees.disposal, cost: fees.disposal });
  }

  const subtotal = breakdown.reduce((sum, item) => sum + item.cost, 0);
  const taxableItems = [config.tank, config.sensor, config.filter].filter(Boolean).length > 0;
  const taxRate = (pricing.taxRate as number) || 0.0825;
  const tax = taxableItems ? subtotal * taxRate : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-5xl w-full my-8">        
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-2xl font-bold text-gray-900">Quote Details: {quote.quote_number}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          {/* Customer Info */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Customer Information</h3>
            <div className="bg-gray-50 rounded p-4 grid grid-cols-2 gap-3 text-sm">
              {quote.customer_company && (
                <div className="text-gray-900"><span className="font-medium">Company:</span> {quote.customer_company}</div>
              )}
              <div className="text-gray-900"><span className="font-medium">Contact:</span> {quote.customer_name}</div>
              {quote.customer_email && (
                <div className="text-gray-900"><span className="font-medium">Email:</span> {quote.customer_email}</div>
              )}
              {quote.customer_phone && (
                <div className="text-gray-900"><span className="font-medium">Phone:</span> {quote.customer_phone}</div>
              )}
              <div className="col-span-2 text-gray-900">
                <span className="font-medium">Service Address:</span>{' '}
                {quote.service_street}, {quote.service_city}, {quote.service_state} {quote.service_zip}
              </div>
            </div>
          </section>

          {/* Partner Info */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Partner Information</h3>
            <div className="bg-gray-50 rounded p-4 text-sm">
              <div className="text-gray-900"><span className="font-medium">Partner:</span> {quote.partner_name}</div>
              <div className="text-gray-900"><span className="font-medium">Partner ID:</span> {quote.partner_id}</div>
            </div>
          </section>

          {/* Cost Breakdown */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Cost Breakdown</h3>
            <div className="border rounded overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {breakdown.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.item}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.quantity || '1'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        ${(item.unitCost || item.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        ${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-4 py-3 text-sm text-gray-900" colSpan={3}>Subtotal</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900" colSpan={3}>Sales Tax ({(taxRate * 100).toFixed(2)}%)</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      ${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {quote.discount_amount > 0 && (
                    <tr className="text-amber-600">
                      <td className="px-4 py-3 text-sm" colSpan={3}>Discount</td>
                      <td className="px-4 py-3 text-sm text-right">
                        -${quote.discount_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-100 font-bold text-lg">
                    <td className="px-4 py-4 text-gray-900" colSpan={3}>Total</td>
                    <td className="px-4 py-4 text-right text-gray-900">
                      ${quote.final_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Quote Metadata */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Quote Information</h3>
            <div className="bg-gray-50 rounded p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="text-gray-900"><span className="font-medium">Status:</span> {quote.status}</div>
              <div className="text-gray-900"><span className="font-medium">Created:</span> {new Date(quote.created_at!).toLocaleString()}</div>
              <div className="text-gray-900"><span className="font-medium">Last Updated:</span> {new Date(quote.updated_at!).toLocaleString()}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  
}