import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { GlassCard } from "../components/GlassCard";
import { MotionText, PageFade } from "../components/Motion";
import { Doctor } from "../types";

export function DoctorProfilePage() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    api.get(`/public/doctor/${id}`).then(({ data }) => setDoctor(data.doctor));
  }, [id]);

  return (
    <PageFade className="mx-auto max-w-4xl px-6 pb-14">
      <GlassCard className="snap-section">
        <MotionText as="h1" text="Doctor Profile" className="font-display text-4xl font-bold" />
        <p className="mt-4 text-lg">Specialization: {doctor?.specialization ?? "General Medicine"}</p>
        <p className="mt-2">{doctor?.bio ?? "Experienced physician focused on patient-first outcomes."}</p>
        <p className="mt-2 text-slate-500">Availability: {doctor?.availability ?? "Mon-Fri, 9AM-5PM"}</p>
      </GlassCard>
    </PageFade>
  );
}
