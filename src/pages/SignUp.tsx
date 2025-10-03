import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setRole, setCurrentUserId } from '../lib/roles';

const ZONES = ['Tempe', 'West', 'Poly', 'DTPHX'] as const;
const TIMESLOTS = [
  'Mon 10:00',
  'Mon 14:00',
  'Tue 11:30',
  'Tue 14:00',
  'Tue 15:00',
  'Wed 12:30',
  'Wed 16:00',
  'Thu 17:00',
  'Fri 15:00',
  'Sat 13:00',
  'Sun 10:00',
] as const;
const TAGS = ['commuter', 'international', 'first_gen', 'sensory', 'mobility', 'language_ally'] as const;

type InterestData = {
  id: string;
  name: string;
};

type KnownUser = {
  id: string;
  name: string;
  email: string;
};

type SignupPayload = {
  zone: string;
  times: string[];
  interests: string[];
  tags: string[];
};

const defaultPayload: SignupPayload = {
  zone: 'Tempe',
  times: [],
  interests: [],
  tags: [],
};

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [interestOptions, setInterestOptions] = useState<InterestData[]>([]);
  const [interests, setInterests] = useState<string[]>(defaultPayload.interests);
  const [times, setTimes] = useState<string[]>(defaultPayload.times);
  const [zone, setZone] = useState<string>(defaultPayload.zone);
  const [tags, setTags] = useState<string[]>(defaultPayload.tags);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [knownUsers, setKnownUsers] = useState<KnownUser[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetch('/data/interests.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load interests: ${res.status}`);
        }
        return res.json();
      })
      .then((data: unknown) => {
        const opts = (Array.isArray(data) ? data : []).map((raw, idx) => ({
          id: `interest-${idx}`,
          name: String(raw),
        }));
        setInterestOptions(opts);
      })
      .catch((error) => {
        console.error('Unable to load interests.json', error);
        setInterestOptions(
          ['study sprint', 'soccer', 'coffee', 'anime', 'hiking', 'music'].map((label, idx) => ({
            id: `interest-${idx}`,
            name: label,
          }))
        );
      });
  }, []);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [usersRes] = await Promise.all([fetch('/data/users.json')]);
        if (usersRes.ok) {
          const usersJson = await usersRes.json();
          if (Array.isArray(usersJson)) {
            setKnownUsers(
              usersJson.map((user: any) => ({
                id: String(user.id),
                name: String(user.name),
                email: String(user.email || '').toLowerCase(),
              }))
            );
          }
        }
      } catch (error) {
        console.error('Unable to load roster data', error);
      }
    };

    hydrate();
  }, []);

  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem('signupProfile');
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile) as { name?: string; email?: string };
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
      }
      const storedSignup = localStorage.getItem('signupData');
      if (storedSignup) {
        const parsed = JSON.parse(storedSignup) as Partial<SignupPayload>;
        if (parsed.zone) setZone(parsed.zone);
        if (Array.isArray(parsed.times)) setTimes(parsed.times.map(String));
        if (Array.isArray(parsed.interests)) setInterests(parsed.interests.map(String));
        if (Array.isArray(parsed.tags)) setTags(parsed.tags.map(String));
      }
    } catch (error) {
      console.error('Unable to restore signup data', error);
    }
  }, []);

  const toggleArrayValue = (value: string, arr: string[], setter: (values: string[]) => void) => {
    setter(arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value]);
  };

  const interestsByColumn = useMemo(() => {
    const half = Math.ceil(interestOptions.length / 2);
    return [interestOptions.slice(0, half), interestOptions.slice(half)];
  }, [interestOptions]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload: SignupPayload = { zone, times, interests, tags };
    try {
      localStorage.setItem('signupData', JSON.stringify(payload));
      localStorage.setItem('signupProfile', JSON.stringify({ name, email }));
    } catch (error) {
      console.error('Unable to persist signup payload', error);
    }

    let resolvedUserId = 'me';
    let resolvedName = name?.trim() || 'Guest';
    if (email.trim()) {
      const match = knownUsers.find((user) => user.email === email.trim().toLowerCase());
      if (match) {
        resolvedUserId = match.id;
        resolvedName = match.name;
      }
    }

    try {
      setCurrentUserId(resolvedUserId);
      localStorage.setItem('currentUserName', resolvedName);
      if (email) {
        localStorage.setItem('currentUserEmail', email);
      }
      setRole('student');
      window.dispatchEvent(new Event('pods:session-updated'));
    } catch (error) {
      console.error('Unable to persist session metadata', error);
    }

    setStatusMessage('Awesome! We are matching you with your pod…');
    navigate('/dashboard', { replace: true });
    setTimeout(() => setIsSubmitting(false), 250);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold text-asuMaroon">Join the SunDevil Pods+</h1>
        <p className="max-w-2xl mx-auto text-base text-gray-700">
          Tell us a little about yourself so we can place you with a pod that shares your energy, schedule, and goals.
        </p>
      </div>
      {statusMessage && (
        <div className="max-w-3xl mx-auto bg-asuGold/20 border border-asuGold/60 text-asuMaroon text-sm font-semibold rounded-xl px-4 py-3">
          {statusMessage}
        </div>
      )}
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-xl p-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide">Preferred Name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jordan"
                className="w-full rounded-xl border border-asuGray bg-white/70 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-asuMaroon/50"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide">ASU Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="sunnydevil@asu.edu"
                className="w-full rounded-xl border border-asuGray bg-white/70 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-asuGold/60"
              />
              <p className="text-xs text-gray-500">Optional, but lets us surface your existing pod data if you&apos;re already in the system.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide mb-3">Interests (pick any)</label>
            <div className="grid gap-4 md:grid-cols-2">
              {interestsByColumn.map((column, columnIdx) => (
                <div key={`interest-column-${columnIdx}`} className="space-y-2">
                  {column.map((interest) => (
                    <label
                      key={interest.id}
                      className="flex items-center justify-between rounded-xl border border-asuGray bg-asuGray/40 px-4 py-2 text-sm"
                    >
                      <span className="text-gray-800">{interest.name}</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-asuMaroon focus:ring-asuMaroon"
                        checked={interests.includes(interest.name)}
                        onChange={() => toggleArrayValue(interest.name, interests, setInterests)}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide mb-3">Available 45-minute time slots</label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TIMESLOTS.map((slot) => {
                const selected = times.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleArrayValue(slot, times, setTimes)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-2 text-sm transition ${
                      selected
                        ? 'border-asuMaroon bg-asuMaroon/10 text-asuMaroon shadow-sm'
                        : 'border-asuGray bg-white/70 text-gray-700 hover:border-asuMaroon/50'
                    }`}
                  >
                    <span>{slot}</span>
                    <span className="text-xs uppercase tracking-wide">{selected ? 'Selected' : 'Select'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide mb-3">Campus Zone</label>
            <select
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              className="w-full border border-asuGray rounded-xl px-4 py-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-asuGold/60"
            >
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide mb-3">Optional tags</label>
            <div className="flex flex-wrap gap-3">
              {TAGS.map((tag) => {
                const selected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleArrayValue(tag, tags, setTags)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                      selected ? 'border-asuMaroon bg-asuMaroon text-white shadow' : 'border-asuGray bg-white/70 text-asuMaroon hover:border-asuMaroon/50'
                    }`}
                  >
                    {tag.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-gray-500">
              We&apos;ll use this info to match you with a pod and store a lightweight profile locally for the demo.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-asuMaroon text-white rounded-full px-6 py-3 text-base font-semibold shadow-lg hover:bg-[#6f1833] transition disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting…' : 'Continue to Your Pod'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
