"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPartnerByCode, updatePartner, type Partner } from "@/lib/supabase";

export default function EditPartnerPage() {
  const params = useParams();
  const router = useRouter();
  const partnerCode = params.code as string;
  
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
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
  const [isActive, setIsActive] = useState(true);
  const [canCreateQuotes, setCanCreateQuotes] = useState(true);
  const [canEditPricing, setCanEditPricing] = useState(false);

useEffect(() => {
    loadPartner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerCode]);

  const loadPartner = async () => {
    setLoading(true);
    try {
      const data = await getPartnerByCode(partnerCode);
      if (data) {
        setPartner(data);
        setCompanyName(data.company_name);
        setContactName(data.contact_name || '');
        setContactEmail(data.contact_email || '');
        setContactPhone(data.contact_phone || '');
        setDisplayAddress(data.display_address || '');
        setDisplayPhone(data.display_phone || '');
        setDisplayEmail(data.display_email || '');
        setDisplayWebsite(data.display_website || '');
        setLogoUrl(data.logo_url || '');
        setPrimaryColor(data.primary_color || '#2B6777');
        setAccentColor(data.accent_color || '#52AB98');
        setNotes(data.notes || '');
        setIsActive(data.is_active);
        setCanCreateQuotes(data.can_create_quotes);
        setCanEditPricing(data.can_edit_pricing);
      } else {
        setError('Partner not found');
      }
    } catch (err) {
      console.error('Error loading partner:', err);
      setError('Failed to load partner');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!partner) return;
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updatePartner(partner.id, {
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
        notes: notes.trim() || null,
        is_active: isActive,
        can_create_quotes: canCreateQuotes,
        can_edit_pricing: canEditPricing,
      });

      if (updated) {
        alert('Partner updated successfully!');
        router.push('/admin/partners');
      } else {
        setError('Failed to update partner');
      }
    } catch (err) {
      console.error('Error updating partner:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading partner...</p>
        </div>
      </div>
    );
  }

  if (error && !partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <Link
            href="/admin/partners"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Partners
          </Link>
        </div>
      </div>
    );
  }

  return (
      <ProtectedRoute requireSuperAdmin={true}>
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Partner</h1>
              <p className="text-gray-600 mt-1">{partner?.company_name} ({partner?.partner_code})</p>
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
            {/* Partner Code (Read-only) */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Partner Code</h2>
              <div className="bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                <span className="font-mono text-gray-700">{partner?.partner_code}</span>
                <span className="text-sm text-gray-500 ml-2">(Cannot be changed)</span>
              </div>
            </section>

            {/* Company Information */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
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
              </div>
            </section>

            {/* Display Information */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Display Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-20 border border-gray-300 rounded"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono"
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
                      className="h-10 w-20 border border-gray-300 rounded"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono"
                    />
                  </div>
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
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
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
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
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
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Can Edit Pricing</div>
                    <div className="text-sm text-gray-600">Partner can customize product pricing</div>
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
                placeholder="Internal notes..."
              />
            </section>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center rounded-b-lg">
            <div className="flex gap-4">
              <Link
                href="/admin/partners"
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </Link>
              <Link
                href={`/partner/${partnerCode}/admin`}
                target="_blank"
                className="px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                View Partner Portal →
              </Link>
            </div>
            <button
              type="submit"
              disabled={saving || !companyName}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ProtectedRoute>
  );
}