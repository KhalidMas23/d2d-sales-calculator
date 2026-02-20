"use client";

// pages/index.tsx
import { useState, useRef, useEffect } from "react";
import './globals.css';
import Head from "next/head";
import {  
  getAllPartners, 
  saveQuote,
  updateQuote,
  generateQuoteNumber,
  type Partner,
  type Quote,
  type QuoteConfig
} from '@/lib/supabase';
import FinancingCalculator from "@/components/FinancingCalculator"; // adjust path if needed
import type { CustomAdjustment } from "@/components/CustomAdjustmentBox";
import CustomAdjustmentsGroup from "@/components/CustomAdjustmentsGroup";
import { checkEasterEgg, EasterEggOverlay } from "@/components/EasterEggs";
import CustomerInfoPanel, {
  CustomerInfo,
  REQUIRED_CUSTOMER_KEYS
} from "@/components/CustomerInfoPanel";
import SavedQuotesList from "@/components/SavedQuotesList";




// Discount master switch
const DISCOUNT_FEATURE_ENABLED = true; // flip to false to globally disable
// 2025 EOY / future promo discounts
const DISCOUNT_CAMPAIGN = {
  label: "Winter Storm Discount",
  rate: 0.10,
};

const HomePage: React.FC = () => {
  // State hooks first
  useEffect(() => {
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  script.async = true;
  document.body.appendChild(script);

  return () => {
    document.body.removeChild(script);
  };
}, []);
  const [model, setModel] = useState<string>("");
  const [unitPad, setUnitPad] = useState<boolean>(false);
  const [mobility, setMobility] = useState<boolean>(false);
  const [tank, setTank] = useState<string>("");
  const [tankPad, setTankPad] = useState<boolean>(false);
  const [city, setCity] = useState<string>("");
  const [sensor, setSensor] = useState<string>("");
  const [filter, setFilter] = useState<string>("");
  const [filterQty, setFilterQty] = useState<number>(0);
  const [pump, setPump] = useState<string>("");
  const [connection, setConnection] = useState<string>("");
  const [trenchingSections, setTrenchingSections] = useState([
    { type: "", distance: 0 },
  ]);
    const [ab_trenchingSections, setab_TrenchingSections] = useState([
    { type: "", distance: 0 },
  ]);
  const [panelUpgrade, setPanelUpgrade] = useState<string>("");
  const [warranty, setWarranty] = useState<string>("standard");
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null); // shown only after clicking
  const [total, setTotal] = useState<number>(0); // always stores current total
  const [showFinancing, setShowFinancing] = useState(false);
  const [quoteIsStale, setQuoteIsStale] = useState<boolean>(true);
  const financingRef = useRef<HTMLDivElement>(null);
  const [demolition, setDemolition] = useState<{
    enabled: boolean;
    distance: number;
  }>({
    enabled: false,
    distance: 0,
  });
const [customAdjs, setCustomAdjs] = useState<CustomAdjustment[]>([
  { enabled: false, label: "", amount: 0, notes: "" },
]);
const markDirty = () => { setQuoteIsStale(true); setShowFinancing(false); };
const [easterEggMsg, setEasterEggMsg] = useState<string | null>(null);
const eggTimerRef = useRef<number | null>(null);
const [customer, setCustomer] = useState<CustomerInfo>({
  company: "",
  contactName: "",
  email: "",
  phone: "",
  serviceStreet: "",
  serviceCity: "",
  serviceState: "",
  serviceZip: "",
});
const [originalTotal, setOriginalTotal] = useState<number | null>(null);
const [discountedTotal, setDiscountedTotal] = useState<number | null>(null);
const [discountAmount, setDiscountAmount] = useState<number>(0);
const [discountActive, setDiscountActive] = useState<boolean>(DISCOUNT_FEATURE_ENABLED);
const isDiscountOn = DISCOUNT_FEATURE_ENABLED && discountActive;
const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
const [quoteNumber, setQuoteNumber] = useState<string>('');
const [currentPartner, setCurrentPartner] = useState<Partner | null>(null);

// load partners
useEffect(() => {
  async function loadPartners() {
    try {
      const partners = await getAllPartners();
            
      // Set Aquaria HQ as default partner
      const aquaria = partners.find(p => p.partner_code === 'AQUARIA_HQ');
      if (aquaria) {
        setCurrentPartner(aquaria);
      }
    } catch (err) {
      console.error('Failed to load partners:', err);
    }
  }
  loadPartners();
}, []);

// load from localStorage on mount
useEffect(() => {
  try {
    const saved = localStorage.getItem("aq_customer");
    if (saved) setCustomer(JSON.parse(saved));
  } catch {}
}, []);

// save on changes
useEffect(() => {
  try {
    localStorage.setItem("aq_customer", JSON.stringify(customer));
  } catch {}
}, [customer]);

useEffect(() => {
  return () => {
    if (eggTimerRef.current) window.clearTimeout(eggTimerRef.current);
  };
}, []);

