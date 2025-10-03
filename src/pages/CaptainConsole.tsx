import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CaptainApplication } from './CaptainApply';
import { adjustPoints, getPoints } from '../lib/points';
import { Role, currentUserId as getCurrentUserId, getRole, setCurrentUserId, setRole } from '../lib/roles';

interface Pod {
  id: string;
  zone: string;
  timeslot: string;
  interests: string[];
  tags: string[];
  memberIds: string[];
  captainId?: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Quest {
  id: string;
  week: number;
  title: string;
  description: string;
  badges: string[];
  points: { base: number };
}

interface Space {
  id: string;
  name: string;
  zone: string;
  ada: boolean;
  sensoryFriendly: boolean;
  capacity: number;
  available?: boolean;
}

const APPLICATION_KEY = 'captainApplications';
const ASSIGNED_CAPTAINS_KEY = 'assignedCaptains';
const weeks = Array.from({ length: 14 }, (_, idx) => idx + 1);

const clampWeek = (value: number) => Math.min(14, Math.max(1, value));

const semesterAnchor = () => {
  const now = new Date();
  return new Date(now.getFullYear(), 7, 19);
};

const deriveWeekFromAnchor = () => {
  const now = new Date();
  const diff = now.getTime() - semesterAnchor().getTime();
  const computed = 1 + Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
  return clampWeek(computed);
};

const readCurrentWeek = () => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('currentWeek');
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!Number.isNaN(parsed)) return clampWeek(parsed);
  }
  const derived = deriveWeekFromAnchor();
  try {
    localStorage.setItem('currentWeek', derived.toString());
  } catch (error) {
    console.error('Unable to persist derived week', error);
  }
  return derived;
};

const getEffectiveAvailability = (space: Space, overrides: Record<string, boolean>): boolean => {
  if (space.id in overrides) return overrides[space.id];
  return typeof space.available === 'boolean' ? space.available : true;
};

const readApplications = (): CaptainApplication[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(APPLICATION_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as CaptainApplication[]) : [];
  } catch (error) {
    console.error('Unable to read captain applications', error);
    return [];
  }
};

const persistApplications = (applications: CaptainApplication[]) => {
  try {
    localStorage.setItem(APPLICATION_KEY, JSON.stringify(applications));
    window.dispatchEvent(new Event('pods:applications-updated'));
  } catch (error) {
    console.error('Unable to persist captain applications', error);
  }
};

const readSpaceOverrides = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  const overrides: Record<string, boolean> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith('spaceAvail:')) continue;
    const [, spaceId] = key.split(':');
    overrides[spaceId] = localStorage.getItem(key) === '1';
  }
  return overrides;
};

const addAssignedCaptain = (email: string) => {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(ASSIGNED_CAPTAINS_KEY);
    const existing = stored ? (JSON.parse(stored) as string[]) : [];
    if (!existing.includes(email)) {
      const next = [...existing, email];
      localStorage.setItem(ASSIGNED_CAPTAINS_KEY, JSON.stringify(next));
    }
  } catch (error) {
    console.error('Unable to persist assigned captain email', error);
  }
};

const lastPulseAverage = () => {
  if (typeof window === 'undefined') return null;
  try {
    const history: { date: string; scores: number[] }[] = JSON.parse(localStorage.getItem('belongingPulse') || '[]');
    if (history.length === 0) return null;
    const latest = history[history.length - 1];
    const avg = latest.scores.reduce((sum, value) => sum + value, 0) / latest.scores.length;
    return Number.isFinite(avg) ? avg : null;
  } catch (error) {
    console.error('Unable to read belonging pulse history', error);
    return null;
  }
};

