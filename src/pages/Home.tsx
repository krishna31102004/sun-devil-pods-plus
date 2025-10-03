import React from 'react';
import { Link } from 'react-router-dom';

const partnerLogos = [
  { src: '/assets/logos/ssc.svg', alt: 'Student Success Center logo' },
  { src: '/assets/logos/sun-devil-rewards.svg', alt: 'Sun Devil Rewards logo' },
  { src: '/assets/logos/credentials.svg', alt: 'Sun Devil credentials logo' },
];

const Home: React.FC = () => (
  <div className="space-y-10">
    <section className="rounded-3xl border border-white/60 bg-gradient-to-r from-asuMaroon/90 via-asuMaroon to-asuGold/80 px-8 py-12 shadow-2xl text-white">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm uppercase tracking-[0.35em] text-white/60">SunDevil Pods+</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">Find your people. Grow your impact.</h1>
        <p className="text-base text-white/90 sm:text-lg">
          Join a peer pod that matches your energy or step up as a peer captain to guide new Sun Devils. Everything runs
          locally for demo purposes—pick the journey you want to explore.
        </p>
      </div>
    </section>

    <section className="rounded-3xl border border-white/60 bg-white/80 px-6 py-4 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-asuMaroon/70">Supported by</p>
        <div className="flex flex-wrap items-center justify-start gap-6">
          {partnerLogos.map((logo) => (
            <img
              key={logo.src}
              src={logo.src}
              alt={logo.alt}
              loading="lazy"
              className="h-10 w-auto opacity-90"
            />
          ))}
        </div>
      </div>
    </section>

    <section className="grid gap-6 md:grid-cols-2">
      <Link
        to="/signup"
        className="group rounded-3xl border border-white/60 bg-white/80 p-8 backdrop-blur shadow-xl transition hover:-translate-y-1"
      >
        <div className="flex h-full flex-col gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-asuGold/30 px-3 py-1 text-xs font-semibold text-asuMaroon">
              Join Pods
            </span>
            <h2 className="text-2xl font-bold text-asuMaroon">Jump into an ASU pod</h2>
            <p className="text-sm text-gray-600">
              Share your availability, interests, and access needs so we can simulate your pod match-up in minutes.
            </p>
          </div>
          <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-asuMaroon">
            <span>Start sign-up</span>
            <span className="transition-transform group-hover:translate-x-1" aria-hidden>
              →
            </span>
          </div>
        </div>
      </Link>

      <Link
        to="/apply"
        className="group rounded-3xl border border-white/60 bg-white/80 p-8 backdrop-blur shadow-xl transition hover:-translate-y-1"
      >
        <div className="flex h-full flex-col gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-asuMaroon/15 px-3 py-1 text-xs font-semibold text-asuMaroon">
              Become a Peer Captain
            </span>
            <h2 className="text-2xl font-bold text-asuMaroon">Lead a pod and earn recognition</h2>
            <p className="text-sm text-gray-600">
              Submit a quick application, upload your resume, and unlock leadership perks like letters of rec and awards.
            </p>
          </div>
          <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-asuMaroon">
            <span>Apply now</span>
            <span className="transition-transform group-hover:translate-x-1" aria-hidden>
              →
            </span>
          </div>
        </div>
      </Link>
    </section>
  </div>
);

export default Home;