function showEgg(message: string, duration: number) {
  setEasterEggMsg(message);
  if (eggTimerRef.current) window.clearTimeout(eggTimerRef.current);
  eggTimerRef.current = window.setTimeout(() => setEasterEggMsg(null), duration);
}

  // Price lookup
  const modelPrices: Record<
    string,
    {
      system: number;
      install: number;
      ship: number;
      pad: number;
      mobility: number;
      warrantys: number;
      warranty5: number;
      warranty8: number;
    }
  > = {
    // Prices updated as of 07/04
    s: {
      system: 9999,
      install: 0,
      ship: 645,
      pad: 1750,
      mobility: 500,
      warrantys: 0,
      warranty5: 999,
      warranty8: 1499,
    },
    standard: {
      system: 17499,
      install: 0,
      ship: 1095,
      pad: 1850,
      mobility: 500,
      warrantys: 0,
      warranty5: 1749,
      warranty8: 2599,
    },
    x: {
      system: 29999,
      install: 0,
      ship: 1550,
      pad: 2100,
      mobility: 1000,
      warrantys: 0,
      warranty5: 2999,
      warranty8: 4499,
    },
  };

  const tankPrices: Record<string, number> = {
    "500": 770.9,
    "1550": 1430.35,
    "3000": 2428.9,
    "5000": 5125.99,
  };

  const tankPads: Record<string, number> = {
    "500": 1750,
    "1550": 1850,
    "3000": 2300,
    "5000": 4200,
  };

  const cityDelivery: Record<string, number> = {
    Austin: 999,
    "Corpus Christi": 858,
    Dallas: 577.5,
    Houston: 200,
    "San Antonio": 660,
  };

  const sensorPrices: Record<string, number> = {
    "": 0,
    normal: 35,
  };

  const filterPrices: Record<string, number> = {
    s: 100,
    standard: 150,
    x: 200,
  };

  const pumpPrices: Record<string, number> = {
    dab: 1900,
    mini: 800,
    "": 0,
  };

  const trenchRates: Record<string, number> = {
    trench_elec: 32.5,
    trench_plumb: 58.5,
    trench_comb: 65.5,
    "": 0,
  };

  const ab_trenchRates: Record<string, number> = {
    ab_elec: 35.5,
    ab_plumb: 26.5,
    ab_comb: 35.5,
    "": 0,
  };

  const getTotal = () => {
    const ADM = 500;
    const COMM = 2500;
    const AQM = 500;
    const DISP = 200; // disposal fee
    const net30 = 100; // Net 30

    let subtotal = 0;
    let taxable = 0;
    let installTotal = 0;
    let hasSelections = false;
    let hasInstallOptions = false;

    // Model system + shipping + install
    if (model) {
      subtotal += modelPrices[model].system;
      subtotal += modelPrices[model].ship;
      if (mobility) subtotal += modelPrices[model].mobility;
      hasSelections = true;
    }

    // Install items
    if (unitPad) {
      installTotal += modelPrices[model]?.pad || 0;
      hasSelections = true;
      hasInstallOptions = true;
    }
    if (tankPad) {
      installTotal += tankPads[tank] || 0;
      hasSelections = true;
      hasInstallOptions = true;
    }
    if (connection === "2way-t-valve") {
      installTotal += 100;
      hasSelections = true;
      hasInstallOptions = true;
    }
    if (connection === "3way-t-valve") {
      installTotal += 300;
      hasSelections = true;
      hasInstallOptions = true;
    }
    if (panelUpgrade === "panel") {
      installTotal += 8000;
      hasSelections = true;
      hasInstallOptions = true;
    }
    if (panelUpgrade === "subpanel") {
      installTotal += 3000;
      hasSelections = true;
      hasInstallOptions = true;
    }

    trenchingSections.forEach(({ type, distance }) => {
      const t_rate = trenchRates[type] || 0;
      const tcost = t_rate * distance;
      if (tcost > 0) {
        hasSelections = true;
        hasInstallOptions = true;
      }
      installTotal += tcost;
    });

      ab_trenchingSections.forEach(({ type, distance }) => {
      const ab_t_rate = ab_trenchRates[type] || 0;
      const ab_t_cost = ab_t_rate * distance;
      if (ab_t_cost > 0) {
        hasSelections = true;
        hasInstallOptions = true;
      }
      installTotal += ab_t_cost;
    });


  // Tank
  if (tank) {
    const tCost = tankPrices[tank] || 0;
    subtotal += tCost;
    taxable += tCost;
    if (city && cityDelivery[city]) subtotal += cityDelivery[city];
    hasSelections = true;
  }

  // Sensor
  if (sensor) {
    const sCost = sensorPrices[sensor] || 0;
    if (sCost > 0) hasSelections = true;
    subtotal += sCost;
    taxable += sCost;
  }

  // Filter
  if (filter && filterQty > 0) {
    const fCost = (filterPrices[filter] || 0) * filterQty;
    subtotal += fCost;
    taxable += fCost;
    hasSelections = true;
  }

  // Pump and pump install cost
  if (pump) {
    const pCost = (pumpPrices[pump] || 0);
    const pInstCost = 200;
    if (pCost > 0) hasSelections = true;
    subtotal += pCost;
    taxable += pCost;
    installTotal += pInstCost;
  }


  // Warranty
if (warranty && warranty !== "standard" && model) {
  if (warranty === "warranty5" || warranty === "warranty8") {
    const wCost = modelPrices[model]?.[warranty] || 0;
    subtotal += wCost;
    hasSelections = true;
  }
}

// Demolition
if (demolition?.enabled && demolition?.distance > 0) {
  const demoCost = demolition.distance * 150;
  installTotal += demoCost;
  hasSelections = true;
}

  // Admin fees (if anything selected)
  if (hasSelections) {
    subtotal += ADM + net30;
  }

  // Comm + AQM (if install-related options selected)
  if (hasInstallOptions) {
    installTotal += COMM + AQM + DISP;
  }


  console.log("DEBUG Total Breakdown", {
  model: model,
  subtotal,
  installTotal,
  ADM,
  net30,
  hasSelections,
  hasInstallOptions,
  connection,
  pump,
  sensor,
  filter,
  filterQty,
  demolition,
  customAdjs,
});
  
const enabledCustoms = customAdjs.filter(
  (c) => c.enabled && Number(c.amount) !== 0
);
if (enabledCustoms.length > 0) {
  const customSum = enabledCustoms.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  subtotal += customSum;
  hasSelections = true; // ensures admin fees apply when used
}


  const taxRate = 0.0825;
  const tax = taxable * taxRate;
  const finalTotal = subtotal + installTotal + tax;
  return finalTotal;
};

function resetAll() {
  if (!confirm("Clear all fields and reset this quote?")) return;

  // Reset core selections
  setModel("");
  setUnitPad(false);
  setMobility(false);
  setTank("");
  setTankPad(false);
  setCity("");
  setSensor("");
  setFilter("");
  setFilterQty(0);
  setPump("");
  setConnection("");

  setTrenchingSections([{ type: "", distance: 0 }]);
  setab_TrenchingSections([{ type: "", distance: 0 }]);
  setPanelUpgrade("");
  setWarranty("standard");
  setDemolition({ enabled: false, distance: 0 });

  setCustomAdjs([{ enabled: false, label: "", amount: 0, notes: "" }]);

  // Reset totals & financing
  setQuoteTotal(null);
  setTotal(0);
  setShowFinancing(false);
  setQuoteIsStale(true);

  setOriginalTotal(null);
  setDiscountedTotal(null);
  setDiscountAmount(0);
  setDiscountActive(DISCOUNT_FEATURE_ENABLED);

  // Reset customer info
  setCustomer({
    company: "",
    contactName: "",
    email: "",
    phone: "",
    serviceStreet: "",
    serviceCity: "",
    serviceState: "",
    serviceZip: "",
  });

  // Clear stored customer data
  try {
    localStorage.removeItem("aq_customer");
  } catch {}

  // Optional: clear easter eggs
  setEasterEggMsg(null);
}


