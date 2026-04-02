import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { setAuthToken } from "./api/client";
import { NavBar } from "./components/NavBar";
import { useTheme } from "./hooks/useTheme";
import { useLenis } from "./hooks/useLenis";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminSignInPage } from "./pages/AdminSignInPage";
import { ClinicHomepagePage } from "./pages/ClinicHomepagePage";
import { DoctorClinicDashboardPage } from "./pages/DoctorClinicDashboardPage";
import { DoctorDirectoryPage } from "./pages/DoctorDirectoryPage";
import { DoctorOnboardingPage } from "./pages/DoctorOnboardingPage";
import { DoctorProfilePage } from "./pages/DoctorProfilePage";
import { HospitalPublicPage } from "./pages/HospitalPublicPage";
import { HospitalPreviewPage } from "./pages/HospitalPreviewPage";

function parseRole(token: string | null): string | null {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(decoded) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export default function App() {
  const { dark, setDark } = useTheme();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(null);

  useLenis();

  useEffect(() => {
    const existing = localStorage.getItem("careleo_admin_token");
    if (existing) {
      setAuthToken(existing);
      setToken(existing);
    }
  }, []);

  const isAdmin = useMemo(() => parseRole(token) === "careleo_admin", [token]);
  const hideGlobalNav = ["/clinic/", "/hospital-preview/", "/doctor/"].some((p) => location.pathname.startsWith(p));

  function handleLogin(newToken: string) {
    setToken(newToken);
  }

  function handleLogout() {
    setAuthToken(undefined);
    localStorage.removeItem("careleo_admin_token");
    setToken(null);
  }

  return (
    <div className="min-h-screen">
      {!hideGlobalNav ? <NavBar dark={dark} onToggleTheme={() => setDark((v) => !v)} isAdmin={isAdmin} /> : null}
      <Routes>
        <Route path="/" element={<AdminSignInPage onLogin={handleLogin} />} />
        <Route path="/hospital" element={<HospitalPublicPage />} />
        <Route path="/doctor" element={<DoctorDirectoryPage />} />
        <Route path="/hospital-preview/:id" element={<HospitalPreviewPage />} />
        <Route path="/doctor/:id" element={<DoctorProfilePage />} />
        <Route path="/clinic/:id" element={<ClinicHomepagePage />} />
        <Route path="/clinic/:id/dashboard" element={<DoctorClinicDashboardPage />} />
        <Route path="/doctor-onboarding" element={<DoctorOnboardingPage />} />
        <Route
          path="/admin"
          element={isAdmin ? <AdminDashboardPage onLogout={handleLogout} /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
