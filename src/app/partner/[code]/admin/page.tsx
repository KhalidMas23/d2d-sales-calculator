"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getPartnerByCode,
  updatePartner,
  getQuotes,
  getFeatureConfig,
  DEFAULT_FEATURE_CONFIG,
  type Partner,
  type Quote,
  type PartnerFeatureConfig,
} from "@/lib/supabase";

// Default Aquaria pricing
const DEFAULT_PRICING = {
  modelPrices: {
    s: {
      system: 9999,
      ship: 645,
      pad: 1750,
      mobility: 500,
      warranty5: 999,
      warranty8: 1499,
      install: 0,
      warrantys: 0,
    },
    standard: {
      system: 17499,
      ship: 1095,
      pad: 1850,
      mobility: 500,
      warranty5: 1749,
      warranty8: 2599,
      install: 0,
      warrantys: 0,
    },
    x: {
      system: 29999,
      ship: 1550,
      pad: 2100,
      mobility: 1000,
      warranty5: 2999,
      warranty8: 4499,
      install: 0,
      warrantys: 0,
    },
  },
  tankPrices: {
    "500": 770.9,
    "1550": 1430.35,
    "3000": 2428.9,
    "5000": 5125.99,
  },
  tankPads: {
    "500": 1750,
    "1550": 1850,
    "3000": 2300,
    "5000": 4200,
  },
  cityDelivery: {
    Austin: 999,
    "Corpus Christi": 858,
    Dallas: 577.5,
    Houston: 200,
    "San Antonio": 660,
  },
  sensorPrices: {
    normal: 35,
  },
  filterPrices: {
    s: 100,
    standard: 150,
    x: 200,
  },
  pumpPrices: {
    mini: 800,
  },
  trenchRates: {
    trench_elec: 32.5,
    trench_plumb: 58.5,
    trench_comb: 65.5,
  },
  ab_trenchRates: {
    ab_elec: 35.5,
    ab_plumb: 26.5,
    ab_comb: 35.5,
  },
} as const;

// --- Literal key lists (fixes "string can't index type" errors) ---
const MODELS = ["s", "standard", "x"] as const;
const TANK_SIZES = ["500", "1550", "3000", "5000"] as const;
const CITIES = ["Austin", "Corpus Christi", "Dallas", "Houston", "San Antonio"] as const;

// --- Pricing types derived from constants ---
type PriceValue = number | "";

type ModelKey = (typeof MODELS)[number];
type ModelField = keyof typeof DEFAULT_PRICING.modelPrices.s;

type ModelPrices = {
  [K in ModelKey]: {
    [F in ModelField]: PriceValue;
  };
};

type TankSize = (typeof TANK_SIZES)[number];
type CityKey = (typeof CITIES)[number];

type TankPrices = Record<TankSize, PriceValue>;
type TankPads = Record<TankSize, PriceValue>;
type CityDelivery = Record<CityKey, PriceValue>;
type SensorPrices = Record<keyof typeof DEFAULT_PRICING.sensorPrices, PriceValue>;
type FilterPrices = Record<ModelKey, PriceValue>;
type PumpPrices = Record<keyof typeof DEFAULT_PRICING.pumpPrices, PriceValue>;
type TrenchRates = Record<keyof typeof DEFAULT_PRICING.trenchRates, PriceValue>;
type AbTrenchRates = Record<keyof typeof DEFAULT_PRICING.ab_trenchRates, PriceValue>;

type PricingOverrides = Partial<typeof DEFAULT_PRICING>;

const toPriceValue = (value: string): PriceValue => (value === "" ? "" : Number(value));

