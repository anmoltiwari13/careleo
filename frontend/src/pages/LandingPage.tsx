import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { GlassCard } from "../components/GlassCard";
import { Float, MotionText, PageFade } from "../components/Motion";

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const haloY = useTransform(scrollY, [0, 600], [0, -60]);
  const ringY = useTransform(scrollY, [0, 600], [0, 40]);

  return (
    <PageFade className="relative mx-auto grid min-h-[calc(100vh-90px)] w-full max-w-7xl grid-cols-1 gap-8 overflow-hidden px-6 pb-12 lg:grid-cols-2 lg:items-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.35),_transparent_70%)] blur-2xl" />
        <div className="absolute right-10 top-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.3),_transparent_70%)] blur-2xl" />
        <Float>
          <div className="absolute right-[-4%] top-24 h-72 w-72 rounded-full border border-slate-200/60 bg-white/20 blur-3xl dark:border-slate-700/50 dark:bg-slate-900/30" />
        </Float>
        <div className="absolute left-[45%] top-[-30%] h-80 w-80 rounded-full border border-sky-200/50 bg-sky-50/40 blur-3xl dark:border-slate-700/50 dark:bg-slate-900/30" />
        <div className="absolute right-[20%] bottom-[-15%] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(79,111,82,0.25),_transparent_70%)] blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[55%] top-12 h-44 w-44 rounded-full border border-slate-200/60 bg-white/30 blur-xl dark:border-slate-700/50 dark:bg-slate-900/40" />
        <motion.div
          className="absolute left-12 bottom-[-6%] h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(15,76,92,0.2),_transparent_70%)] blur-3xl"
          style={{ y: reduceMotion ? 0 : haloY }}
        />
        <motion.div
          className="absolute right-[10%] top-[30%] h-52 w-52 rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.2),_transparent_70%)] blur-3xl"
          style={{ y: reduceMotion ? 0 : ringY }}
        />
      </div>
      <section className="snap-section">
        <MotionText
          as="h1"
          text="Multi-tenant healthcare SaaS built for modern hospitals."
          className="font-display text-5xl font-extrabold leading-tight sm:text-6xl"
        />
        <MotionText
          as="p"
          delay={0.1}
          text="Careleo powers branded hospital and doctor experiences on dedicated domains with secure tenant isolation."
          className="mt-6 max-w-xl text-lg text-slate-600 dark:text-slate-300"
        />
        <div className="mt-8 flex gap-4">
          <Link to="/dashboards" className="rounded-full bg-sky-500 px-6 py-3 font-bold text-white transition hover:bg-sky-600">
            Start Onboarding
          </Link>
          <Link to="/hospital" className="rounded-full border border-slate-300 px-6 py-3 font-bold dark:border-slate-700">
            View Demo Tenant
          </Link>
        </div>
      </section>
      <Float>
        <section className="snap-section grid gap-4 sm:grid-cols-2">
          {[
            "Domain-based tenant routing",
            "Role-first dashboards",
            "Branding + theme engine",
            "Appointment-ready API"
          ].map((item) => (
            <GlassCard key={item}>
              <h3 className="font-display text-xl font-bold">{item}</h3>
            </GlassCard>
          ))}
        </section>
      </Float>
    </PageFade>
  );
}
