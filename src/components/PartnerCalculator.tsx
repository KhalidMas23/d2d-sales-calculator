"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import '../app/globals.css';
import Head from "next/head";
import { 
  saveQuote,
  updateQuote,
  generateQuoteNumber,
  getFeatureConfig,  // ADDED THIS LINE
  type Partner,
  type Quote,
  type QuoteConfig
} from '@/lib/supabase';
import FinancingCalculator from "@/components/FinancingCalculator";
import type { CustomAdjustment } from "@/components/CustomAdjustmentBox";
import CustomAdjustmentsGroup from "@/components/CustomAdjustmentsGroup";
import { checkEasterEgg, EasterEggOverlay } from "@/components/EasterEggs";
import CustomerInfoPanel, {
  CustomerInfo,
  REQUIRED_CUSTOMER_KEYS
} from "@/components/CustomerInfoPanel";
import SavedQuotesList from "@/components/SavedQuotesList";

interface PartnerCalculatorProps {
  partner: Partner;
}

interface ModelPriceStructure {
  system: number;
  ship: number;
  pad: number;
  mobility: number;
  warranty5: number;
  warranty8: number;
  install: number;
  warrantys: number;
}

const DISCOUNT_FEATURE_ENABLED = false;
const DISCOUNT_CAMPAIGN = {
  label: "End of Year Discount",
  rate: 0.13,
};

