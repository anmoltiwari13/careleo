import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { GlassCard } from "../components/GlassCard";
import { MotionText, PageFade } from "../components/Motion";
import { Branding, Doctor } from "../types";

export function HospitalPreviewPage() {
  const { id } = useParams();
  const [hospital, setHospital] = useState<{ id: number; name: string; domain?: string } | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    if (!id) {
      return;
    }
    api.get(`/public/hospitals/${id}`).then(({ data }) => {
      setHospital(data.hospital);
      setBranding(data.branding);
      setDoctors(data.doctors ?? []);
    });
  }, [id]);

  return (
    <PageFade className="mx-auto max-w-6xl space-y-6 px-6 pb-14">
      <GlassCard className="snap-section">
        <MotionText as="h1" text={hospital?.name ?? "Hospital Website"} className="font-display text-4xl font-bold" />
        <p className="mt-2 text-slate-600 dark:text-slate-300">{branding?.description ?? "Hospital profile preview"}</p>
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
