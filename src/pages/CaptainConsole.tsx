import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Pod = {
  id: string;
  zone: string;
  timeslot: string;
  interests: string[];
  tags: string[];
  memberIds: string[];
  captainId: string;
};

type User = {
  id: string;
  name: string;
  email: string;
};

type Quest = {
  id: string;
  week: number;
  title: string;
  description: string;
  badges: string[];
  points: { base: number };
};

type MemberProgress = {
  user: User;
  checkins: Record<number, boolean>;
  quests: Record<number, boolean>;
  totalPoints: number;
  lastUpdated: string | null;
};

const weeks = [1, 2, 3, 4] as const;

const CaptainConsole: React.FC = () => {
  const navigate = useNavigate();
  const [pods, setPods] = useState<Pod[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [issuedBanner, setIssuedBanner] = useState<string | null>(null);
  const [filterWeek, setFilterWeek] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checkinDone' | 'checkinMissed' | 'questDone' | 'questMissed'>('all');
  const [vibeScore, setVibeScore] = useState<number>(3);
  const [vibeAverage, setVibeAverage] = useState<number | null>(null);
  const [vibeEntries, setVibeEntries] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [podsRes, usersRes, questsRes] = await Promise.all([
          fetch('/data/pods.json'),
          fetch('/data/users.json'),
          fetch('/data/quests.json'),
        ]);
        if (podsRes.ok) setPods(await podsRes.json());
        if (usersRes.ok) setUsers(await usersRes.json());
        if (questsRes.ok) setQuests(await questsRes.json());
      } catch (error) {
        console.error('Unable to load captain data', error);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUserId');
    const storedWeek = localStorage.getItem('currentWeek');
    setCurrentUserId(storedUser);
    if (storedWeek) {
      const parsed = parseInt(storedWeek, 10);
      if (!Number.isNaN(parsed)) {
        setCurrentWeek(parsed);
      }
    }
  }, []);

  const activePod = useMemo(() => pods.find((pod) => pod.captainId === currentUserId) || null, [pods, currentUserId]);

  useEffect(() => {
    if (!activePod) return;
    const key = `issuedQuest:${activePod.id}:${currentWeek}`;
    if (localStorage.getItem(key)) {
      setIssuedBanner('This week’s quest is already issued to your pod.');
    } else {
      setIssuedBanner(null);
    }
  }, [activePod, currentWeek]);

  const questByWeek = useMemo(() => {
    const map = new Map<number, Quest>();
    quests.forEach((quest) => map.set(quest.week, quest));
    return map;
  }, [quests]);

  const computeMemberPoints = (memberId: string): number => {
    if (!activePod) return 0;
    return weeks.reduce((total, week) => {
      const checkinKey = `checkin:${activePod.id}:${week}:${memberId}`;
      const questKey = `quest:${activePod.id}:${week}:${memberId}`;
      let points = total;
      if (localStorage.getItem(checkinKey)) points += 10;
      if (localStorage.getItem(questKey)) {
        const quest = questByWeek.get(week);
        points += quest?.points.base ?? 0;
      }
      return points;
    }, 0);
  };

  const loadVibeStats = (podId: string) => {
    try {
      const entries: number[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(`vibe:${podId}:`)) continue;
        const value = parseInt(localStorage.getItem(key) || '0', 10);
        if (!Number.isNaN(value)) entries.push(value);
      }
      if (entries.length === 0) {
        setVibeAverage(null);
        setVibeEntries(0);
      } else {
        const avg = entries.reduce((sum, v) => sum + v, 0) / entries.length;
        setVibeAverage(avg);
        setVibeEntries(entries.length);
      }
    } catch (error) {
      console.error('Unable to compute vibe average', error);
    }
  };

  useEffect(() => {
    if (activePod) {
      loadVibeStats(activePod.id);
    }
  }, [activePod]);

  const memberProgress: MemberProgress[] = useMemo(() => {
    if (!activePod) return [];
    return activePod.memberIds
      .map((memberId) => {
        const user = users.find((candidate) => candidate.id === memberId);
        if (!user) return null;
        const checkins: Record<number, boolean> = {};
        const questFlags: Record<number, boolean> = {};
        weeks.forEach((week) => {
          checkins[week] = Boolean(localStorage.getItem(`checkin:${activePod.id}:${week}:${memberId}`));
          questFlags[week] = Boolean(localStorage.getItem(`quest:${activePod.id}:${week}:${memberId}`));
        });
        const totalPoints = computeMemberPoints(memberId);
        const lastUpdated = localStorage.getItem(`progressUpdated:${activePod.id}:${memberId}`);
        return { user, checkins, quests: questFlags, totalPoints, lastUpdated };
      })
      .filter((entry): entry is MemberProgress => Boolean(entry));
  }, [activePod, users, questByWeek, currentWeek]);

  const filteredProgress = useMemo(() => {
    if (filterWeek === 'all' && statusFilter === 'all') return memberProgress;
    return memberProgress.filter((member) => {
      if (filterWeek === 'all') return true;
      const checkin = member.checkins[filterWeek];
      const quest = member.quests[filterWeek];
      switch (statusFilter) {
        case 'checkinDone':
          return checkin;
        case 'checkinMissed':
          return !checkin;
        case 'questDone':
          return quest;
        case 'questMissed':
          return !quest;
        default:
          return true;
      }
    });
  }, [memberProgress, filterWeek, statusFilter]);

  const persistPointsUpdate = (delta: number) => {
    const current = localStorage.getItem('points');
    const existing = current ? parseInt(current, 10) || 0 : 0;
    const next = Math.max(existing + delta, 0);
    localStorage.setItem('points', next.toString());
    window.dispatchEvent(new CustomEvent('pods:points-updated', { detail: next }));
  };

  const toggleAttendance = (memberId: string, week: number, type: 'checkin' | 'quest') => {
    if (!activePod) return;
    const key = `${type}:${activePod.id}:${week}:${memberId}`;
    const existing = Boolean(localStorage.getItem(key));
    const quest = questByWeek.get(week);
    if (existing) {
      localStorage.removeItem(key);
      if (type === 'checkin') {
        persistPointsUpdate(-10);
      } else if (quest) {
        persistPointsUpdate(-(quest.points.base ?? 0));
      }
    } else {
      localStorage.setItem(key, '1');
      if (type === 'checkin') {
        persistPointsUpdate(10);
      } else if (quest) {
        persistPointsUpdate(quest.points.base ?? 0);
      }
    }
    localStorage.setItem(`progressUpdated:${activePod.id}:${memberId}`, new Date().toISOString());
    window.dispatchEvent(new Event('pods:session-updated'));
    loadVibeStats(activePod.id);
  };

  const issueQuest = () => {
    if (!activePod) return;
    const key = `issuedQuest:${activePod.id}:${currentWeek}`;
    localStorage.setItem(key, new Date().toISOString());
    setIssuedBanner('This week’s quest was just issued to your pod.');
  };

  const saveVibe = () => {
    if (!activePod) return;
    const key = `vibe:${activePod.id}:${new Date().toISOString()}`;
    localStorage.setItem(key, vibeScore.toString());
    loadVibeStats(activePod.id);
  };

  if (!currentUserId) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-xl p-6 space-y-4">
        <p className="text-sm text-gray-600">Sign in or complete the signup flow to access the captain console.</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-full px-5 py-2 bg-asuMaroon text-white text-sm font-semibold"
        >
          Go to Sign Up
        </button>
      </div>
    );
  }

  if (!activePod) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-xl p-6 space-y-4">
        <h1 className="text-3xl font-extrabold text-asuMaroon">Captain Console</h1>
        <p className="text-sm text-gray-600">
          We couldn&apos;t find a pod where you&apos;re listed as the captain. Double-check your signup email or contact the admin team.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-full px-5 py-2 bg-asuMaroon text-white text-sm font-semibold"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

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
              onClick={() => navigate('/dashboard')}
              className="rounded-full px-4 py-2 bg-asuMaroon text-white text-sm font-semibold hover:bg-[#6f1833]"
            >
              View Pod
            </button>
            <button
              onClick={() => issueQuest()}
              className="rounded-full px-4 py-2 bg-asuGold text-black text-sm font-semibold hover:brightness-95"
            >
              Issue This Week&apos;s Quest
            </button>
          </div>
        </div>
        {issuedBanner && (
          <div className="rounded-xl bg-asuGold/20 border border-asuGold/50 px-4 py-2 text-sm text-asuMaroon font-semibold">
            {issuedBanner}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div>
            <span className="font-semibold text-asuMaroon">Current Week:</span> {currentWeek}
          </div>
          <div>
            <span className="font-semibold text-asuMaroon">Vibe Average:</span>{' '}
            {vibeAverage !== null ? `${vibeAverage.toFixed(2)} (${vibeEntries} entries)` : 'No entries yet'}
          </div>
          <label className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-asuMaroon">Quick Vibe</span>
            <input
              type="range"
              min={1}
              max={5}
              value={vibeScore}
              onChange={(event) => setVibeScore(parseInt(event.target.value, 10))}
              className="w-32"
            />
            <span className="font-semibold text-asuMaroon">{vibeScore}</span>
          </label>
          <button
            onClick={saveVibe}
            className="rounded-full px-3 py-1 bg-asuMaroon text-white text-xs font-semibold hover:bg-[#6f1833]"
          >
            Save Vibe
          </button>
        </div>
      </header>

      <section className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-3">
            <label className="text-sm text-gray-600 flex items-center gap-2">
              Week
              <select
                value={filterWeek}
                onChange={(event) =>
                  setFilterWeek(event.target.value === 'all' ? 'all' : parseInt(event.target.value, 10))
                }
                className="border border-asuGray rounded-full px-3 py-1 text-sm"
              >
                <option value="all">All</option>
                {weeks.map((week) => (
                  <option key={week} value={week}>
                    Week {week}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-600 flex items-center gap-2">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="border border-asuGray rounded-full px-3 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="checkinDone">Check-in ✓</option>
                <option value="checkinMissed">Check-in –</option>
                <option value="questDone">Quest ✓</option>
                <option value="questMissed">Quest –</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Use the toggles below to mark attendance and quest completion. Points update automatically with each action.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-700">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-asuMaroon">
                <th className="py-3 pr-4 text-left">Member</th>
                {weeks.map((week) => (
                  <th key={`c-${week}`} className="px-2 py-3 text-center">W{week} ✓</th>
                ))}
                {weeks.map((week) => (
                  <th key={`q-${week}`} className="px-2 py-3 text-center">W{week} Quest</th>
                ))}
                <th className="px-2 py-3 text-center">Total Points</th>
                <th className="px-2 py-3 text-center">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredProgress.map((member) => (
                <tr key={member.user.id} className="border-t border-asuGray/60">
                  <td className="py-3 pr-4 font-semibold text-asuMaroon">{member.user.name}</td>
                  {weeks.map((week) => (
                    <td key={`check-${member.user.id}-${week}`} className="px-2 py-2 text-center">
                      <button
                        onClick={() => toggleAttendance(member.user.id, week, 'checkin')}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          member.checkins[week]
                            ? 'bg-asuMaroon text-white'
                            : 'bg-asuGray text-gray-500 hover:bg-asuMaroon/20'
                        }`}
                      >
                        {member.checkins[week] ? '✓' : '–'}
                      </button>
                    </td>
                  ))}
                  {weeks.map((week) => (
                    <td key={`quest-${member.user.id}-${week}`} className="px-2 py-2 text-center">
                      <button
                        onClick={() => toggleAttendance(member.user.id, week, 'quest')}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          member.quests[week]
                            ? 'bg-asuGold text-black'
                            : 'bg-asuGray text-gray-500 hover:bg-asuGold/30'
                        }`}
                      >
                        {member.quests[week] ? '✓' : '–'}
                      </button>
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-semibold text-asuMaroon">{member.totalPoints}</td>
                  <td className="px-2 py-2 text-center text-xs text-gray-500">
                    {member.lastUpdated ? new Date(member.lastUpdated).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default CaptainConsole;