export default function PartnerCalculator({ partner }: PartnerCalculatorProps) {
  // Get partner pricing or use defaults
  const partnerPricing = partner.pricing_overrides || {};
  
  // GET FEATURE CONFIG - ADDED THIS LINE
  const featureConfig = getFeatureConfig(partner);
  
  // Apply partner pricing overrides (or use Aquaria defaults)
  const modelPrices: Record<string, ModelPriceStructure> = (partnerPricing.modelPrices as Record<string, ModelPriceStructure>) || {
    s: { system: 9999, ship: 645, pad: 1750, mobility: 500, warranty5: 999, warranty8: 1499, install: 0, warrantys: 0 },
    standard: { system: 17499, ship: 1095, pad: 1850, mobility: 500, warranty5: 1749, warranty8: 2599, install: 0, warrantys: 0 },
    x: { system: 29999, ship: 1550, pad: 2100, mobility: 1000, warranty5: 2999, warranty8: 4499, install: 0, warrantys: 0 },
  };

  const tankPrices: Record<string, number> = (partnerPricing.tankPrices as Record<string, number>) || {
    "500": 770.9, "1550": 1430.35, "3000": 2428.9, "5000": 5125.99
  };

  const tankPads: Record<string, number> = (partnerPricing.tankPads as Record<string, number>) || {
    "500": 1750, "1550": 1850, "3000": 2300, "5000": 4200
  };

  const cityDelivery: Record<string, number> = (partnerPricing.cityDelivery as Record<string, number>) || {
    Austin: 999, "Corpus Christi": 858, Dallas: 577.5, Houston: 200, "San Antonio": 660
  };

  const sensorPrices: Record<string, number> = (partnerPricing.sensorPrices as Record<string, number>) || { "": 0, normal: 35 };
  const filterPrices: Record<string, number> = (partnerPricing.filterPrices as Record<string, number>) || { s: 100, standard: 150, x: 200 };
  const pumpPrices: Record<string, number> = (partnerPricing.pumpPrices as Record<string, number>) || { dab: 1900, mini: 800, "": 0 };

  const trenchRates: Record<string, number> = (partnerPricing.trenchRates as Record<string, number>) || {
    trench_elec: 32.5, trench_plumb: 58.5, trench_comb: 65.5, "": 0
  };

  const ab_trenchRates: Record<string, number> = (partnerPricing.ab_trenchRates as Record<string, number>) || {
    ab_elec: 35.5, ab_plumb: 26.5, ab_comb: 35.5, "": 0
  };

  // Brand colors
  const primaryColor = partner.primary_color || '#2B6777';
  const accentColor = partner.accent_color || '#52AB98';

  // State hooks
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
  const [trenchingSections, setTrenchingSections] = useState([{ type: "", distance: 0 }]);
  const [ab_trenchingSections, setab_TrenchingSections] = useState([{ type: "", distance: 0 }]);
  const [panelUpgrade, setPanelUpgrade] = useState<string>("");
  const [warranty, setWarranty] = useState<string>("standard");
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [showFinancing, setShowFinancing] = useState(false);
  const [quoteIsStale, setQuoteIsStale] = useState<boolean>(true);
  const financingRef = useRef<HTMLDivElement>(null);
  const [demolition, setDemolition] = useState<{ enabled: boolean; distance: number }>({
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
    poNumber: "",
  });
  const [originalTotal, setOriginalTotal] = useState<number | null>(null);
  const [discountedTotal, setDiscountedTotal] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountActive, setDiscountActive] = useState<boolean>(DISCOUNT_FEATURE_ENABLED);
  const isDiscountOn = DISCOUNT_FEATURE_ENABLED && discountActive;
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem("aq_customer");
      if (saved) setCustomer(JSON.parse(saved));
    } catch {}
  }, []);

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

  const getTotal = () => {
    const ADM = 500;
    const COMM = 2500;
    const AQM = 500;
    const DISP = 200;
    const net30 = 100;

    let subtotal = 0;
    let taxable = 0;
    let installTotal = 0;
    let hasSelections = false;
    let hasInstallOptions = false;

    if (model) {
      subtotal += modelPrices[model].system;
      subtotal += modelPrices[model].ship;
      if (mobility) subtotal += modelPrices[model].mobility;
      hasSelections = true;
    }

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

    if (tank) {
      const tCost = tankPrices[tank] || 0;
      subtotal += tCost;
      taxable += tCost;
      if (city && cityDelivery[city]) subtotal += cityDelivery[city];
      hasSelections = true;
    }

    if (sensor) {
      const sCost = sensorPrices[sensor] || 0;
      if (sCost > 0) hasSelections = true;
      subtotal += sCost;
      taxable += sCost;
    }

    if (filter && filterQty > 0) {
      const fCost = (filterPrices[filter] || 0) * filterQty;
      subtotal += fCost;
      taxable += fCost;
      hasSelections = true;
    }

    if (pump) {
      const pCost = (pumpPrices[pump] || 0);
      const pInstCost = 200;
      if (pCost > 0) hasSelections = true;
      subtotal += pCost;
      taxable += pCost;
      installTotal += pInstCost;
    }

    if (warranty && warranty !== "standard" && model) {
      if (warranty === "warranty5" || warranty === "warranty8") {
        const wCost = modelPrices[model]?.[warranty as keyof ModelPriceStructure] || 0;
        subtotal += Number(wCost);
        hasSelections = true;
      }
    }

    if (demolition?.enabled && demolition?.distance > 0) {
      const demoCost = demolition.distance * 150;
      installTotal += demoCost;
      hasSelections = true;
    }

    if (hasSelections) {
      subtotal += ADM + net30;
    }

    if (hasInstallOptions) {
      installTotal += COMM + AQM + DISP;
    }

    const enabledCustoms = customAdjs.filter((c) => c.enabled && Number(c.amount) !== 0);
    if (enabledCustoms.length > 0) {
      const customSum = enabledCustoms.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      subtotal += customSum;
      hasSelections = true;
    }

    const taxRate = 0.0825;
    const tax = taxable * taxRate;
    const finalTotal = subtotal + installTotal + tax;
    return finalTotal;
  };

  function resetAll() {
    if (!confirm("Clear all fields and reset this quote?")) return;

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
    setQuoteTotal(null);
    setTotal(0);
    setShowFinancing(false);
    setQuoteIsStale(true);
    setOriginalTotal(null);
    setDiscountedTotal(null);
    setDiscountAmount(0);
    setDiscountActive(DISCOUNT_FEATURE_ENABLED);
    setCustomer({
      company: "",
      contactName: "",
      email: "",
      phone: "",
      serviceStreet: "",
      serviceCity: "",
      serviceState: "",
      serviceZip: "",
      poNumber: "",
    });
    try {
      localStorage.removeItem("aq_customer");
    } catch {}
    setEasterEggMsg(null);
  }

  const calculateTotal = () => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const baseTotal = getTotal();
    setOriginalTotal(baseTotal);

    const applyDiscount = isDiscountOn;

    if (applyDiscount) {
      const discAmount = baseTotal * DISCOUNT_CAMPAIGN.rate;
      const discTotal = baseTotal - discAmount;
      setDiscountAmount(discAmount);
      setDiscountedTotal(discTotal);
      setQuoteTotal(discTotal);
      setTotal(discTotal);
    } else {
      setDiscountAmount(0);
      setDiscountedTotal(null);
      setQuoteTotal(baseTotal);
      setTotal(baseTotal);
    }

    setQuoteIsStale(false);
  };

  const saveCurrentQuote = async () => {
    const missing = REQUIRED_CUSTOMER_KEYS.filter(
      k => !customer[k] || String(customer[k]).trim() === ""
    );
    
    if (missing.length) {
      alert("Please complete required customer fields before saving.");
      return;
    }

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

      const partnerPricingToSave = {
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
        quote_number: quoteNumber || generateQuoteNumber(partner.partner_code),
        customer_company: customer.company || null,
        customer_name: customer.contactName,
        customer_email: customer.email || null,
        customer_phone: customer.phone || null,
        service_street: customer.serviceStreet,
        service_city: customer.serviceCity,
        service_state: customer.serviceState,
        service_zip: customer.serviceZip,
        po_number: customer.poNumber || null,
        partner_id: partner.partner_code,
        partner_name: partner.company_name,
        partner_logo_url: partner.logo_url || null,
        quote_config: quoteConfig,
        original_total: originalTotal,
        discount_amount: discountAmount,
        final_total: total,
        partner_pricing: partnerPricingToSave,
        status: 'draft' as const,
        notes: null,
      };

      let savedQuote;
      
      if (currentQuoteId) {
        savedQuote = await updateQuote(currentQuoteId, quoteData);
        alert(`Quote ${savedQuote?.quote_number} updated successfully!`);
      } else {
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

    setOriginalTotal(quote.original_total);
    setDiscountAmount(quote.discount_amount);
    setTotal(quote.final_total);
    setQuoteTotal(quote.final_total);
    
    if (quote.discount_amount > 0) {
      setDiscountedTotal(quote.final_total);
      setDiscountActive(true);
    }

    setCurrentQuoteId(quote.id!);
    setQuoteNumber(quote.quote_number);
    
    setQuoteIsStale(false);
    setShowFinancing(false);

    alert(`Loaded quote ${quote.quote_number}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

    const jsPDF = (window as unknown as { jspdf?: { jsPDF: unknown } }).jspdf?.jsPDF;
    if (!jsPDF) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = new (jsPDF as any)("p", "mm", "a4");
    const date = new Date().toLocaleDateString("en-US");
    const baseTotal = originalTotal ?? total;
    const isDiscountActive = DISCOUNT_FEATURE_ENABLED && discountActive && originalTotal !== null && discountedTotal !== null && discountedTotal !== originalTotal;

    const baseTotalStr = baseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const discountAmountStr = isDiscountActive ? (discountAmount || baseTotal - (discountedTotal as number)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
    const discountedTotalStr = (isDiscountActive ? discountedTotal : baseTotal)!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 40;
    const leftX = 20;

    function ensureSpace(needs: number) {
      if (y + needs > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    }

    const addSectionHeader = (title: string) => {
      ensureSpace(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(43, 103, 119);
      doc.text(title, leftX, y);
      y += 3;
      doc.setDrawColor(200);
      doc.line(leftX, y, pageWidth - leftX, y);
      y += 8;
      doc.setTextColor(0, 0, 0);
    };

    const addLine = (label: string, value: string) => {
      ensureSpace(10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`${label}:`, leftX + 5, y);
      doc.text(value, 95, y, { maxWidth: pageWidth - 110 });
      y += 7;
    };

    const addService = (component: string, qty: string, description: string) => {
      ensureSpace(10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(component, leftX + 5, y, { maxWidth: 65 });
      doc.text(qty, 95, y);
      doc.text(description, 120, y, { maxWidth: pageWidth - 140 });
      y += 7;
    };

    const safeGetText = (sel: string) => {
      const el = document.querySelector(sel) as HTMLOptionElement | null;
      return (el?.textContent || "None").trim();
    };

    // Load partner logo or use Aquaria logo
    const logoUrl = partner.logo_url || "https://raw.githubusercontent.com/KhalidMas23/Aquaria-Calculator/52de119ecbc4d4910952b0384c5092621f70e62d/AQ_TRANSPARENT_LOGO.png";

    const logo = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = logoUrl;
  });


    doc.setFillColor(243, 244, 246);
    doc.rect(0, 0, pageWidth, 25, "F");

    const logoWidth = 35;
    const aspectRatio = logo.width / logo.height;
    const logoHeight = logoWidth / aspectRatio;
    doc.addImage(logo, "PNG", 15, 5, logoWidth, logoHeight);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    const infoX = pageWidth - 80;
    let infoY = 12;
    
    // Use partner contact info or default
    const address = partner.display_address || "600 Congress Ave, Austin, TX 78701";
    doc.text(address, infoX, infoY);
    infoY += 6;
    doc.text(`Quote Generated: ${date}`, infoX, infoY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(43, 103, 119);
    doc.text("Customer", leftX, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    let custY = 36;
    const addr = `${customer.serviceStreet}, ${customer.serviceCity}, ${customer.serviceState} ${customer.serviceZip}`;
    
    doc.text(customer.company ? `${customer.company}` : `${customer.contactName}`, leftX, custY); custY += 5;
    if (customer.company) { doc.text(`Attn: ${customer.contactName}`, leftX, custY); custY += 5; }
    if (customer.phone) { doc.text(`Phone: ${customer.phone}`, leftX, custY); custY += 5; }
    if (customer.email) { doc.text(`Email: ${customer.email}`, leftX, custY); custY += 5; }
    doc.text(`Service: ${addr}`, leftX, custY); custY += 5;
    if (customer.poNumber) { doc.text(`PO / Project: ${customer.poNumber}`, leftX, custY); custY += 5; }

    y = Math.max(y, custY + 6);

    addSectionHeader("Main Product");
    const modelText = model ? safeGetText(`#model option[value='${model}']`) : "None";
    addLine("Hydropack Model", modelText);

    addSectionHeader("Tank Selection");
    const tankText = tank ? safeGetText(`#tank option[value='${tank}']`) : "None";
    addLine("Selected Tank", tankText);

    addSectionHeader("Additional Filters");
    const filterText = filter ? safeGetText(`#filter option[value='${filter}']`) : "None";
    addLine("Extra Filter(s)", `${filterText} x${filterQty}`);

    addSectionHeader("Shipping/Handling");
    addLine("Nearest City", city || "None");

    addSectionHeader("Additional Services");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Component", leftX + 5, y);
    doc.text("Qty", 95, y);
    doc.text("Description", 120, y);
    y += 7;
    doc.setFont("helvetica", "normal");

    if (unitPad) addService("Unit Concrete Pad", "1", "Concrete base for main system");
    if (tankPad) addService("Tank Concrete Pad", "1", "Concrete base for tank support");

    const trenchLabels: Record<string, string> = {
      trench_elec: "Trenching - Electrical",
      trench_plumb: "Trenching - Plumbing",
      trench_comb: "Trenching - Combined",
    };
    const ab_trenchLabels: Record<string, string> = {
      ab_elec: "Above Ground - Electrical",
      ab_plumb: "Above Ground - Plumbing",
      ab_comb: "Above Ground - Combined",
    };

    const trenchingLines = trenchingSections.filter((s) => s.type && s.distance > 0);
    trenchingLines.forEach(({ type, distance }) => {
      const label = trenchLabels[type] || type;
      addService(label, `${distance} ft`, "Trenching Services");
    });

    const ab_trenchingLines = ab_trenchingSections.filter((s) => s.type && s.distance > 0);
    ab_trenchingLines.forEach(({ type, distance }) => {
      const label = ab_trenchLabels[type] || type;
      addService(label, `${distance} ft`, "Trenching Services");
    });

    if (connection === "2way-t-valve") addService("Connection Type", "", "Manual 2-way T-valve install");
    if (connection === "3way-t-valve") addService("Connection Type", "", "Automatic 3-way T-valve install");

    if (panelUpgrade === "panel") addService("Panel Upgrade", "", "Electrical panel enhancement");
    else if (panelUpgrade === "subpanel") addService("Subpanel Upgrade", "", "Electrical subpanel support");

    const enabledCustoms = customAdjs.filter((c) => c.enabled && c.label.trim() !== "" && Number(c.amount) !== 0);
    if (enabledCustoms.length > 0) {
      addSectionHeader("Custom Adjustments");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("Component", leftX + 5, y);
      doc.text("Amount", 95, y);
      doc.text("Notes", 120, y);
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const lineHeight = 6;

      enabledCustoms.forEach((c) => {
        ensureSpace(lineHeight + 6);
        const labelText = (c.label || "").trim();
        const amtStr = (c.amount >= 0 ? "+$" : "-$") + Math.abs(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const notes = (c.notes || "").trim();
        const wrappedNotes = notes ? doc.splitTextToSize(notes, pageWidth - 20 - 120) : [""];

        doc.text(labelText || "—", leftX + 5, y, { maxWidth: 65 });
        doc.text(amtStr, 95, y);
        doc.text(wrappedNotes, 120, y);

        const rowHeight = wrappedNotes.length * lineHeight;
        y += rowHeight + 2;
      });
    }

    addSectionHeader("Warranty");
    if (warranty === "warranty5") addService("5-Year Extended Warranty", "", "Extended protection for system");
    else if (warranty === "warranty8") addService("8-Year Extended Warranty", "", "Extended protection for system");
    else addService("Standard Warranty", "", "Basic coverage included at no cost");

    addSectionHeader("8.25% Sales Tax");

    ensureSpace(25);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);

    if (isDiscountActive) {
      doc.setFontSize(10);
      doc.text(`Original Total: $${baseTotalStr}`, pageWidth - 20, y, { align: "right" });
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`${DISCOUNT_CAMPAIGN.label}: -$${discountAmountStr}`, pageWidth - 20, y, { align: "right" });
      y += 6;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.text(`Total after Discount: $${discountedTotalStr}`, pageWidth - 20, y, { align: "right" });
      y += 2;
    } else {
      doc.setFontSize(13);
      doc.text(`Total: $${baseTotalStr}`, pageWidth - 20, y, { align: "right" });
      y += 2;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(
      `Thank you for your interest in ${partner.company_name}. This quote is valid for 30 days. Aquaria Atmospheric Water Generator units are exempt from sales tax.`,
      pageWidth / 2,
      pageHeight - 12,
      { align: "center", maxWidth: pageWidth - 40 }
    );

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
    const serviceAddr = `${customer.serviceStreet} ${customer.serviceCity} ${customer.serviceState} ${customer.serviceZip}`.trim();
    const who = customer.company || customer.contactName || "Customer";
    const filename = sanitizeFilename(`Hydropack_Quote_${who}_${serviceAddr}_${dateISO}.pdf`);

    doc.save(filename);
  };

  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <title>{partner.company_name} - Hydropack Quote Generator</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      {/* Partner Header */}
      <div 
        className="w-full py-4 px-6 shadow-md"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {partner.logo_url ? (
            <Image 
              src={partner.logo_url} 
              alt={partner.company_name}
              width={200}
              height={48}
              className="h-12 w-auto object-contain bg-white px-2 py-1 rounded"
            />
          ) : (
            <h1 className="text-2xl font-bold text-white">
              {partner.company_name}
            </h1>
          )}
          <div className="text-white text-sm text-right">
            {partner.display_phone && <div>{partner.display_phone}</div>}
            {partner.display_email && <div>{partner.display_email}</div>}
            {partner.display_website && <div>{partner.display_website}</div>}
          </div>
        </div>
      </div>


      <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center mb-6">
          Hydropack Quote Generator
        </h1>
        <CustomerInfoPanel value={customer} onChange={(c) => { setCustomer(c); }} />

        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Hydropack Model</legend>
          <select
            id="model"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={model}
            onChange={(e) => { setModel(e.target.value); markDirty(); }}
          >
            <option value="">Select Model</option>
            {featureConfig.enabledModels.includes('s') && <option value="s">Hydropack S</option>}
            {featureConfig.enabledModels.includes('standard') && <option value="standard">Hydropack</option>}
            {featureConfig.enabledModels.includes('x') && <option value="x">Hydropack X</option>}
          </select>

          <label className="flex items-center mt-2">
            <input
              id="unitPad"
              type="checkbox"
              className="mr-2"
              checked={unitPad}
              onChange={(e) => { setUnitPad(e.target.checked); markDirty(); }}
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
                onChange={(e) => { setMobility(e.target.checked); markDirty(); }}
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
            onChange={(e) => { setTank(e.target.value); markDirty(); }}
          >
            <option value="">None</option>
            {featureConfig.enabledTanks.includes('500') && <option value="500">500 gallon</option>}
            {featureConfig.enabledTanks.includes('1550') && <option value="1550">1550 gallon</option>}
            {featureConfig.enabledTanks.includes('3000') && <option value="3000">3000 gallon</option>}
            {featureConfig.enabledTanks.includes('5000') && <option value="5000">5000 gallon</option>}
          </select>
          <label className="flex items-center mt-2">
            <input
              id="tankPad"
              type="checkbox"
              className="mr-2"
              checked={tankPad}
              onChange={(e) => { setTankPad(e.target.checked); markDirty(); }}
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
            onChange={(e) => { setCity(e.target.value); markDirty(); }}
          >
            <option value="">Select City</option>
            {featureConfig.enabledCities.includes('Austin') && <option value="Austin">Austin</option>}
            {featureConfig.enabledCities.includes('Corpus Christi') && <option value="Corpus Christi">Corpus Christi</option>}
            {featureConfig.enabledCities.includes('Dallas') && <option value="Dallas">Dallas</option>}
            {featureConfig.enabledCities.includes('Houston') && <option value="Houston">Houston</option>}
            {featureConfig.enabledCities.includes('San Antonio') && <option value="San Antonio">San Antonio</option>}
          </select>
        </fieldset>

        {featureConfig.enableSensors && (
        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Tank Sensor</legend>
          <select
            id="sensor"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={sensor}
            onChange={(e) => { setSensor(e.target.value); markDirty(); }}
          >
            <option value="">None</option>
            <option value="normal">Normal</option>
          </select>
        </fieldset>
        )}

        {featureConfig.enableFilters && (
        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Extra Filter(s)</legend>
          <div className="flex items-center gap-4 mt-2">
            <select
              id="filter"
              className="p-2 border border-gray-300 rounded flex-grow"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); markDirty(); }}
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
                onChange={(e) => { setFilterQty(parseInt(e.target.value) || 0); markDirty(); }}
              />
              <span className="ml-2">Qty</span>
            </div>
          </div>
        </fieldset>
        )}

        {featureConfig.enablePumps && (
        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">External Water Pump</legend>
          <select
            id="pump"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={pump}
            onChange={(e) => { setPump(e.target.value); markDirty(); }}
          >
            <option value="">None</option>
            <option value="mini">DAB Mini</option>
          </select>
        </fieldset>
        )}

        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Connection Type</legend>
          <select
            id="connection"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={connection}
            onChange={(e) => { setConnection(e.target.value); markDirty(); }}
          >
            <option value="">None</option>
            <option value="2way-t-valve">Manual 2-way T-valve</option>
            <option value="3way-t-valve">Automatic 3-way T-valve</option>
          </select>
        </fieldset>

        {featureConfig.enableTrenching && (
        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Trenching Sections</legend>
          <div className="relative isolate overflow-hidden">
            {trenchingSections.map((section, index) => (
              <div
                key={index}
                className="w-full flex flex-wrap md:flex-nowrap items-start gap-4 p-4 border border-gray-300 rounded-md bg-white"
              >
                <div className="flex flex-col flex-1 min-w-[140px]">
                  <label className="text-sm font-medium text-gray-600 mb-1">Material</label>
                  <select
                    className="border border-gray-300 rounded px-2 py-1"
                    value={section.type}
                    onChange={(e) => {
                      const updated = [...trenchingSections];
                      updated[index].type = e.target.value;
                      setTrenchingSections(updated);
                      markDirty();
                    }}
                  >
                    <option value="">Select</option>
                    <option value="trench_elec">Electrical</option>
                    <option value="trench_plumb">Plumbing</option>
                    <option value="trench_comb">Combined Electrical + Plumbing</option>
                  </select>
                </div>
                <div className="flex flex-col flex-1 min-w-[140px]">
                  <label className="text-sm font-medium text-gray-600 mb-1">Distance (ft)</label>
                  <input
                    type="number"
                    min="0"
                    className="border border-gray-300 rounded px-2 py-1"
                    value={section.distance}
                    onChange={(e) => {
                      const updated = [...trenchingSections];
                      updated[index].distance = parseFloat(e.target.value) || 0;
                      setTrenchingSections(updated);
                      markDirty();
                    }}
                    onBlur={() => {
                      const egg = checkEasterEgg({ trenchingSections, ab_trenchingSections });
                      if (egg) showEgg(egg.message, egg.duration);
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="text-red-500 text-xl px-2 mt-6 md:mt-0"
                  onClick={() => {
                    const updated = trenchingSections.filter((_, i) => i !== index);
                    setTrenchingSections(updated);
                    markDirty();
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-blue-600 mt-2"
              onClick={() => setTrenchingSections([...trenchingSections, { type: "", distance: 0 }])}
            >
              + Add Another Section
            </button>
            <EasterEggOverlay message={easterEggMsg} />
          </div>
        </fieldset>
        )}

        {featureConfig.enableAbovegroundTrenching && (
        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Above-Ground Runs</legend>
          {ab_trenchingSections.map((section, index) => (
            <div
              key={index}
              className="w-full flex flex-wrap md:flex-nowrap items-start gap-4 p-4 border border-gray-300 rounded-md bg-white"
            >
              <div className="flex flex-col flex-1 min-w-[140px]">
                <label className="text-sm font-medium text-gray-600 mb-1">Material</label>
                <select
                  className="border border-gray-300 rounded px-2 py-1"
                  value={section.type}
                  onChange={(e) => {
                    const updated = [...ab_trenchingSections];
                    updated[index].type = e.target.value;
                    setab_TrenchingSections(updated);
                    markDirty();
                    const egg = checkEasterEgg({ trenchingSections, ab_trenchingSections: updated });
                    if (egg) showEgg(egg.message, egg.duration);
                  }}
                >
                  <option value="">Select</option>
                  <option value="ab_elec">Electrical (above ground)</option>
                  <option value="ab_plumb">Plumbing (above ground)</option>
                  <option value="ab_comb">Combined Electrical + Plumbing</option>
                </select>
              </div>
              <div className="flex flex-col flex-1 min-w-[140px]">
                <label className="text-sm font-medium text-gray-600 mb-1">Distance (ft)</label>
                <input
                  type="number"
                  min="0"
                  className="border border-gray-300 rounded px-2 py-1"
                  value={section.distance}
                  onChange={(e) => {
                    const updated = [...ab_trenchingSections];
                    updated[index].distance = parseFloat(e.target.value) || 0;
                    setab_TrenchingSections(updated);
                    markDirty();
                  }}
                  onBlur={() => {
                    const egg = checkEasterEgg({ trenchingSections, ab_trenchingSections });
                    if (egg) showEgg(egg.message, egg.duration);
                  }}
                />
              </div>
              <button
                type="button"
                className="text-red-500 text-xl px-2 mt-6 md:mt-0"
                onClick={() => {
                  const updated = ab_trenchingSections.filter((_, i) => i !== index);
                  setab_TrenchingSections(updated);
                  markDirty();
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-blue-600 mt-2"
            onClick={() => setab_TrenchingSections([...ab_trenchingSections, { type: "", distance: 0 }])}
          >
            + Add Another Section
          </button>
        </fieldset>
        )}

        {featureConfig.enablePanelUpgrade && (
        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Add-ons</legend>
          <select
            id="panelUpgrade"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={panelUpgrade}
            onChange={(e) => { setPanelUpgrade(e.target.value); markDirty(); }}
          >
            <option value="">None</option>
            <option value="panel">Panel Upgrade</option>
            <option value="subpanel">Subpanel Upgrade</option>
          </select>
        </fieldset>
        )}

        {featureConfig.enableWarrantyUpgrades && (
        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Warranty Options</legend>
          <select
            id="WarrantyOptions"
            className="mt-2 mb-2 p-2 w-full border border-gray-300 rounded"
            value={warranty}
            onChange={(e) => { setWarranty(e.target.value); markDirty(); }}
          >
            <option value="standard">Standard (Included)</option>
            <option value="warranty5">5-Year Extended Warranty</option>
            <option value="warranty8">8-Year Extended Warranty</option>
          </select>
        </fieldset>
        )}

        {featureConfig.enableDemolition && (
        <fieldset className="border border-gray-300 rounded bg-gray-50 mb-6 p-4">
          <legend className="font-semibold px-2">Demolition</legend>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={demolition.enabled}
                onChange={(e) => {
                  setDemolition({ ...demolition, enabled: e.target.checked });
                  markDirty();
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
                  setDemolition({ ...demolition, distance: Number(e.target.value) });
                  markDirty();
                }}
              />
            )}
          </div>
        </fieldset>
        )}

        {featureConfig.enableCustomAdjustments && (
        <CustomAdjustmentsGroup
          items={customAdjs}
          onChange={setCustomAdjs}
          onDirty={markDirty}
        />
        )}

        {originalTotal !== null && (
          <>
            <hr className="my-6 border-t border-gray-300" />
            <div className="space-y-2 text-center">
              {isDiscountOn && discountedTotal !== null && discountAmount > 0 ? (
                <>
                  <p className="text-sm font-medium text-gray-500">
                    Original Total:{" "}
                    <span className="font-semibold">
                      ${originalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    {DISCOUNT_CAMPAIGN.label}:{" "}
                    <span className="font-semibold text-amber-600">
                      -${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </p>
                  <p className="text-2xl font-semibold text-gray-800">
                    Discounted Total:{" "}
                    <span className="text-green-600">
                      ${discountedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-2xl font-semibold text-gray-800">
                  Total:{" "}
                  <span className="text-green-600">
                    ${originalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
              )}
            </div>
          </>
        )}

        {featureConfig.customDisclaimers && (
          <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <h3 className="font-semibold text-yellow-900 mb-2">Important Notice</h3>
            <p className="text-sm text-yellow-800 whitespace-pre-wrap">
              {featureConfig.customDisclaimers}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={resetAll}
          className="block w-full py-3 mt-6 text-lg bg-gray-100 text-gray-800 rounded border border-gray-300 hover:bg-gray-200"
        >
          Clear All Fields
        </button>

        <button
          className="block w-full py-3 mt-4 text-lg text-white rounded hover:opacity-90"
          style={{ backgroundColor: accentColor }}
          onClick={calculateTotal}
        >
          Calculate Total
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
            className={`w-full py-2 mt-4 rounded text-white ${
              discountActive ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-400 hover:bg-gray-500"
            }`}
          >
            {discountActive ? "Disable End-of-Year Discount" : "Enable End-of-Year Discount"}
          </button>
        )}

        <button
          disabled={quoteTotal === null || quoteIsStale}
          className={`block w-full py-3 mt-4 text-lg rounded text-white ${
            quoteTotal === null || quoteIsStale ? 'bg-gray-400 cursor-not-allowed' : ''
          }`}
          style={quoteTotal !== null && !quoteIsStale ? { backgroundColor: primaryColor } : {}}
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
          className="block w-full py-3 mt-4 text-lg bg-gray-600 text-white rounded text-center hover:bg-gray-700"
        >
          {showFinancing ? "Hide Financing Calculator" : "See Financing Options"}
        </button>

        <div
          ref={financingRef}
          className={`transition-all duration-500 ease-in-out transform ${
            showFinancing
              ? 'opacity-100 translate-y-0 max-h-[1000px] mb-4'
              : 'opacity-0 -translate-y-4 max-h-0 overflow-hidden'
          }`}
        >
          {showFinancing && <FinancingCalculator totalAmount={total} />}
        </div>

        <button
          type="button"
          disabled={quoteTotal === null || quoteIsStale}
          onClick={saveCurrentQuote}
          className={`block w-full py-3 mt-4 text-lg rounded text-white ${
            quoteTotal === null || quoteIsStale ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
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
          partnerId={partner.partner_code}
        />
      </div>
    </>
  );
}