export default function PartnerAdminPage() {
  const params = useParams();
  const partnerCode = params.code as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "features" | "pricing" | "quotes">("settings");

  // Settings form states
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [displayAddress, setDisplayAddress] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [displayEmail, setDisplayEmail] = useState("");
  const [displayWebsite, setDisplayWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2B6777");
  const [accentColor, setAccentColor] = useState("#52AB98");

  const [featureConfig, setFeatureConfig] = useState<PartnerFeatureConfig>(DEFAULT_FEATURE_CONFIG);

  // Pricing states (allow blank string inputs)
  const [modelPrices, setModelPrices] = useState<ModelPrices>(
    DEFAULT_PRICING.modelPrices as unknown as ModelPrices
  );
  const [tankPrices, setTankPrices] = useState<TankPrices>(
    DEFAULT_PRICING.tankPrices as unknown as TankPrices
  );
  const [tankPads, setTankPads] = useState<TankPads>(DEFAULT_PRICING.tankPads as unknown as TankPads);
  const [cityDelivery, setCityDelivery] = useState<CityDelivery>(
    DEFAULT_PRICING.cityDelivery as unknown as CityDelivery
  );
  const [sensorPrices, setSensorPrices] = useState<SensorPrices>(
    DEFAULT_PRICING.sensorPrices as unknown as SensorPrices
  );
  const [filterPrices, setFilterPrices] = useState<FilterPrices>(
    DEFAULT_PRICING.filterPrices as unknown as FilterPrices
  );
  const [pumpPrices, setPumpPrices] = useState<PumpPrices>(DEFAULT_PRICING.pumpPrices as unknown as PumpPrices);
  const [trenchRates, setTrenchRates] = useState<TrenchRates>(
    DEFAULT_PRICING.trenchRates as unknown as TrenchRates
  );
  const [abTrenchRates, setAbTrenchRates] = useState<AbTrenchRates>(
    DEFAULT_PRICING.ab_trenchRates as unknown as AbTrenchRates
  );

  useEffect(() => {
    loadPartnerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerCode]);

  const loadPartnerData = async () => {
    setLoading(true);
    setError(null);

    try {
      const partnerData = await getPartnerByCode(partnerCode);

      if (partnerData) {
        setPartner(partnerData);

        // Populate settings
        setCompanyName(partnerData.company_name || "");
        setContactName(partnerData.contact_name || "");
        setContactEmail(partnerData.contact_email || "");
        setContactPhone(partnerData.contact_phone || "");
        setDisplayAddress(partnerData.display_address || "");
        setDisplayPhone(partnerData.display_phone || "");
        setDisplayEmail(partnerData.display_email || "");
        setDisplayWebsite(partnerData.display_website || "");
        setLogoUrl(partnerData.logo_url || "");
        setPrimaryColor(partnerData.primary_color || "#2B6777");
        setAccentColor(partnerData.accent_color || "#52AB98");

        // Load feature config
        setFeatureConfig(getFeatureConfig(partnerData));

        // Load pricing overrides
        const pricing: PricingOverrides = (partnerData.pricing_overrides as PricingOverrides) ?? {};

        setModelPrices((pricing.modelPrices ?? DEFAULT_PRICING.modelPrices) as unknown as ModelPrices);
        setTankPrices((pricing.tankPrices ?? DEFAULT_PRICING.tankPrices) as unknown as TankPrices);
        setTankPads((pricing.tankPads ?? DEFAULT_PRICING.tankPads) as unknown as TankPads);
        setCityDelivery((pricing.cityDelivery ?? DEFAULT_PRICING.cityDelivery) as unknown as CityDelivery);
        setSensorPrices((pricing.sensorPrices ?? DEFAULT_PRICING.sensorPrices) as unknown as SensorPrices);
        setFilterPrices((pricing.filterPrices ?? DEFAULT_PRICING.filterPrices) as unknown as FilterPrices);
        setPumpPrices((pricing.pumpPrices ?? DEFAULT_PRICING.pumpPrices) as unknown as PumpPrices);
        setTrenchRates((pricing.trenchRates ?? DEFAULT_PRICING.trenchRates) as unknown as TrenchRates);
        setAbTrenchRates((pricing.ab_trenchRates ?? DEFAULT_PRICING.ab_trenchRates) as unknown as AbTrenchRates);

        // Load quotes
        const quotesData = await getQuotes(partnerData.partner_code);
        setQuotes(quotesData);
      } else {
        setError("Partner not found");
      }
    } catch (err) {
      console.error("Error loading partner data:", err);
      setError(err instanceof Error ? err.message : "Failed to load partner data");
    }

    setLoading(false);
  };

  const handleSaveSettings = async () => {
    if (!partner) return;

    setSaving(true);
    setError(null);

    try {
      const updates: Partial<Partner> = {
        company_name: companyName,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        display_address: displayAddress || null,
        display_phone: displayPhone || null,
        display_email: displayEmail || null,
        display_website: displayWebsite || null,
        logo_url: logoUrl || null,
        primary_color: primaryColor,
        accent_color: accentColor,
      };

      const updated = await updatePartner(partner.id, updates);

      if (updated) {
        setPartner(updated);
        alert("Settings saved successfully!");
      } else {
        setError("Failed to save settings.");
        alert("Failed to save settings. Check browser console for details.");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      alert(`Error saving settings: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeatures = async () => {
    if (!partner) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await updatePartner(partner.id, { feature_config: featureConfig });

      if (updated) {
        setPartner(updated);
        alert("Feature settings saved successfully!");
      } else {
        setError("Failed to save feature settings.");
        alert("Failed to save feature settings. Check browser console for details.");
      }
    } catch (err) {
      console.error("Error saving features:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      alert(`Error saving features: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricing = async () => {
    if (!partner) return;

    if (!partner.can_edit_pricing) {
      alert("You do not have permission to edit pricing. Contact Aquaria to enable this feature.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const pricingOverrides = {
        modelPrices,
        tankPrices,
        tankPads,
        cityDelivery,
        sensorPrices,
        filterPrices,
        pumpPrices,
        trenchRates,
        ab_trenchRates: abTrenchRates,
      };

      const updated = await updatePartner(partner.id, { pricing_overrides: pricingOverrides });

      if (updated) {
        setPartner(updated);
        alert("Pricing saved successfully!");
      } else {
        setError("Failed to save pricing.");
        alert("Failed to save pricing. Check browser console for details.");
      }
    } catch (err) {
      console.error("Error saving pricing:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      alert(`Error saving pricing: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPricing = () => {
    if (!confirm("Reset all pricing to Aquaria defaults? This cannot be undone.")) return;

    setModelPrices(DEFAULT_PRICING.modelPrices as unknown as ModelPrices);
    setTankPrices(DEFAULT_PRICING.tankPrices as unknown as TankPrices);
    setTankPads(DEFAULT_PRICING.tankPads as unknown as TankPads);
    setCityDelivery(DEFAULT_PRICING.cityDelivery as unknown as CityDelivery);
    setSensorPrices(DEFAULT_PRICING.sensorPrices as unknown as SensorPrices);
    setFilterPrices(DEFAULT_PRICING.filterPrices as unknown as FilterPrices);
    setPumpPrices(DEFAULT_PRICING.pumpPrices as unknown as PumpPrices);
    setTrenchRates(DEFAULT_PRICING.trenchRates as unknown as TrenchRates);
    setAbTrenchRates(DEFAULT_PRICING.ab_trenchRates as unknown as AbTrenchRates);
  };

  const updateFeatureConfig = (key: keyof PartnerFeatureConfig, value: unknown) => {
    setFeatureConfig((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayValue = (key: "enabledModels" | "enabledTanks" | "enabledCities", value: string) => {
    setFeatureConfig((prev) => {
      const currentArray = prev[key] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((v) => v !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray };
    });
  };

  // Pricing update functions
  const updateModelPrice = (model: ModelKey, field: ModelField, value: string) => {
    setModelPrices((prev) => ({
      ...prev,
      [model]: { ...prev[model], [field]: toPriceValue(value) },
    }));
  };

  const updateTankPrice = (size: TankSize, value: string) => {
    setTankPrices((prev) => ({ ...prev, [size]: toPriceValue(value) }));
  };

  const updateTankPad = (size: TankSize, value: string) => {
    setTankPads((prev) => ({ ...prev, [size]: toPriceValue(value) }));
  };

  const updateCityDelivery = (city: CityKey, value: string) => {
    setCityDelivery((prev) => ({ ...prev, [city]: toPriceValue(value) }));
  };

  const updateSensorPrice = (type: keyof typeof DEFAULT_PRICING.sensorPrices, value: string) => {
    setSensorPrices((prev) => ({ ...prev, [type]: toPriceValue(value) }));
  };

  const updateFilterPrice = (type: ModelKey, value: string) => {
    setFilterPrices((prev) => ({ ...prev, [type]: toPriceValue(value) }));
  };

  const updatePumpPrice = (type: keyof typeof DEFAULT_PRICING.pumpPrices, value: string) => {
    setPumpPrices((prev) => ({ ...prev, [type]: toPriceValue(value) }));
  };

  const updateTrenchRate = (type: keyof typeof DEFAULT_PRICING.trenchRates, value: string) => {
    setTrenchRates((prev) => ({ ...prev, [type]: toPriceValue(value) }));
  };

  const updateAbTrenchRate = (type: keyof typeof DEFAULT_PRICING.ab_trenchRates, value: string) => {
    setAbTrenchRates((prev) => ({ ...prev, [type]: toPriceValue(value) }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Partner Not Found</h1>
          <p className="text-gray-700 mb-4">{error || `Unable to load partner data for code: ${partnerCode}`}</p>
          <Link href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const quoteStats = {
    total: quotes.length,
    totalValue: quotes.reduce((sum, q) => sum + q.final_total, 0),
    draft: quotes.filter((q) => q.status === "draft").length,
    sent: quotes.filter((q) => q.status === "sent").length,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{partner.company_name}</h1>
              <p className="text-gray-600 mt-1">Partner Admin Portal</p>
            </div>
            <div className="flex gap-4">
              <Link href={`/partner/${partnerCode}`} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                View Calculator
              </Link>
              <Link href="/" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                Exit Admin
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Quotes</h3>
            <p className="text-3xl font-bold text-gray-900">{quoteStats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
            <p className="text-3xl font-bold text-gray-900">${quoteStats.totalValue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Draft Quotes</h3>
            <p className="text-3xl font-bold text-gray-900">{quoteStats.draft}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Sent Quotes</h3>
            <p className="text-3xl font-bold text-gray-900">{quoteStats.sent}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(["settings", "features", "pricing", "quotes"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 capitalize ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Company Settings</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Display Address</label>
                    <input
                      type="text"
                      value={displayAddress}
                      onChange={(e) => setDisplayAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Display Phone</label>
                    <input
                      type="tel"
                      value={displayPhone}
                      onChange={(e) => setDisplayPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Display Email</label>
                    <input
                      type="email"
                      value={displayEmail}
                      onChange={(e) => setDisplayEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      value={displayWebsite}
                      onChange={(e) => setDisplayWebsite(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-20"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-10 w-20"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {saving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
            )}

            {/* FEATURES TAB */}
            {activeTab === "features" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Feature Configuration</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-3">Available Models</h3>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enabledModels.includes("s")}
                          onChange={() => toggleArrayValue("enabledModels", "s")}
                        />
                        Hydropack S
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enabledModels.includes("standard")}
                          onChange={() => toggleArrayValue("enabledModels", "standard")}
                        />
                        Hydropack Standard
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enabledModels.includes("x")}
                          onChange={() => toggleArrayValue("enabledModels", "x")}
                        />
                        Hydropack X
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Available Tanks</h3>
                    <div className="flex gap-4">
                      {TANK_SIZES.map((size) => (
                        <label key={size} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={featureConfig.enabledTanks.includes(size)}
                            onChange={() => toggleArrayValue("enabledTanks", size)}
                          />
                          {size} Gallon
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Available Cities</h3>
                    <div className="flex flex-wrap gap-4">
                      {CITIES.map((city) => (
                        <label key={city} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={featureConfig.enabledCities.includes(city)}
                            onChange={() => toggleArrayValue("enabledCities", city)}
                          />
                          {city}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-3">Optional Features</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enableWarrantyUpgrades}
                          onChange={(e) => updateFeatureConfig("enableWarrantyUpgrades", e.target.checked)}
                        />
                        Warranty Upgrades
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enableDemolition}
                          onChange={(e) => updateFeatureConfig("enableDemolition", e.target.checked)}
                        />
                        Demolition Services
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enableTrenching}
                          onChange={(e) => updateFeatureConfig("enableTrenching", e.target.checked)}
                        />
                        Trenching Services
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enableAbovegroundTrenching}
                          onChange={(e) => updateFeatureConfig("enableAbovegroundTrenching", e.target.checked)}
                        />
                        Aboveground Runs
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enablePanelUpgrade}
                          onChange={(e) => updateFeatureConfig("enablePanelUpgrade", e.target.checked)}
                        />
                        Panel Upgrades
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enableCustomAdjustments}
                          onChange={(e) => updateFeatureConfig("enableCustomAdjustments", e.target.checked)}
                        />
                        Custom Adjustments
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enablePumps}
                          onChange={(e) => updateFeatureConfig("enablePumps", e.target.checked)}
                        />
                        Pump Options
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enableSensors}
                          onChange={(e) => updateFeatureConfig("enableSensors", e.target.checked)}
                        />
                        Tank Sensors
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={featureConfig.enableFilters}
                          onChange={(e) => updateFeatureConfig("enableFilters", e.target.checked)}
                        />
                        Extra Filters
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-2">Custom Disclaimers</label>
                    <textarea
                      value={featureConfig.customDisclaimers || ""}
                      onChange={(e) => updateFeatureConfig("customDisclaimers", e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                      rows={4}
                      placeholder="Add custom disclaimers that will appear on the calculator..."
                    />
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <button
                    onClick={handleSaveFeatures}
                    disabled={saving}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {saving ? "Saving..." : "Save Features"}
                  </button>
                </div>
              </div>
            )}

            {/* PRICING TAB */}
            {activeTab === "pricing" && (
              <div className="space-y-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Pricing Management</h2>
                    {partner.can_edit_pricing ? (
                      <p className="text-sm text-gray-600">
                        Adjust prices for your customers. Leave blank to use Aquaria defaults.
                      </p>
                    ) : (
                      <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded border border-yellow-200">
                        Your account doesn&apos;t have pricing edit permissions. Contact Aquaria to enable price
                        adjustments.
                      </p>
                    )}
                  </div>
                  {partner.can_edit_pricing && (
                    <button
                      onClick={handleResetPricing}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                    >
                      Reset to Defaults
                    </button>
                  )}
                </div>

                {partner.can_edit_pricing ? (
                  <>
                    {/* Model Prices */}
                    <div className="border rounded-lg p-6 bg-white">
                      <h3 className="text-lg font-semibold mb-4">Hydropack Models</h3>
                      <div className="space-y-6">
                        {MODELS.map((model) => (
                          <div key={model} className="border-b pb-6 last:border-b-0">
                            <h4 className="font-medium mb-3 capitalize">
                              Hydropack {model === "s" ? "S" : model === "x" ? "X" : "Standard"}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm text-gray-600 mb-1">System</label>
                                <input
                                  type="number"
                                  value={modelPrices[model]?.system ?? ""}
                                  onChange={(e) => updateModelPrice(model, "system", e.target.value)}
                                  className="w-full px-3 py-2 border rounded"
                                  placeholder={DEFAULT_PRICING.modelPrices[model].system.toString()}
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-600 mb-1">Shipping</label>
                                <input
                                  type="number"
                                  value={modelPrices[model]?.ship ?? ""}
                                  onChange={(e) => updateModelPrice(model, "ship", e.target.value)}
                                  className="w-full px-3 py-2 border rounded"
                                  placeholder={DEFAULT_PRICING.modelPrices[model].ship.toString()}
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-600 mb-1">Pad</label>
                                <input
                                  type="number"
                                  value={modelPrices[model]?.pad ?? ""}
                                  onChange={(e) => updateModelPrice(model, "pad", e.target.value)}
                                  className="w-full px-3 py-2 border rounded"
                                  placeholder={DEFAULT_PRICING.modelPrices[model].pad.toString()}
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-600 mb-1">Mobility</label>
                                <input
                                  type="number"
                                  value={modelPrices[model]?.mobility ?? ""}
                                  onChange={(e) => updateModelPrice(model, "mobility", e.target.value)}
                                  className="w-full px-3 py-2 border rounded"
                                  placeholder={DEFAULT_PRICING.modelPrices[model].mobility.toString()}
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-600 mb-1">5-Yr Warranty</label>
                                <input
                                  type="number"
                                  value={modelPrices[model]?.warranty5 ?? ""}
                                  onChange={(e) => updateModelPrice(model, "warranty5", e.target.value)}
                                  className="w-full px-3 py-2 border rounded"
                                  placeholder={DEFAULT_PRICING.modelPrices[model].warranty5.toString()}
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-600 mb-1">8-Yr Warranty</label>
                                <input
                                  type="number"
                                  value={modelPrices[model]?.warranty8 ?? ""}
                                  onChange={(e) => updateModelPrice(model, "warranty8", e.target.value)}
                                  className="w-full px-3 py-2 border rounded"
                                  placeholder={DEFAULT_PRICING.modelPrices[model].warranty8.toString()}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tanks & Pads */}
                    <div className="border rounded-lg p-6 bg-white">
                      <h3 className="text-lg font-semibold mb-4">Tanks & Pads</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {TANK_SIZES.map((size) => (
                          <div key={size}>
                            <label className="block text-sm text-gray-600 mb-1">{size}gal Tank</label>
                            <input
                              type="number"
                              step="0.01"
                              value={tankPrices[size] ?? ""}
                              onChange={(e) => updateTankPrice(size, e.target.value)}
                              className="w-full px-3 py-2 border rounded"
                              placeholder={DEFAULT_PRICING.tankPrices[size].toString()}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {TANK_SIZES.map((size) => (
                          <div key={size}>
                            <label className="block text-sm text-gray-600 mb-1">{size}gal Pad</label>
                            <input
                              type="number"
                              value={tankPads[size] ?? ""}
                              onChange={(e) => updateTankPad(size, e.target.value)}
                              className="w-full px-3 py-2 border rounded"
                              placeholder={DEFAULT_PRICING.tankPads[size].toString()}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cities */}
                    <div className="border rounded-lg p-6 bg-white">
                      <h3 className="text-lg font-semibold mb-4">City Delivery</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {CITIES.map((city) => (
                          <div key={city}>
                            <label className="block text-sm text-gray-600 mb-1">{city}</label>
                            <input
                              type="number"
                              step="0.01"
                              value={cityDelivery[city] ?? ""}
                              onChange={(e) => updateCityDelivery(city, e.target.value)}
                              className="w-full px-3 py-2 border rounded"
                              placeholder={DEFAULT_PRICING.cityDelivery[city].toString()}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Extras */}
                    <div className="border rounded-lg p-6 bg-white">
                      <h3 className="text-lg font-semibold mb-4">Additional Items</h3>
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Sensors</h4>
                          <label className="block text-sm text-gray-600 mb-1">Normal</label>
                          <input
                            type="number"
                            value={sensorPrices.normal ?? ""}
                            onChange={(e) => updateSensorPrice("normal", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder={DEFAULT_PRICING.sensorPrices.normal.toString()}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Filters</h4>
                          {MODELS.map((type) => (
                            <div key={type} className="mb-2">
                              <label className="block text-sm text-gray-600 mb-1 capitalize">{type}</label>
                              <input
                                type="number"
                                value={filterPrices[type] ?? ""}
                                onChange={(e) => updateFilterPrice(type, e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                                placeholder={DEFAULT_PRICING.filterPrices[type].toString()}
                              />
                            </div>
                          ))}
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Pumps</h4>
                          <label className="block text-sm text-gray-600 mb-1">DAB Mini</label>
                          <input
                            type="number"
                            value={pumpPrices.mini ?? ""}
                            onChange={(e) => updatePumpPrice("mini", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder={DEFAULT_PRICING.pumpPrices.mini.toString()}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Trenching */}
                    <div className="border rounded-lg p-6 bg-white">
                      <h3 className="text-lg font-semibold mb-4">Trenching ($/ft)</h3>
                      <h4 className="font-medium mb-2">Underground</h4>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Electrical</label>
                          <input
                            type="number"
                            step="0.01"
                            value={trenchRates.trench_elec ?? ""}
                            onChange={(e) => updateTrenchRate("trench_elec", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder={DEFAULT_PRICING.trenchRates.trench_elec.toString()}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Plumbing</label>
                          <input
                            type="number"
                            step="0.01"
                            value={trenchRates.trench_plumb ?? ""}
                            onChange={(e) => updateTrenchRate("trench_plumb", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder={DEFAULT_PRICING.trenchRates.trench_plumb.toString()}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Combined</label>
                          <input
                            type="number"
                            step="0.01"
                            value={trenchRates.trench_comb ?? ""}
                            onChange={(e) => updateTrenchRate("trench_comb", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder={DEFAULT_PRICING.trenchRates.trench_comb.toString()}
                          />
                        </div>
                      </div>
                      <h4 className="font-medium mb-2">Aboveground</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Electrical</label>
                          <input
                            type="number"
                            step="0.01"
                            value={abTrenchRates.ab_elec ?? ""}
                            onChange={(e) => updateAbTrenchRate("ab_elec", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder={DEFAULT_PRICING.ab_trenchRates.ab_elec.toString()}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Plumbing</label>
                          <input
                            type="number"
                            step="0.01"
                            value={abTrenchRates.ab_plumb ?? ""}
                            onChange={(e) => updateAbTrenchRate("ab_plumb", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder={DEFAULT_PRICING.ab_trenchRates.ab_plumb.toString()}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Combined</label>
                          <input
                            type="number"
                            step="0.01"
                            value={abTrenchRates.ab_comb ?? ""}
                            onChange={(e) => updateAbTrenchRate("ab_comb", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder={DEFAULT_PRICING.ab_trenchRates.ab_comb.toString()}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t">
                      <p className="text-sm text-gray-600">Empty fields will use Aquaria defaults</p>
                      <button
                        onClick={handleSavePricing}
                        disabled={saving}
                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {saving ? "Saving..." : "Save Pricing"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 border rounded bg-gray-50">
                    <p className="text-gray-600 mb-2">Pricing management not enabled</p>
                    <p className="text-sm text-gray-500">Contact support@aquaria.com to enable pricing adjustments</p>
                  </div>
                )}
              </div>
            )}

            {/* QUOTES TAB */}
            {activeTab === "quotes" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Saved Quotes</h2>
                {quotes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {quotes.map((quote) => (
                          <tr key={quote.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{quote.quote_number}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{quote.customer_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              ${quote.final_total.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  quote.status === "sent"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {quote.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No quotes yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