const calculateTotal = () => {
  // commit any focused input (amount box) that commits on blur
  if (
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
  ) {
    document.activeElement.blur();
  }

  // 1) Compute original, pre-discount total
  const baseTotal = getTotal();

  // 2) Save original total
  setOriginalTotal(baseTotal);

  // 3) If discount feature is enabled & currently active, apply it
  const applyDiscount = isDiscountOn; // or include feature flag if you added DISCOUNT_FEATURE_ENABLED

  if (applyDiscount) {
    const discAmount = baseTotal * DISCOUNT_CAMPAIGN.rate;
    const discTotal = baseTotal - discAmount;

    setDiscountAmount(discAmount);
    setDiscountedTotal(discTotal);

    // Final amount customer sees / financing uses
    setQuoteTotal(discTotal);
    setTotal(discTotal);
  } else {
    // No discount applied
    setDiscountAmount(0);
    setDiscountedTotal(null);

    setQuoteTotal(baseTotal);
    setTotal(baseTotal);
  }

  setQuoteIsStale(false);
};

const saveCurrentQuote = async () => {
  // Validate customer info
  const missing = REQUIRED_CUSTOMER_KEYS.filter(
    k => !customer[k] || String(customer[k]).trim() === ""
  );
  
  if (missing.length) {
    alert("Please complete required customer fields before saving.");
    return;
  }

  // Make sure quote is calculated
  if (quoteTotal === null || quoteIsStale) {
    alert("Please calculate the total before saving.");
    return;
  }

  try {
    const quoteConfig: QuoteConfig = {
      model,
      unitPad,
      mobility,
      tank,
      tankPad,
      city,
      sensor,
      filter,
      filterQty,
      pump,
      connection,
      trenchingSections,
      ab_trenchingSections,
      panelUpgrade,
      warranty,
      demolition,
      customAdjs,
    };

    // Capture the actual pricing used for this quote
    const partnerPricing = {
      modelPrices,
      tankPrices,
      tankPads,
      cityDelivery,
      sensorPrices,
      filterPrices,
      pumpPrices,
      trenchRates,
      ab_trenchRates,
      fees: {
        admin: 500,
        commission: 2500,
        aquariaManagement: 500,
        disposal: 200,
        net30: 100,
      },
      taxRate: 0.0825,
    };

    const quoteData = {
      quote_number: quoteNumber || generateQuoteNumber(currentPartner?.partner_code),
      customer_company: customer.company || null,
      customer_name: customer.contactName,
      customer_email: customer.email || null,
      customer_phone: customer.phone || null,
      service_street: customer.serviceStreet,
      service_city: customer.serviceCity,
      service_state: customer.serviceState,
      service_zip: customer.serviceZip,
      partner_id: currentPartner?.partner_code || 'AQUARIA_HQ',
      partner_name: currentPartner?.company_name || 'Aquaria Technologies',
      partner_logo_url: currentPartner?.logo_url || null,
      quote_config: quoteConfig,
      original_total: originalTotal,
      discount_amount: discountAmount,
      final_total: total,
      partner_pricing: partnerPricing, // Save actual pricing used
      status: 'draft' as const,
      notes: null,
    };

    let savedQuote;
    
    if (currentQuoteId) {
      // Update existing quote
      savedQuote = await updateQuote(currentQuoteId, quoteData);
      alert(`Quote ${savedQuote?.quote_number} updated successfully!`);
    } else {
      // Save new quote
      savedQuote = await saveQuote(quoteData);
      if (savedQuote) {
        setCurrentQuoteId(savedQuote.id!);
        setQuoteNumber(savedQuote.quote_number);
        alert(`Quote saved! Quote #: ${savedQuote.quote_number}`);
      }
    }

    if (!savedQuote) {
      alert('Failed to save quote. Please try again.');
    }
  } catch (error) {
    console.error('Error saving quote:', error);
    alert('An error occurred while saving the quote.');
  }
};

const loadQuote = (quote: Quote) => {
  if (!confirm("Load this quote? Any unsaved changes will be lost.")) return;

  // Load customer info
  setCustomer({
    company: quote.customer_company || "",
    contactName: quote.customer_name,
    email: quote.customer_email || "",
    phone: quote.customer_phone || "",
    serviceStreet: quote.service_street,
    serviceCity: quote.service_city,
    serviceState: quote.service_state,
    serviceZip: quote.service_zip,
  });

  // Load quote config
  const config = quote.quote_config;
  setModel(config.model);
  setUnitPad(config.unitPad);
  setMobility(config.mobility);
  setTank(config.tank);
  setTankPad(config.tankPad);
  setCity(config.city);
  setSensor(config.sensor);
  setFilter(config.filter);
  setFilterQty(config.filterQty);
  setPump(config.pump);
  setConnection(config.connection);
  setTrenchingSections(config.trenchingSections);
  setab_TrenchingSections(config.ab_trenchingSections);
  setPanelUpgrade(config.panelUpgrade);
  setWarranty(config.warranty);
  setDemolition(config.demolition);
  setCustomAdjs(config.customAdjs);

  // Load pricing
  setOriginalTotal(quote.original_total);
  setDiscountAmount(quote.discount_amount);
  setTotal(quote.final_total);
  setQuoteTotal(quote.final_total);
  
  if (quote.discount_amount > 0) {
    setDiscountedTotal(quote.final_total);
    setDiscountActive(true);
  }

  // Set quote ID and number for updates
  setCurrentQuoteId(quote.id!);
  setQuoteNumber(quote.quote_number);
  
  setQuoteIsStale(false);
  setShowFinancing(false);

  alert(`Loaded quote ${quote.quote_number}`);
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
};



// DYNAMIC SCALING PDF GENERATION
// Replace the downloadPDF function in src/app/page.tsx (around line 745)

