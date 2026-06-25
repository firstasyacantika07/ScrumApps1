import { useEffect, useState } from "react";
import api from "../api/axios";

export default function useSubscription() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/me");
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
    } catch (err) {
      console.error("Gagal memuat data user:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // --- LOGIKA BISNIS TERPUSAT (SaaS Limits) ---
  
  // Cek apakah paket adalah PRO atau ENTERPRISE
  const isProAccess = user?.package_type === 'PRO' || user?.package_type === 'ENTERPRISE';

  // Cek apakah status langganan valid (belum expired)
  const isSubscriptionActive = user?.tenant_status !== 'expired';

  // Helper untuk mengecek akses fitur (bisa dikembangkan)
  const canAccessFeature = (feature) => {
    if (!isSubscriptionActive) return false;
    
    // Aturan bisnis: Fitur GitHub hanya untuk PRO ke atas
    if (feature === 'GITHUB_INTEGRATION') {
      return isProAccess;
    }
    return true; // Fitur lain bebas
  };

  return {
    user,
    loading,
    refreshUser: loadUser,
    isProAccess,
    isSubscriptionActive,
    canAccessFeature
  };
}