import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { GlassCard } from "../components/GlassCard";
import { MotionText, PageFade, Parallax } from "../components/Motion";

interface PrivateClinicDoctor {
  doctor_id: number;
  hospital_id: number;
  clinic_name: string;
  specialization: string;
  bio?: string;
  availability?: string;
  logo?: string;
  description?: string;
}

export function DoctorDirectoryPage() {
  const [items, setItems] = useState<PrivateClinicDoctor[]>([]);

  useEffect(() => {
    api.get("/public/private-clinic-doctors").then(({ data }) => setItems(data ?? []));
  }, []);

  return (
    <PageFade className="mx-auto max-w-6xl space-y-6 px-6 pb-14">
      <GlassCard className="snap-section">
        <MotionText as="h1" text="Doctor Profiles" className="font-display text-4xl font-bold" />
        <p className="mt-2 text-slate-600 dark:text-slate-300">Private clinic doctors available on Careleo.</p>
      </GlassCard>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <GlassCard key={item.doctor_id} className="snap-section">
            <div className="flex items-center gap-3">
              {item.logo ? (
                <Parallax>
                  <img src={item.logo} alt={item.clinic_name} className="h-12 w-12 rounded-lg object-cover" />
                </Parallax>
              ) : null}
              <div>
                <h3 className="font-display text-xl font-semibold">{item.clinic_name}</h3>
                <p className="text-sm text-slate-500">{item.specialization}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.description || item.bio || "Personalized private clinic care."}</p>
            <p className="mt-2 text-xs text-slate-500">Availability: {item.availability || "Mon-Fri"}</p>
            <Link to={`/clinic/${item.doctor_id}`} className="mt-4 inline-block rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white">
              Open Clinic Website
            </Link>
          </GlassCard>
        ))}
      </div>
    </PageFade>
  );
}
