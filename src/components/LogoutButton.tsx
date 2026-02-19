"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;

    setLoading(true);
    
    try {
      const { error } = await signOut();
      
      if (error) {
        alert('Error signing out: ' + error);
        setLoading(false);
        return;
      }

      // Redirect to login
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      alert('An error occurred while signing out');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 transition-colors"
    >
      {loading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}