const CaptainConsole: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRoleState] = useState<Role>(() => (typeof window === 'undefined' ? 'student' : getRole()));
  const [currentUserId, setCurrentId] = useState<string | null>(() => getCurrentUserId());
  const [pods, setPods] = useState<Pod[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [applications, setApplications] = useState<CaptainApplication[]>(() => readApplications());
  const [spaceOverrides, setSpaceOverrides] = useState<Record<string, boolean>>(() => readSpaceOverrides());
  const [activeTab, setActiveTab] = useState<'members' | 'spaces' | 'quests' | 'applications'>('members');
  const [refreshToken, setRefreshToken] = useState(0);
  const [currentWeek, setCurrentWeek] = useState<number>(readCurrentWeek());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [issuedMessage, setIssuedMessage] = useState<string | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [podsRes, usersRes, questsRes, spacesRes] = await Promise.all([
          fetch('/data/pods.json'),
          fetch('/data/users.json'),
          fetch('/data/quests.json'),
          fetch('/data/spaces.json'),
        ]);
        if (podsRes.ok) setPods(await podsRes.json());
        if (usersRes.ok) setUsers(await usersRes.json());
        if (questsRes.ok) setQuests(await questsRes.json());
        if (spacesRes.ok) setSpaces(await spacesRes.json());
      } catch (error) {
        console.error('Unable to load captain console data', error);
      } finally {
        setIsLoading(false);
      }
    };
    hydrate();
  }, []);

  useEffect(() => {
    const syncRole = () => setRoleState(getRole());
    const syncUser = () => setCurrentId(getCurrentUserId());
    const syncApplications = () => setApplications(readApplications());
    const syncSpaces = () => setSpaceOverrides(readSpaceOverrides());

    window.addEventListener('pods:role-updated', syncRole);
    window.addEventListener('pods:session-updated', syncUser);
    window.addEventListener('pods:applications-updated', syncApplications);
    window.addEventListener('storage', syncApplications);
    window.addEventListener('storage', syncSpaces);
    return () => {
      window.removeEventListener('pods:role-updated', syncRole);
      window.removeEventListener('pods:session-updated', syncUser);
      window.removeEventListener('pods:applications-updated', syncApplications);
      window.removeEventListener('storage', syncApplications);
      window.removeEventListener('storage', syncSpaces);
    };
  }, []);

  const activePod = useMemo(() => {
    if (pods.length === 0) return null;
    if (currentUserId) {
      const captained = pods.find((pod) => pod.captainId === currentUserId);
      if (captained) return captained;
      const memberPod = pods.find((pod) => pod.memberIds.includes(currentUserId));
      if (memberPod) return memberPod;
    }
    return pods[0] ?? null;
  }, [pods, currentUserId]);

  useEffect(() => {
    if (!activePod) {
      setIssuedMessage(null);
      return;
    }
    const key = `issuedQuest:${activePod.id}:${currentWeek}`;
    if (localStorage.getItem(key)) {
      setIssuedMessage('This week’s quest is already out to your pod.');
    } else {
      setIssuedMessage(null);
    }
  }, [activePod, currentWeek, refreshToken]);

  const podMembers = useMemo(() => {
    if (!activePod) return [];
    return activePod.memberIds
      .map((memberId) => users.find((user) => user.id === memberId))
      .filter((user): user is User => Boolean(user));
  }, [activePod, users]);

  const memberRows = useMemo(() => {
    if (!activePod) return [];
    return podMembers.map((member) => {
      const checkins: Record<number, boolean> = {};
      const questsComplete: Record<number, boolean> = {};
      weeks.forEach((week) => {
        checkins[week] = Boolean(localStorage.getItem(`checkin:${activePod.id}:${week}:${member.id}`));
        questsComplete[week] = Boolean(localStorage.getItem(`quest:${activePod.id}:${week}:${member.id}`));
      });
      const totalPoints = getPoints(member.id);
      return {
        user: member,
        checkins,
        quests: questsComplete,
        totalPoints,
      };
    });
  }, [activePod, podMembers, refreshToken]);

  const handleToggleProgress = (memberId: string, week: number, type: 'checkin' | 'quest') => {
    if (!activePod) return;
    const key = `${type}:${activePod.id}:${week}:${memberId}`;
    const currentlyComplete = Boolean(localStorage.getItem(key));
    if (currentlyComplete) {
      localStorage.removeItem(key);
      adjustPoints(memberId, type === 'checkin' ? -10 : -30);
    } else {
      localStorage.setItem(key, '1');
      adjustPoints(memberId, type === 'checkin' ? 10 : 30);
    }
    setRefreshToken((value) => value + 1);
  };

  const updateSharedWeek = (value: number) => {
    const safe = clampWeek(value);
    setCurrentWeek(safe);
    try {
      localStorage.setItem('currentWeek', safe.toString());
    } catch (error) {
      console.error('Unable to persist current week from console', error);
    }
  };

  const toggleSpaceAvailability = (spaceId: string) => {
    if (role !== 'captain') return;
    const target = spaces.find((space) => space.id === spaceId);
    if (!target) return;
    const next = { ...spaceOverrides };
    const current = getEffectiveAvailability(target, spaceOverrides);
    next[spaceId] = !current;
    setSpaceOverrides(next);
    try {
      localStorage.setItem(`spaceAvail:${spaceId}`, next[spaceId] ? '1' : '0');
    } catch (error) {
      console.error('Unable to persist space availability override', error);
    }
  };

  const handleIssueQuest = () => {
    if (!activePod) return;
    const key = `issuedQuest:${activePod.id}:${currentWeek}`;
    localStorage.setItem(key, new Date().toISOString());
    setIssuedMessage('Quest sent! Check your pod dashboard for confirmations.');
    setRefreshToken((value) => value + 1);
  };

  const handleApprove = (application: CaptainApplication) => {
    const next = applications.map((entry) =>
      entry.id === application.id ? { ...entry, status: 'approved' } : entry
    );
    setApplications(next);
    persistApplications(next);

    const matchedUser = users.find((user) => user.email.toLowerCase() === application.email.toLowerCase());
    const resolvedId = matchedUser?.id ?? `captain-${Date.now().toString(36)}`;
    const resolvedName = matchedUser?.name ?? application.name;

    setCurrentUserId(resolvedId);
    try {
      localStorage.setItem('currentUserName', resolvedName);
      localStorage.setItem('currentUserEmail', application.email);
    } catch (error) {
      console.error('Unable to persist captain profile', error);
    }
    setRole('captain');
    setRoleState('captain');
    addAssignedCaptain(application.email);
    setCurrentId(resolvedId);
    window.dispatchEvent(new Event('pods:session-updated'));
  };

  const handleReject = (application: CaptainApplication) => {
    const next = applications.map((entry) =>
      entry.id === application.id ? { ...entry, status: 'rejected' } : entry
    );
    setApplications(next);
    persistApplications(next);
  };

  if (role !== 'captain' && role !== 'captain-candidate') {
    return (
      <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
        <h1 className="text-3xl font-extrabold text-asuMaroon">Captain Console</h1>
        <p className="text-sm text-gray-600">
          You&apos;ll need to apply or be approved as a peer captain to access these tools.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/apply')}
            className="rounded-full bg-asuMaroon px-5 py-2 text-sm font-semibold text-white hover:bg-[#6f1833]"
          >
            Apply to be a Captain
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-full border border-asuMaroon/40 px-5 py-2 text-sm font-semibold text-asuMaroon hover:bg-asuMaroon/10"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4">Loading captain tools…</div>;
  }

  if (!activePod) {
    return (
      <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
        <h1 className="text-3xl font-extrabold text-asuMaroon">Captain Console</h1>
        <p className="text-sm text-gray-600">We couldn&apos;t find a pod to manage yet. Once assigned, you&apos;ll see live controls here.</p>
      </div>
    );
  }

  const activeQuest = quests.find((quest) => quest.week === currentWeek) || null;
  const pulseAverage = lastPulseAverage();

  return (
    <div className="space-y-6">
      <header className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 sm:p-8 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-asuMaroon">Captain Console</h1>
            <p className="text-sm text-gray-600">
              {activePod.zone} Pod · {activePod.timeslot} · {activePod.memberIds.length} members
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="rounded-full px-4 py-2 bg-asuMaroon text-white text-sm font-semibold hover:bg-[#6f1833]"
            >
              View Pod
            </button>
            <button
              type="button"
              onClick={handleIssueQuest}
              className="rounded-full px-4 py-2 bg-asuGold text-black text-sm font-semibold hover:brightness-95"
            >
              Issue Quest for Week {currentWeek}
            </button>
          </div>
        </div>
        {role === 'captain-candidate' && (
          <div className="rounded-xl border border-asuGold/50 bg-asuGold/20 px-4 py-2 text-sm font-semibold text-asuMaroon">
            Your captain application is still pending. You have read-only access until approval.
          </div>
        )}
        {issuedMessage && (
          <div className="rounded-xl border border-asuGold/40 bg-asuGold/10 px-4 py-2 text-sm text-asuMaroon font-semibold">
            {issuedMessage}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span>
            <span className="font-semibold text-asuMaroon">Current Week:</span> {currentWeek}
          </span>
          {pulseAverage !== null && (
            <span>
              <span className="font-semibold text-asuMaroon">Last Pulse Avg:</span> {pulseAverage.toFixed(2)}
            </span>
          )}
        </div>
      </header>

      <nav className="flex flex-wrap gap-3">
        {[
          { key: 'members', label: 'Members' },
          { key: 'spaces', label: 'Spaces' },
          { key: 'quests', label: 'Quests' },
          { key: 'applications', label: 'Applications' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key ? 'bg-asuMaroon text-white shadow' : 'bg-white/70 text-asuMaroon hover:bg-asuMaroon/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'members' && (
        <section className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-700">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-asuMaroon">
                  <th className="py-3 pr-4 text-left">Member</th>
                  {weeks.map((week) => (
                    <th key={`checkin-${week}`} className="px-2 py-3 text-center">W{week} ✓</th>
                  ))}
                  {weeks.map((week) => (
                    <th key={`quest-${week}`} className="px-2 py-3 text-center">W{week} Quest</th>
                  ))}
                  <th className="px-2 py-3 text-center">Total Points</th>
                  <th className="px-2 py-3 text-center">Last Pulse Avg</th>
                </tr>
              </thead>
              <tbody>
                {memberRows.map((row) => (
                  <tr key={row.user.id} className="border-t border-asuGray/60">
                    <td className="py-3 pr-4 font-semibold text-asuMaroon">{row.user.name}</td>
                    {weeks.map((week) => (
                      <td key={`check-${row.user.id}-${week}`} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          disabled={role !== 'captain'}
                          onClick={() => handleToggleProgress(row.user.id, week, 'checkin')}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            row.checkins[week]
                              ? 'bg-asuMaroon text-white'
                              : role === 'captain'
                                ? 'bg-asuGray text-gray-500 hover:bg-asuMaroon/20'
                                : 'bg-asuGray text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {row.checkins[week] ? '✓' : '–'}
                        </button>
                      </td>
                    ))}
                    {weeks.map((week) => (
                      <td key={`quest-${row.user.id}-${week}`} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          disabled={role !== 'captain'}
                          onClick={() => handleToggleProgress(row.user.id, week, 'quest')}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            row.quests[week]
                              ? 'bg-asuGold text-black'
                              : role === 'captain'
                                ? 'bg-asuGray text-gray-500 hover:bg-asuGold/30'
                                : 'bg-asuGray text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {row.quests[week] ? '✓' : '–'}
                        </button>
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center font-semibold text-asuMaroon">{row.totalPoints}</td>
                    <td className="px-2 py-2 text-center text-xs text-gray-500">
                      {pulseAverage !== null ? pulseAverage.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'spaces' && (
        <section className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-asuMaroon">Spaces for {activePod.zone}</h2>
              <p className="text-sm text-gray-600">
                Toggle availability to guide your pod&apos;s meetups. Overrides sync with the dashboard instantly.
              </p>
            </div>
            {role !== 'captain' && (
              <span className="text-xs font-semibold text-asuMaroon/70">Read-only while pending approval</span>
            )}
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            {spaces
              .filter((space) => space.zone === activePod.zone)
              .map((space) => {
                const available = getEffectiveAvailability(space, spaceOverrides);
                return (
                  <div
                    key={space.id}
                    className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-asuMaroon">{space.name}</p>
                        <p className="text-xs text-gray-500">
                          Capacity {space.capacity} · {space.ada ? 'ADA friendly' : 'Standard'} ·{' '}
                          {space.sensoryFriendly ? 'Low stimulus' : 'Active'}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={role !== 'captain'}
                      onClick={() => toggleSpaceAvailability(space.id)}
                      className={`text-xs font-semibold ${
                        role === 'captain'
                          ? 'text-asuMaroon hover:underline'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {available ? 'Mark unavailable' : 'Mark available'}
                    </button>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {activeTab === 'quests' && (
        <section className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          {activeQuest ? (
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-asuMaroon">Week {currentWeek}: {activeQuest.title}</h2>
              <p className="text-sm text-gray-600">{activeQuest.description}</p>
              <p className="text-xs text-gray-500">
                Badge: {activeQuest.badges[0]} · Base points: {activeQuest.points.base}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No quest found for this week. Check your data files.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => updateSharedWeek(currentWeek - 1)}
              className="rounded-full border border-asuMaroon/40 px-4 py-2 text-sm font-semibold text-asuMaroon hover:bg-asuMaroon/10"
            >
              Previous Week
            </button>
            <button
              type="button"
              onClick={() => updateSharedWeek(currentWeek + 1)}
              className="rounded-full border border-asuMaroon/40 px-4 py-2 text-sm font-semibold text-asuMaroon hover:bg-asuMaroon/10"
            >
              Next Week
            </button>
            <button
              type="button"
              onClick={handleIssueQuest}
              className="rounded-full bg-asuGold px-5 py-2 text-sm font-semibold text-black hover:brightness-95"
            >
              Issue Quest for Week {currentWeek}
            </button>
          </div>
        </section>
      )}

      {activeTab === 'applications' && (
        <section className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <header className="space-y-2">
            <h2 className="text-xl font-bold text-asuMaroon">Captain Applications</h2>
            <p className="text-sm text-gray-600">
              Approve to elevate peers (or yourself) into full captain mode. Status updates persist locally for demo purposes.
            </p>
          </header>
          {applications.length === 0 ? (
            <p className="text-sm text-gray-500">No applications yet. Encourage peers to apply from the home page.</p>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <article
                  key={application.id}
                  className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-asuMaroon">{application.name}</h3>
                      <p className="text-xs text-gray-500">{application.email}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        application.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : application.status === 'rejected'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-asuGold/30 text-asuMaroon'
                      }`}
                    >
                      {application.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><span className="font-semibold text-asuMaroon">Zones:</span> {application.zones.join(', ')}</p>
                    <p><span className="font-semibold text-asuMaroon">Availability:</span> {application.availability.join(', ')}</p>
                    <p>{application.about}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-asuMaroon font-semibold">
                    <span>
                      <a
                        href={application.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {application.resumeName}
                      </a>
                    </span>
                    <span className="text-gray-400">Submitted {new Date(application.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleApprove(application)}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(application)}
                      className="rounded-full border border-red-500 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default CaptainConsole;
