"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPartner, getAllPartners } from "@/lib/supabase";

// Generate a partner code from company name
function generatePartnerCode(companyName: string): string {
  // Remove common business suffixes
    const cleaned = companyName
    .replace(/\b(LLC|Inc|Corp|Corporation|Company|Co|Ltd|Limited)\b/gi, '')
    .trim();
  
  // Split into words, take first letters
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 1) {
    // Single word: take first 3-4 letters + random
    const base = words[0].substring(0, 4).toUpperCase();
    const rand = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    return `${base}${rand}`;
  } else {
    // Multiple words: take first letter of each word
    const acronym = words.map(w => w[0].toUpperCase()).join('').substring(0, 4);
    const rand = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    return `${acronym}${rand}`;
  }
}

export default function NewPartnerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [displayAddress, setDisplayAddress] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');
  const [displayWebsite, setDisplayWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2B6777');
  const [accentColor, setAccentColor] = useState('#52AB98');
  const [notes, setNotes] = useState('');
  
  // Permissions
  const [isActive, setIsActive] = useState(true);
  const [canCreateQuotes, setCanCreateQuotes] = useState(true);
  const [canEditPricing, setCanEditPricing] = useState(false);

  // Auto-generate code when company name changes
  const handleCompanyNameChange = (value: string) => {
    setCompanyName(value);
    if (autoGenerateCode && value.length > 0) {
      setPartnerCode(generatePartnerCode(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }
    
    if (!partnerCode.trim()) {
      setError('Partner code is required');
      return;
    }

    // Validate partner code format (letters/numbers/underscores only)
    if (!/^[A-Z0-9_]+$/.test(partnerCode)) {
      setError('Partner code must contain only uppercase letters, numbers, and underscores');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Check if code already exists
      const existingPartners = await getAllPartners();
      if (existingPartners.some(p => p.partner_code === partnerCode)) {
        setError('Partner code already exists. Please choose a different code.');
        setSaving(false);
        return;
      }

      const newPartner = await createPartner({
        partner_code: partnerCode.toUpperCase(),
        company_name: companyName.trim(),
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        display_address: displayAddress.trim() || null,
        display_phone: displayPhone.trim() || null,
        display_email: displayEmail.trim() || null,
        display_website: displayWebsite.trim() || null,
        logo_url: logoUrl.trim() || null,
        primary_color: primaryColor,
        accent_color: accentColor,
        is_active: isActive,
        can_create_quotes: canCreateQuotes,
        can_edit_pricing: canEditPricing,
        notes: notes.trim() || null,
        feature_config: null,
        pricing_overrides: null,
      });

      if (newPartner) {
        alert(`Partner "${companyName}" created successfully!\n\nPartner Code: ${partnerCode}\nCalculator URL: /partner/${partnerCode}`);
        router.push('/admin/partners');
      } else {
        setError('Failed to create partner. Please try again.');
      }
    } catch (err) {
      console.error('Error creating partner:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
      <ProtectedRoute requireSuperAdmin={true}>
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Partner</h1>
              <p className="text-gray-600 mt-1">Create a new partner account</p>
            </div>
            <Link
              href="/admin/partners"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              ← Back to Partners
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-8">
            {/* Company Information */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="e.g., ABC Water Solutions"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Partner Code <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={partnerCode}
                      onChange={(e) => {
                        setPartnerCode(e.target.value.toUpperCase());
                        setAutoGenerateCode(false);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      required
                      placeholder="e.g., ABC01"
                      pattern="[A-Z0-9_]+"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAutoGenerateCode(true);
                        if (companyName) {
                          setPartnerCode(generatePartnerCode(companyName));
                        }
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Regenerate
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Uppercase letters, numbers, and underscores only. This will be used in the URL.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="contact@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </section>

            {/* Display Information */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Display Information</h2>
              <p className="text-sm text-gray-600 mb-4">This information will appear on the partner&apo;s calculator page</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Address</label>
                  <input
                    type="text"
                    value={displayAddress}
                    onChange={(e) => setDisplayAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="123 Main St, Austin, TX 78701"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Phone</label>
                  <input
                    type="tel"
                    value={displayPhone}
                    onChange={(e) => setDisplayPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Email</label>
                  <input
                    type="email"
                    value={displayEmail}
                    onChange={(e) => setDisplayEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="info@company.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  <input
                    type="url"
                    value={displayWebsite}
                    onChange={(e) => setDisplayWebsite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="https://www.company.com"
                  />
                </div>
              </div>
            </section>

            {/* Branding */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Branding</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">URL to partner&apos;s logo image (PNG or JPG recommended)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono"
                      placeholder="#2B6777"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used for header background</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono"
                      placeholder="#52AB98"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used for buttons and accents</p>
                </div>
              </div>
            </section>

            {/* Permissions */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Permissions & Access</h2>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Active</div>
                    <div className="text-sm text-gray-600">Partner can access their calculator and admin portal</div>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={canCreateQuotes}
                    onChange={(e) => setCanCreateQuotes(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Can Create Quotes</div>
                    <div className="text-sm text-gray-600">Partner can save and generate quotes</div>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={canEditPricing}
                    onChange={(e) => setCanEditPricing(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Can Edit Pricing</div>
                    <div className="text-sm text-gray-600">Partner can customize product pricing in their admin portal</div>
                  </div>
                </label>
              </div>
            </section>

            {/* Notes */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Internal Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
                placeholder="Internal notes about this partner (not visible to partner)..."
              />
            </section>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center rounded-b-lg">
            <Link
              href="/admin/partners"
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !companyName || !partnerCode}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating Partner...' : 'Create Partner'}
            </button>
          </div>
        </form>

        {/* Preview */}
        {companyName && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Preview URLs</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <div>
                <span className="font-medium">Calculator:</span>{' '}
                <code className="bg-blue-100 px-2 py-1 rounded">/partner/{partnerCode}</code>
              </div>
              <div>
                <span className="font-medium">Admin Portal:</span>{' '}
                <code className="bg-blue-100 px-2 py-1 rounded">/partner/{partnerCode}/admin</code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
}