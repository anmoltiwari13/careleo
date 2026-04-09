import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api/client";
import { GlassCard } from "../components/GlassCard";
import { MotionText, PageFade, Parallax } from "../components/Motion";
import { Branding, Doctor } from "../types";

interface HospitalDirectoryItem {
  id: number;
  name: string;
  domain?: string | null;
  logo?: string | null;
  description?: string | null;
}

export function HospitalPublicPage() {
  const [hospital, setHospital] = useState<{ id: number; name: string; domain?: string } | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [directory, setDirectory] = useState<HospitalDirectoryItem[]>([]);

  useEffect(() => {
    api.get("/public/hospital").then(async ({ data }) => {
      setHospital(data.hospital);
      setBranding(data.branding);
      setDoctors(data.doctors ?? []);

      if (!data.hospital) {
        const directoryRes = await api.get("/public/hospitals-directory");
        setDirectory(directoryRes.data ?? []);
      }

      if (data.branding?.colors) {
        document.documentElement.style.setProperty("--brand-primary", data.branding.colors.split(",")[0]?.trim() || "#0ea5e9");
      }
    });
  }, []);

  if (hospital && doctors.length > 0) {
    return <Navigate to={`/clinic/${doctors[0].id}`} replace />;
  }

  if (!hospital) {
    return (
      <PageFade className="mx-auto max-w-6xl space-y-6 px-6 pb-14">
        <GlassCard className="snap-section">
          <MotionText as="h1" text="Hospital Sites" className="font-display text-4xl font-bold" />
          <p className="mt-2 text-slate-600 dark:text-slate-300">All registered hospital tenant websites.</p>
        </GlassCard>
        <div className="grid gap-4 md:grid-cols-2">
          {directory.map((item) => (
            <GlassCard key={item.id} className="snap-section">
              <div className="flex items-center gap-3">
                {item.logo ? (
                  <Parallax>
                    <img src={item.logo} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                  </Parallax>
                ) : null}
                <h3 className="font-display text-xl font-semibold">{item.name}</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description || "Hospital tenant website"}</p>
              <div className="mt-4 flex gap-2">
                <Link to={`/hospital-preview/${item.id}`} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white">
                  Open Site
                </Link>
                {item.domain ? <span className="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700">{item.domain}</span> : null}
              </div>
            </GlassCard>
          ))}
        </div>
      </PageFade>
    );
  }

  return (
    <PageFade className="mx-auto max-w-6xl space-y-6 px-6 pb-14">
      <GlassCard className="snap-section">
        <MotionText as="h1" text={hospital.name} className="font-display text-4xl font-bold" />
        <p className="mt-2 text-slate-600 dark:text-slate-300">{branding?.description ?? "Hospital profile"}</p>
      </GlassCard>
      <div className="grid gap-4 md:grid-cols-2">
        {doctors.map((doc) => (
          <GlassCard key={doc.id} className="snap-section">
            <h3 className="font-display text-xl font-semibold">Doctor #{doc.id}</h3>
            <p className="mt-2">{doc.specialization}</p>
            <p className="text-sm text-slate-500">{doc.availability ?? "Please contact front desk"}</p>
            <button className="mt-4 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white">Book Appointment</button>
          </GlassCard>
        ))}
      </div>
    </PageFade>
  );
}