const downloadPDF = async () => {
  if (quoteTotal === null || quoteIsStale) {
    alert("Please click 'Calculate Total' to generate an updated quote before downloading.");
    return;
  }

  const missing = REQUIRED_CUSTOMER_KEYS.filter(k => !customer[k] || String(customer[k]).trim() === "");
  if (missing.length) {
    alert("Please complete required customer fields before generating the PDF.");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsPDF = (window as any).jspdf?.jsPDF;
  if (!jsPDF) {
    alert('PDF library not loaded. Please refresh the page and try again.');
    return;
  }

  const doc = new jsPDF("p", "mm", "a4");
  const date = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
  const baseTotal = originalTotal ?? total;
  const isDiscountActive = DISCOUNT_FEATURE_ENABLED && discountActive && originalTotal !== null && 
                          discountedTotal !== null && discountedTotal !== originalTotal;

  const baseTotalStr = baseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const discountAmountStr = isDiscountActive ? (discountAmount || baseTotal - (discountedTotal as number)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
  const discountedTotalStr = (isDiscountActive ? discountedTotal : baseTotal)!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 20;

  // === COUNT ITEMS FOR DYNAMIC SCALING ===
  let itemCount = 0;
  
  // System items
  if (model) itemCount += 2 + (mobility ? 1 : 0); // system + shipping + mobility
  
  // Tank items
  if (tank) {
    itemCount += 1; // tank
    if (city) itemCount += 1; // delivery
    if (tankPad) itemCount += 1; // pad
  }
  
  // Installation items
  if (unitPad) itemCount += 1;
  itemCount += trenchingSections.filter(t => t.type && t.distance > 0).length;
  itemCount += ab_trenchingSections.filter(t => t.type && t.distance > 0).length;
  if (panelUpgrade) itemCount += 1;
  if (pump && pumpPrices[pump]) itemCount += 2; // pump + installation
  if (demolition?.enabled && demolition?.distance > 0) itemCount += 1;
  if (unitPad || trenchingSections.some(t => t.type) || ab_trenchingSections.some(t => t.type) || 
      panelUpgrade || pump || demolition?.enabled) {
    itemCount += 1; // Professional Installation & Commissioning
  }
  
  // Additional items
  if (sensor) itemCount += 1;
  if (filter && filterQty > 0) itemCount += 1;
  if (connection) itemCount += 1;
  
  // Warranty
  if (warranty && warranty !== "standard") itemCount += 1;
  
  // Custom adjustments
  const enabledCustoms = customAdjs.filter(c => c.enabled && c.label.trim() !== "" && Number(c.amount) !== 0);
  itemCount += enabledCustoms.length;

  // === DETERMINE SCALE FACTOR ===
  // Small quotes (1-15 items): 100% scale (10pt font, 7mm spacing)
  // Medium quotes (16-25 items): 85% scale (8.5pt font, 6mm spacing)
  // Large quotes (26-35 items): 75% scale (7.5pt font, 5mm spacing)
  // XL quotes (36+ items): 65% scale (6.5pt font, 4.5mm spacing) - may go to 2 pages
  
  let scaleFactor = 1.0;
  if (itemCount <= 15) {
    scaleFactor = 1.0; // Full size
  } else if (itemCount <= 25) {
    scaleFactor = 0.85; // Compact
  } else if (itemCount <= 35) {
    scaleFactor = 0.75; // More compact
  } else {
    scaleFactor = 0.65; // Very compact (may still need 2 pages)
  }

  // Apply scaling to fonts and spacing
  const baseFontSize = 10 * scaleFactor;
  const headerFontSize = 11 * scaleFactor;
  const totalFontSize = 13 * scaleFactor;
  const itemSpacing = 7 * scaleFactor;
  const sectionSpacing = 8 * scaleFactor;

  let y = 30; // Start after header

  // Helper: Check if we need a new page
  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  }

  // Helper: Add section header
  const addSectionHeader = (title: string) => {
    ensureSpace(15 * scaleFactor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(headerFontSize);
    doc.setTextColor(43, 103, 119);
    doc.text(title, leftMargin, y);
    y += 3 * scaleFactor;
    doc.setDrawColor(209, 213, 219);
    doc.line(leftMargin, y, pageWidth - leftMargin, y);
    y += sectionSpacing;
    doc.setTextColor(0, 0, 0);
  };

  // Helper: Add item line
  const addItem = (text: string) => {
    ensureSpace(8 * scaleFactor);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(baseFontSize);
    doc.text(`• ${text}`, leftMargin + 5, y);
    y += itemSpacing;
  };

  // Load and compress logo
  let logoData: { dataUrl: string; width: number; height: number } | null = null;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      const timeoutId = setTimeout(() => reject(new Error('Timeout')), 5000);
      
      image.onload = () => {
        clearTimeout(timeoutId);
        resolve(image);
      };
      image.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Failed to load'));
      };
      
      image.src = "/AQ_TRANSPARENT_LOGO.png";
    });

    const canvas = document.createElement('canvas');
    const maxWidth = 150;
    const scale = maxWidth / img.width;
    canvas.width = maxWidth;
    canvas.height = img.height * scale;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      logoData = {
        dataUrl: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height
      };
    }
  } catch (err) {
    console.warn('Logo failed to load:', err);
  }

  // === HEADER (Gray Background) ===
  doc.setFillColor(243, 244, 246);
  doc.rect(0, 0, pageWidth, 25, "F");

  if (logoData) {
    try {
      const logoWidth = 30;
      const aspectRatio = logoData.width / logoData.height;
      const logoHeight = logoWidth / aspectRatio;
      doc.addImage(logoData.dataUrl, "PNG", 15, 7, logoWidth, logoHeight);
    } catch (err) {
      console.warn('Failed to add logo:', err);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(43, 103, 119);
      doc.text("AQUARIA", 15, 14);
      doc.text("TECHNOLOGIES", 15, 19);
    }
  } else {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(43, 103, 119);
    doc.text("AQUARIA", 15, 14);
    doc.text("TECHNOLOGIES", 15, 19);
  }

  // Header info (right side)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  const infoX = pageWidth - 20;
  let infoY = 12;
  
  if (quoteNumber) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(43, 103, 119);
    doc.text(`QUOTE #${quoteNumber}`, infoX, infoY, { align: "right" });
    infoY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
  }
  doc.text(date, infoX, infoY, { align: "right" });
  infoY += 5;
  doc.text("600 Congress Ave, Austin, TX", infoX, infoY, { align: "right" });

  doc.setTextColor(0, 0, 0);

  // === CUSTOMER INFO ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(headerFontSize);
  doc.text(`Customer: ${customer.company || customer.contactName}`, leftMargin, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(baseFontSize);
  
  y += 5 * scaleFactor;
  
  if (customer.company && customer.contactName) {
    doc.text(`Contact: ${customer.contactName}`, leftMargin, y);
    y += 5 * scaleFactor;
  }
  
  const contactLine = [];
  if (customer.email) contactLine.push(`Email: ${customer.email}`);
  if (customer.phone) contactLine.push(`Phone: ${customer.phone}`);
  if (contactLine.length > 0) {
    doc.text(contactLine.join(" | "), leftMargin, y);
    y += 5 * scaleFactor;
  }
  
  doc.text(`Service Address: ${customer.serviceStreet}, ${customer.serviceCity}, ${customer.serviceState} ${customer.serviceZip}`, leftMargin, y);
  y += 5 * scaleFactor;
  
  if (customer.poNumber) {
    doc.text(`PO Number: ${customer.poNumber}`, leftMargin, y);
    y += 5 * scaleFactor;
  }

  y += 3 * scaleFactor;

  // === SYSTEM & EQUIPMENT ===
  const hasSystemItems = model;
  if (hasSystemItems) {
    addSectionHeader("SYSTEM & EQUIPMENT");
    
    if (model) {
      const modelNames: Record<string, string> = {
        s: 'Hydropack S',
        standard: 'Hydropack',
        x: 'Hydropack X'
      };
      addItem(`${modelNames[model]} (1)`);
      addItem('Shipping & Handling');
      if (mobility) addItem('Mobility Assistance');
    }
  }

  // === TANK & STORAGE ===
  const hasTankItems = tank;
  if (hasTankItems) {
    addSectionHeader("TANK & STORAGE");
    
    if (tank) {
      addItem(`${tank} Gallon Storage Tank (1)`);
      if (city) addItem(`Delivery to ${city}`);
      if (tankPad) addItem('Tank Concrete Pad');
    }
  }

  // === INSTALLATION SERVICES ===
  const hasInstallation = unitPad || trenchingSections.some(t => t.type && t.distance > 0) || 
                          ab_trenchingSections.some(t => t.type && t.distance > 0) || 
                          panelUpgrade || (pump && pumpPrices[pump]) || (demolition?.enabled && demolition?.distance > 0);
  
  if (hasInstallation) {
    addSectionHeader("INSTALLATION SERVICES");
    
    if (unitPad) addItem('Unit Concrete Pad');
    
    // Trenching
    const trenchLabels: Record<string, string> = {
      trench_elec: 'Electrical',
      trench_plumb: 'Plumbing',
      trench_comb: 'Combined Electrical + Plumbing'
    };
    
    trenchingSections.forEach(({ type, distance }) => {
      if (type && distance > 0) {
        addItem(`Trenching - ${trenchLabels[type]} (${distance} ft)`);
      }
    });
    
    // Above ground
    const abLabels: Record<string, string> = {
      ab_elec: 'Electrical',
      ab_plumb: 'Plumbing',
      ab_comb: 'Combined Electrical + Plumbing'
    };
    
    ab_trenchingSections.forEach(({ type, distance }) => {
      if (type && distance > 0) {
        addItem(`Above Ground Run - ${abLabels[type]} (${distance} ft)`);
      }
    });
    
    if (panelUpgrade === "panel") addItem('Electrical Panel Upgrade');
    if (panelUpgrade === "subpanel") addItem('Electrical Subpanel Upgrade');
    
    if (pump && pumpPrices[pump]) {
      const pumpNames: Record<string, string> = {
        dab: 'External Water Pump - DAB',
        mini: 'External Water Pump - DAB Mini'
      };
      addItem(`${pumpNames[pump] || 'External Water Pump'} (1)`);
      addItem('Pump Installation');
    }
    
    if (demolition?.enabled && demolition?.distance > 0) {
      addItem(`Demolition Services (${demolition.distance} ft)`);
    }
    
    // Bundle all hidden fees
    addItem('Professional Installation & Commissioning');
  }

  // === ADDITIONAL ITEMS ===
  const hasAdditionalItems = sensor || (filter && filterQty > 0) || connection;
  
  if (hasAdditionalItems) {
    addSectionHeader("ADDITIONAL ITEMS");
    
    if (sensor && sensorPrices[sensor]) {
      addItem('Tank Sensor (1)');
    }
    
    if (filter && filterQty > 0) {
      const filterNames: Record<string, string> = {
        s: 'Hydropack S',
        standard: 'Hydropack',
        x: 'Hydropack X'
      };
      addItem(`Extra ${filterNames[filter]} Filters (${filterQty})`);
    }
    
    if (connection === "2way-t-valve") addItem('Manual 2-way T-valve');
    if (connection === "3way-t-valve") addItem('Automatic 3-way T-valve');
  }

  // === WARRANTY ===
  if (warranty && warranty !== "standard") {
    addSectionHeader("WARRANTY");
    
    if (warranty === "warranty5") addItem('5-Year Extended Warranty');
    if (warranty === "warranty8") addItem('8-Year Extended Warranty');
  }

  // === CUSTOM ADJUSTMENTS ===
  if (enabledCustoms.length > 0) {
    addSectionHeader("ADDITIONAL ADJUSTMENTS");
    
    enabledCustoms.forEach(adj => {
      const label = adj.label || 'Adjustment';
      const noteText = adj.notes ? ` - ${adj.notes}` : '';
      addItem(`${label}${noteText}`);
    });
  }

  // === TOTALS ===
  y += 5 * scaleFactor;
  ensureSpace(40 * scaleFactor);
  
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, y, pageWidth - leftMargin, y);
  y += 10 * scaleFactor;

  const taxRate = 0.0825;
  const tax = baseTotal * taxRate;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(headerFontSize);
  
  // Subtotal
  doc.text("Subtotal:", pageWidth - 80, y);
  doc.text(`$${baseTotalStr}`, pageWidth - 20, y, { align: "right" });
  y += 7 * scaleFactor;

  // Tax
  doc.text("Tax (8.25%):", pageWidth - 80, y);
  doc.text(`$${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 20, y, { align: "right" });
  y += 7 * scaleFactor;

  // Discount (if active)
  if (isDiscountActive) {
    doc.setTextColor(194, 65, 12);
    doc.text(`${DISCOUNT_CAMPAIGN.label}:`, pageWidth - 80, y);
    doc.text(`-$${discountAmountStr}`, pageWidth - 20, y, { align: "right" });
    y += 10 * scaleFactor;
    doc.setTextColor(0, 0, 0);
  } else {
    y += 3 * scaleFactor;
  }

  // Total line
  doc.setDrawColor(55, 65, 81);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 85, y, pageWidth - 20, y);
  y += 8 * scaleFactor;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(totalFontSize);
  doc.text("TOTAL:", pageWidth - 80, y);
  doc.text(`$${discountedTotalStr}`, pageWidth - 20, y, { align: "right" });

  // === FOOTER ===
  doc.setFontSize(9 * scaleFactor);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(
    "Thank you for your interest in Aquaria. This quote is valid for 30 days.",
    pageWidth / 2,
    pageHeight - 15,
    { align: "center" }
  );

  // === SAVE PDF ===
  function sanitizeFilename(name: string) {
    return name
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[\\/:"*?<>|]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/ /g, "_")
      .slice(0, 180);
  }

  const dateISO = new Date().toISOString().slice(0, 10);
  const who = customer.company || customer.contactName || "Customer";
  const filename = sanitizeFilename(`Hydropack_Quote_${quoteNumber || dateISO}_${who}.pdf`);

  doc.save(filename);
};







  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <title>Aquaria Hydropack Quote</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center mb-6">
          Aquaria Hydropack Quote Generator
        </h1>
        <CustomerInfoPanel value={customer} onChange={(c) => { setCustomer(c); }} />

        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Hydropack Model</legend>
          <select
            id="model"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={model}
            onChange={(e) => {
            setModel(e.target.value);
            setQuoteIsStale(true);
            setShowFinancing(false);
        }}
          >
            <option value="">Select Model</option>
            <option value="s">Hydropack S</option>
            <option value="standard">Hydropack</option>
            <option value="x">Hydropack X</option>
          </select>

        
          <label className="flex items-center mt-2">
            <input
              id="unitPad"
              type="checkbox"
              className="mr-2"
              checked={unitPad}
            onChange={(e) => {
            setUnitPad(e.target.checked);
            setQuoteIsStale(true);
            setShowFinancing(false);
                          }}
            />
            Include concrete pad for unit
          </label>
          <label className="flex flex-col mt-2">
          <div className="flex items-center">
            <input
              id="mobility"
              type="checkbox"
              className="mr-2"
              checked={mobility}
              onChange={(e) => {
                setMobility(e.target.checked);
                setQuoteIsStale(true);
                setShowFinancing(false);
              }}
            />
            <span>Mobility assistance: unload unit off truck</span>
          </div>
          <p className="ml-6 mt-1 text-xs text-gray-600 italic">
            All full installation projects performed by Aquaria require mobility assistance due to liability considerations. 
            Mobility assistance is not required for unit-only purchases where Aquaria does not provide installation services.
          </p>
        </label>
        </fieldset>

        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Tank Selection</legend>
          <select
            id="tank"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={tank}
            onChange={(e) => {
            setTank(e.target.value);
            setQuoteIsStale(true);
            setShowFinancing(false);
                          }}
          >
            <option value="">None</option>
            <option value="500">500 gallon</option>
            <option value="1550">1550 gallon</option>
            <option value="3000">3000 gallon</option>
            <option value="5000">5000 gallon</option>
          </select>
          <label className="flex items-center mt-2">
            <input
            id="tankPad"
            type="checkbox"
            className="mr-2"
            checked={tankPad}
            onChange={(e) => {
            setTankPad(e.target.checked);
            setQuoteIsStale(true);
            setShowFinancing(false);
                          }}
            />
            Include concrete pad for tank
          </label>
        </fieldset>

        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Nearest City</legend>
          <select
            id="city"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={city}
            onChange={(e) => {
            setCity(e.target.value);
            setQuoteIsStale(true);
            setShowFinancing(false);
                          }}
          >
            <option value="">Select City</option>
            <option value="Austin">Austin</option>
            <option value="Corpus Christi">Corpus Christi</option>
            <option value="Dallas">Dallas</option>
            <option value="Houston">Houston</option>
            <option value="San Antonio">San Antonio</option>
          </select>
        </fieldset>

        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Tank Sensor</legend>
          <select
            id="sensor"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={sensor}
            onChange={(e) => {
            setSensor(e.target.value);
            setQuoteIsStale(true);
            setShowFinancing(false);
                          }}
            
          >
            <option value="">None</option>
            <option value="normal">Normal</option>
          </select>
        </fieldset>

      <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
  <legend className="font-semibold px-2">Extra Filter(s)</legend>
  
  <div className="flex items-center gap-4 mt-2">
    <select
      id="filter"
      className="p-2 border border-gray-300 rounded flex-grow"
      value={filter}
      onChange={(e) => {
        setFilter(e.target.value);
        setQuoteIsStale(true);
        setShowFinancing(false);
      }}
    >
      <option value="">None</option>
      <option value="s">Hydropack S</option>
      <option value="standard">Hydropack</option>
      <option value="x">Hydropack X</option>
    </select>

    <div className="flex items-center">
      <input
        id="filterQty"
        type="number"
        min="0"
        className="p-2 border border-gray-300 rounded w-20"
        value={filterQty}
        onChange={(e) => {
          const val = e.target.value.replace(/^0+/, '') || '0';
          setFilterQty(parseInt(val, 10) || 0);
          setQuoteIsStale(true);
          setShowFinancing(false);
          }}
      />
      <span className="ml-2">Qty</span>
    </div>
  </div>
</fieldset>

        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">External Water Pump</legend>
          <select
            id="pump"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={pump}
            onChange={(e) => {
            setPump(e.target.value);
            setQuoteIsStale(true);
            setShowFinancing(false);
                          }}
          >
            <option value="">None</option>
            <option value="mini">DAB Mini</option>
          </select>
        </fieldset>

        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Connection Type</legend>
          <select
            id="connection"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={connection}
            onChange={(e) => {
            setConnection(e.target.value);
            setQuoteIsStale(true);
            setShowFinancing(false);
                          }}
          >
            <option value="">None</option>
            <option value="2way-t-valve">Manual 2-way T-valve</option>
            <option value="3way-t-valve">Automatic 3-way T-valve</option>
          </select>
        </fieldset>

<fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
  <legend className="font-semibold px-2">Trenching Sections</legend>

  {/* Wrapper so the overlay positions over this block */}
  <div className="relative isolate overflow-hidden">
    {trenchingSections.map((section, index) => (
      <div
        key={index}
        className="w-full flex flex-wrap md:flex-nowrap items-start gap-4 p-4 border border-gray-300 rounded-md bg-white"
      >
        {/* Material */}
        <div className="flex flex-col flex-1 min-w-[140px]">
          <label className="text-sm font-medium text-gray-600 mb-1">Material</label>
          <select
            className="border border-gray-300 rounded px-2 py-1"
            value={section.type}
            onChange={(e) => {
              const updated = [...trenchingSections];
              updated[index].type = e.target.value;
              setTrenchingSections(updated);
              setQuoteIsStale(true);
              setShowFinancing(false);
              // (Optional) you can trigger egg here too, but distance is enough.
            }}
          >
            <option value="">Select</option>
            <option value="trench_elec">Electrical</option>
            <option value="trench_plumb">Plumbing</option>
            <option value="trench_comb">Combined Electrical + Plumbing</option>
          </select>
        </div>

        {/* Distance */}
        <div className="flex flex-col flex-1 min-w-[140px]">
          <label className="text-sm font-medium text-gray-600 mb-1">Distance (ft)</label>
          <input
            type="number"
            min="0"
            className="border border-gray-300 rounded px-2 py-1"
            value={section.distance}
            onChange={(e) => {
              const val = e.target.value.replace(/^0+/, '') || '0';
              const updated = [...trenchingSections];
              updated[index].distance = parseFloat(val) || 0;
              setTrenchingSections(updated);
              setQuoteIsStale(true);
              setShowFinancing(false);
            }}
            onBlur={() => {
              const egg = checkEasterEgg({ trenchingSections, ab_trenchingSections });
              if (egg) showEgg(egg.message, egg.duration);
            }}
          />

        </div>

        {/* Remove Button */}
        <button
          type="button"
          className="text-red-500 text-xl px-2 mt-6 md:mt-0"
          onClick={() => {
            const updated = trenchingSections.filter((_, i) => i !== index);
            setTrenchingSections(updated);
            setQuoteIsStale(true);
            setShowFinancing(false);
          }}
        >
          ✕
        </button>
      </div>
    ))}

    <button
      type="button"
      className="text-sm text-blue-600 mt-2"
      onClick={() =>
        setTrenchingSections([...trenchingSections, { type: "", distance: 0 }])
      }
    >
      + Add Another Section
    </button>

    {/* The overlay sits above the whole Trenching block */}
    <EasterEggOverlay message={easterEggMsg} />
  </div>
</fieldset>


<fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
  <legend className="font-semibold px-2">Above-Ground Runs</legend>
  {ab_trenchingSections.map((section, index) => (
    <div
      key={index}
      className="w-full flex flex-wrap md:flex-nowrap items-start gap-4 p-4 border border-gray-300 rounded-md bg-white"
    >
      {/* Material */}
      <div className="flex flex-col flex-1 min-w-[140px]">
        <label className="text-sm font-medium text-gray-600 mb-1">Material</label>
        <select
          className="border border-gray-300 rounded px-2 py-1"
          value={section.type}
      onChange={(e) => {
        const updated = [...ab_trenchingSections];
        updated[index].type = e.target.value; // not distance
        setab_TrenchingSections(updated);
        setQuoteIsStale(true);
        setShowFinancing(false);
        const egg = checkEasterEgg({ trenchingSections, ab_trenchingSections: updated });
        if (egg) showEgg(egg.message, egg.duration);
      }}




        >
          <option value="">Select</option>
          <option value="ab_elec">Electrical</option>
          <option value="ab_plumb">Plumbing</option>
          <option value="ab_comb">Combined Electrical + Plumbing</option>
        </select>
      </div>

      {/* Distance */}
      <div className="flex flex-col flex-1 min-w-[140px]">
        <label className="text-sm font-medium text-gray-600 mb-1">Distance (ft)</label>
        <input
          type="number"
          min="0"
          className="border border-gray-300 rounded px-2 py-1"
          value={section.distance}
          onChange={(e) => {
            const val = e.target.value.replace(/^0+/, '') || '0';
            const updated = [...ab_trenchingSections];
            updated[index].distance = parseFloat(val) || 0;
            setab_TrenchingSections(updated);
            setQuoteIsStale(true);
            setShowFinancing(false);
          }}
          onBlur={() => {
            const egg = checkEasterEgg({ trenchingSections, ab_trenchingSections });
            if (egg) showEgg(egg.message, egg.duration);
          }}
        />

      </div>

      {/* Remove Button */}
      <button
        type="button"
        className="text-red-500 text-xl px-2 mt-6 md:mt-0"
        onClick={() => {
          const updated = ab_trenchingSections.filter((_, i) => i !== index);
          setab_TrenchingSections(updated);
          setQuoteIsStale(true);
          setShowFinancing(false);
        }}
      >
        ✕
      </button>
    </div>
  ))}
  <button
    type="button"
    className="text-sm text-blue-600 mt-2"
    onClick={() =>
      setab_TrenchingSections([...ab_trenchingSections, { type: "", distance: 0 }])
    }
  >
    + Add Another Section
  </button>
</fieldset>



<fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
  <legend className="font-semibold px-2">Add-ons</legend>
  <select
    id="panelUpgrade"
    className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
    value={panelUpgrade}
    onChange={(e) => {
            setPanelUpgrade(e.target.value);
            setQuoteIsStale(true);
            setShowFinancing(false);
          }}
  >
  <option value="">None</option>
  <option value="panel">Panel Upgrade</option>
  <option value="subpanel">Subpanel Upgrade</option>
  </select>
</fieldset>

<fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
  <legend className="font-semibold px-2">Warranty Options</legend>
  <select
    id="WarrantyOptions"
    className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
    value={warranty}
    onChange={(e) => {
            setWarranty(e.target.value);
            setQuoteIsStale(true);
            setShowFinancing(false);
                          }}
  >
    <option value="standard">Standard (Included)</option>
    <option value="warranty5">5-Year Extended Warranty</option>
    <option value="warranty8">8-Year Extended Warranty</option>
  </select>
</fieldset>

<fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
  <legend className="font-semibold px-2">Demolition</legend>

  <div className="flex items-center gap-4">
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={demolition.enabled}
        onChange={(e) => {
          setDemolition({ ...demolition, enabled: e.target.checked });
          setQuoteIsStale(true);
          setShowFinancing(false);
        }}
      />
      Include demolition (in ft)
    </label>

    {demolition.enabled && (
      <input
        type="number"
        className="border border-gray-300 rounded px-2 py-1"
        placeholder="Distance (ft)"
        min={0}
        value={demolition.distance}
        onChange={(e) => {
          const val = e.target.value.replace(/^0+/, '') || '0';
          setDemolition({ ...demolition, distance: Number(val) });
          setQuoteIsStale(true);
          setShowFinancing(false);
        }}
      />
    )}
  </div>
</fieldset>

<CustomAdjustmentsGroup
  items={customAdjs}
  onChange={setCustomAdjs}
  onDirty={markDirty}
/>
        

{originalTotal !== null && (
  <>
    <hr className="my-6 border-t border-gray-300" />

    <div className="space-y-2 text-center">

      {/* When discount IS active */}
      {isDiscountOn && discountedTotal !== null && discountAmount > 0 ? (
        <>
          {/* Original Total */}
          <p className="text-sm font-medium text-gray-500">
            Original Total:{" "}
            <span className="font-semibold">
              ${originalTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>

          {/* Discount */}
          <p className="text-sm text-gray-600">
            {DISCOUNT_CAMPAIGN.label}:{" "}
            <span className="font-semibold text-amber-600">
              -$
              {discountAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>

          {/* Discounted Total */}
          <p className="text-2xl font-semibold text-gray-800">
            Discounted Total:{" "}
            <span className="text-green-600">
              ${discountedTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
        </>
      ) : (
        /* When discount is NOT active — show only one total */
        <p className="text-2xl font-semibold text-gray-800">
          Total:{" "}
          <span className="text-green-600">
            ${originalTotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </p>
      )}
    </div>
  </>
)}




<button
  type="button"
  onClick={resetAll}
  className="block w-full py-3 mt-4 text-lg bg-gray-100 text-gray-800 rounded border border-gray-300 hover:bg-gray-200"
>
  Clear All Fields
</button>

<button
  className="block w-full py-3 mt-3 text-lg bg-green-600 text-white rounded hover:bg-green-700"
  onClick={calculateTotal}
>
  {quoteIsStale ? "Calculate Total" : "Calculate Total"}
</button>

{DISCOUNT_FEATURE_ENABLED && (
  <button
    type="button"
    onClick={() => {
      setDiscountActive((prev) => {
        const next = !prev;

        if (originalTotal !== null) {
          if (next) {
            const discAmount = originalTotal * DISCOUNT_CAMPAIGN.rate;
            const discTotal = originalTotal - discAmount;

            setDiscountAmount(discAmount);
            setDiscountedTotal(discTotal);
            setQuoteTotal(discTotal);
            setTotal(discTotal);
          } else {
            setDiscountAmount(0);
            setDiscountedTotal(null);
            setQuoteTotal(originalTotal);
            setTotal(originalTotal);
          }
        }

        return next;
      });
    }}
    className={`w-full py-2 mt-3 rounded text-white ${
      discountActive
        ? "bg-gray-600 hover:bg-gray-700"
        : "bg-gray-400 hover:bg-gray-500"
    }`}
  >
    {discountActive
      ? "Disable Winter Storm Discount"
      : "Enable Winter Storm Discount"}
  </button>
  
)}

<button
  disabled={quoteTotal === null || quoteIsStale}
  className={`block w-full py-3 mt-3 text-lg rounded text-white ${
    quoteTotal === null || quoteIsStale
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-blue-600 hover:bg-blue-700'
  }`}
  onClick={() => {
    if (quoteTotal === null || quoteIsStale) {
      alert("Please click 'Calculate Total' after making changes before downloading your quote.");
      return;
    }
    downloadPDF();
  }}
>
  Download Quote PDF
</button>

<button
  onClick={() => {
  if (quoteTotal === null || quoteIsStale) {
    alert("Please click 'Calculate Total' before viewing financing options.");
    return;
  }

  setShowFinancing((prev) => {
    const next = !prev;
    if (next) {
      setTimeout(() => {
        financingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    return next;
  });
}}

  className="block w-full py-3 mt-3 text-lg bg-gray-600 text-white rounded text-center hover:bg-gray-700"
>
  {showFinancing ? "Hide Financing Calculator" : "See Financing Options"}
</button>

<div
  ref={financingRef}
  className={`transition-all duration-500 ease-in-out transform ${
    showFinancing
      ? 'opacity-100 translate-y-0 max-h-[1000px] mb-3'
      : 'opacity-0 -translate-y-4 max-h-0 overflow-hidden'
  }`}
>
  {showFinancing && <FinancingCalculator totalAmount={total} />}
</div>

<button
  type="button"
  disabled={quoteTotal === null || quoteIsStale}
  onClick={saveCurrentQuote}
  className={`block w-full py-3 mt-3 text-lg rounded text-white ${
    quoteTotal === null || quoteIsStale
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-green-600 hover:bg-green-700'
  }`}
>
  {currentQuoteId ? 'Update Saved Quote' : 'Save Quote'}
</button>

{quoteNumber && (
  <p className="text-center text-sm text-gray-600 mt-2">
    Quote #: <strong>{quoteNumber}</strong>
  </p>
)}

<SavedQuotesList 
  onLoadQuote={loadQuote}
  partnerId={currentPartner?.partner_code}
/>

      </div>
    </>
  );
};

export default HomePage;