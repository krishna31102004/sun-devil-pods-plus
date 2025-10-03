import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SpacePicker, { Space } from '../components/SpacePicker';
import BelongingPulse from '../components/BelongingPulse';
import BadgeAvatar from '../components/BadgeAvatar';

type User = {
  id: string;
  name: string;
  email: string;
  zone: string;
  interests: string[];
  times: string[];
  tags: string[];
};

type Pod = {
  id: string;
  zone: string;
  timeslot: string;
  interests: string[];
  tags: string[];
  memberIds: string[];
  captainId: string;
  points: number;
  level: number;
  vibe: number;
};

type Quest = {
  id: string;
  week: number;
  title: string;
  description: string;
  badges: string[];
  points: { base: number; coop4: number; coop6: number };
};

type Badge = {
  id: string;
  name: string;
  icon: string;
  criteria: string;
};

type Reward = {
  id: string;
  name: string;
  description: string;
  cost: number;
};

type SignupPreferences = {
  zone: string;
  times: string[];
  interests: string[];
  tags: string[];
};

type DataBundle = {
  users: User[];
  pods: Pod[];
  quests: Quest[];
  badges: Badge[];
  spaces: Space[];
  rewards: Reward[];
};

const defaultBundle: DataBundle = {
  users: [],
  pods: [],
  quests: [],
  badges: [],
  spaces: [],
  rewards: [],
};

const loadJson = async <T,>(path: string): Promise<T | null> => {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Unable to load ${path}`, error);
    return null;
  }
};

const getEffectiveAvailability = (space: Space, overrides: Record<string, boolean>): boolean => {
  if (space.id in overrides) {
    return overrides[space.id];
  }
  return typeof space.available === 'boolean' ? space.available : true;
};

const PodDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<DataBundle>(defaultBundle);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [signupPrefs, setSignupPrefs] = useState<SignupPreferences | null>(null);
  const [pod, setPod] = useState<Pod | null>(null);
  const [podMembers, setPodMembers] = useState<User[]>([]);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [points, setPoints] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem('points');
    return stored ? parseInt(stored, 10) || 0 : 0;
  });
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([]);
  const [questCompleted, setQuestCompleted] = useState<boolean>(false);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [showSpacePicker, setShowSpacePicker] = useState<boolean>(false);
  const [availabilityOverrides, setAvailabilityOverrides] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    const overrides: Record<string, boolean> = {};
    try {
      const possibleKeys = Object.keys(localStorage).filter((key) => key.startsWith('spaceAvail:'));
      possibleKeys.forEach((key) => {
        const spaceId = key.split(':')[1];
        overrides[spaceId] = localStorage.getItem(key) === '1';
      });
    } catch (error) {
      console.error('Unable to hydrate space availability overrides', error);
    }
    return overrides;
  });
  const [showPulseModal, setShowPulseModal] = useState<boolean>(false);
  const [lastBelongingScore, setLastBelongingScore] = useState<number | null>(null);
  const [belongingDelta, setBelongingDelta] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('me');
  const [currentUserName, setCurrentUserName] = useState<string>('Friend');
  const [isCaptain, setIsCaptain] = useState<boolean>(false);
  const [isCheckedInThisWeek, setIsCheckedInThisWeek] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedWeek = localStorage.getItem('currentWeek');
      if (storedWeek) {
        const parsed = parseInt(storedWeek, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 4) {
          setCurrentWeek(parsed);
        }
      }
      const userId = localStorage.getItem('currentUserId');
      const userName = localStorage.getItem('currentUserName');
      if (userId) setCurrentUserId(userId);
      if (userName) setCurrentUserName(userName);
      const storedSignup = localStorage.getItem('signupData');
      if (!storedSignup) {
        navigate('/', { replace: true });
        return;
      }
      const parsedSignup = JSON.parse(storedSignup) as Partial<SignupPreferences>;
      if (!parsedSignup.zone) {
        throw new Error('Signup zone missing');
      }
      setSignupPrefs({
        zone: parsedSignup.zone,
        times: Array.isArray(parsedSignup.times) ? parsedSignup.times.map(String) : [],
        interests: Array.isArray(parsedSignup.interests) ? parsedSignup.interests.map(String) : [],
        tags: Array.isArray(parsedSignup.tags) ? parsedSignup.tags.map(String) : [],
      });
    } catch (error) {
      console.error('Unable to restore signup session', error);
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      const [users, pods, quests, badges, spaces, rewards] = await Promise.all([
        loadJson<User[]>('/data/users.json'),
        loadJson<Pod[]>('/data/pods.json'),
        loadJson<Quest[]>('/data/quests.json'),
        loadJson<Badge[]>('/data/badges.json'),
        loadJson<Space[]>('/data/spaces.json'),
        loadJson<Reward[]>('/data/rewards.json'),
      ]);
      setBundle({
        users: users ?? [],
        pods: pods ?? [],
        quests: quests ?? [],
        badges: badges ?? [],
        spaces: spaces ?? [],
        rewards: rewards ?? [],
      });
      setIsLoadingData(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (bundle.badges.length === 0) return;
    try {
      const stored = localStorage.getItem('unlockedBadges');
      if (!stored) {
        setUnlockedBadges([]);
        return;
      }
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) {
        const badges = bundle.badges.filter((badge) => parsed.includes(badge.id));
        setUnlockedBadges(badges);
      }
    } catch (error) {
      console.error('Unable to restore badges', error);
    }
  }, [bundle.badges]);

  useEffect(() => {
    if (!signupPrefs || bundle.pods.length === 0) return;
    const { zone, times, interests } = signupPrefs;
    const timeSet = new Set(times);
    const interestSet = new Set(interests);
    const matchesAll = (candidate: Pod) =>
      candidate.zone === zone &&
      timeSet.has(candidate.timeslot) &&
      candidate.interests.some((value) => interestSet.has(value));
    const matchesZoneTime = (candidate: Pod) => candidate.zone === zone && timeSet.has(candidate.timeslot);
    const matchesZoneInterest = (candidate: Pod) =>
      candidate.zone === zone && candidate.interests.some((value) => interestSet.has(value));

    const chosen =
      bundle.pods.find(matchesAll) ||
      bundle.pods.find(matchesZoneTime) ||
      bundle.pods.find(matchesZoneInterest) ||
      bundle.pods.find((candidate) => candidate.zone === zone) ||
      bundle.pods[0] ||
      null;
    setPod(chosen);
  }, [bundle.pods, signupPrefs]);

  useEffect(() => {
    if (!pod) {
      setPodMembers([]);
      return;
    }
    const members = pod.memberIds
      .map((id) => bundle.users.find((user) => user.id === id))
      .filter((user): user is User => Boolean(user));
    setPodMembers(members);
  }, [pod, bundle.users]);

  useEffect(() => {
    if (bundle.quests.length === 0) {
      setQuest(null);
      return;
    }
    const activeQuest = bundle.quests.find((item) => item.week === currentWeek) || null;
    setQuest(activeQuest);
  }, [bundle.quests, currentWeek]);

  useEffect(() => {
    if (!pod) return;
    const captain = pod.captainId === currentUserId;
    setIsCaptain(captain);
  }, [pod, currentUserId]);

  const checkinKey = useMemo(() => (pod ? `checkin:${pod.id}:${currentWeek}:${currentUserId}` : null), [pod, currentWeek, currentUserId]);
  const questCompletionKey = useMemo(
    () => (pod ? `quest:${pod.id}:${currentWeek}:${currentUserId}` : null),
    [pod, currentWeek, currentUserId]
  );

  useEffect(() => {
    if (!checkinKey) {
      setIsCheckedInThisWeek(false);
      return;
    }
    setIsCheckedInThisWeek(Boolean(localStorage.getItem(checkinKey)));
  }, [checkinKey]);

  useEffect(() => {
    if (!questCompletionKey) {
      setQuestCompleted(false);
      return;
    }
    setQuestCompleted(Boolean(localStorage.getItem(questCompletionKey)));
  }, [questCompletionKey]);

  useEffect(() => {
    if (bundle.spaces.length === 0 || !pod) return;
    const overrides: Record<string, boolean> = {};
    bundle.spaces.forEach((space) => {
      const override = localStorage.getItem(`spaceAvail:${space.id}`);
      if (override === '0') overrides[space.id] = false;
      if (override === '1') overrides[space.id] = true;
    });
    setAvailabilityOverrides((prev) => ({ ...overrides, ...prev }));

    const persistedSelection = localStorage.getItem(`selectedSpace:${pod.id}`);
    const candidate = persistedSelection
      ? bundle.spaces.find((space) => space.id === persistedSelection)
      : bundle.spaces.find((space) => space.zone === pod.zone && getEffectiveAvailability(space, overrides));
    if (candidate) {
      setSelectedSpace(candidate);
    }
  }, [bundle.spaces, pod]);

  useEffect(() => {
    try {
      const history: { date: string; scores: number[] }[] = JSON.parse(localStorage.getItem('belongingPulse') || '[]');
      if (history.length > 0) {
        const last = history[history.length - 1];
        const lastAvg = last.scores.reduce((sum, value) => sum + value, 0) / last.scores.length;
        setLastBelongingScore(lastAvg);
        if (history.length > 1) {
          const prev = history[history.length - 2];
          const prevAvg = prev.scores.reduce((sum, value) => sum + value, 0) / prev.scores.length;
          setBelongingDelta(lastAvg - prevAvg);
        }
      }
    } catch (error) {
      console.error('Unable to restore belonging pulse history', error);
    }
  }, []);

  const persistPoints = (value: number) => {
    try {
      localStorage.setItem('points', value.toString());
      window.dispatchEvent(new CustomEvent('pods:points-updated', { detail: value }));
    } catch (error) {
      console.error('Unable to persist points', error);
    }
  };

  const awardBadge = (badgeId: string) => {
    const badge = bundle.badges.find((item) => item.id === badgeId);
    if (!badge) return;
    setUnlockedBadges((prev) => {
      if (prev.some((item) => item.id === badge.id)) {
        return prev;
      }
      const updated = [...prev, badge];
      try {
        localStorage.setItem('unlockedBadges', JSON.stringify(updated.map((item) => item.id)));
      } catch (error) {
        console.error('Unable to persist badge unlock', error);
      }
      return updated;
    });
  };

  const updateWeek = (nextWeek: number) => {
    setCurrentWeek(nextWeek);
    try {
      localStorage.setItem('currentWeek', nextWeek.toString());
    } catch (error) {
      console.error('Unable to persist current week', error);
    }
  };

  const handleCheckIn = () => {
    if (!pod || !checkinKey || isCheckedInThisWeek) return;
    setPoints((prev) => {
      const next = prev + 10;
      persistPoints(next);
      return next;
    });
    localStorage.setItem(checkinKey, '1');
    setIsCheckedInThisWeek(true);
  };

  const handleCompleteQuest = () => {
    if (!pod || !quest || !questCompletionKey || questCompleted) return;
    setPoints((prev) => {
      const next = prev + quest.points.base;
      persistPoints(next);
      return next;
    });
    localStorage.setItem(questCompletionKey, '1');
    setQuestCompleted(true);
    awardBadge(quest.badges[0]);
    setTimeout(() => {
      updateWeek(currentWeek >= 4 ? 1 : currentWeek + 1);
      setQuestCompleted(false);
    }, 600);
  };

  const updateSelectedSpace = (space: Space) => {
    setSelectedSpace(space);
    if (pod) {
      try {
        localStorage.setItem(`selectedSpace:${pod.id}`, space.id);
      } catch (error) {
        console.error('Unable to persist selected space', error);
      }
    }
  };

  const toggleAvailability = (spaceId: string) => {
    const source = bundle.spaces.find((space) => space.id === spaceId);
    if (!source) return;
    setAvailabilityOverrides((prev) => {
      const current = getEffectiveAvailability(source, prev);
      const next = !current;
      const updated = { ...prev, [spaceId]: next };
      try {
        localStorage.setItem(`spaceAvail:${spaceId}`, next ? '1' : '0');
      } catch (error) {
        console.error('Unable to persist space availability', error);
      }
      return updated;
    });
  };

  const handleSavePulse = (scores: number[]) => {
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    if (lastBelongingScore !== null) {
      setBelongingDelta(average - lastBelongingScore);
    }
    setLastBelongingScore(average);
  };

  const sortedRewards = useMemo(() => [...bundle.rewards].sort((a, b) => a.cost - b.cost), [bundle.rewards]);
  const nextReward = sortedRewards.find((reward) => reward.cost > points) ?? sortedRewards[sortedRewards.length - 1];
  const progressToNextReward = nextReward ? Math.min(1, points / nextReward.cost) : 0;

  if (isLoadingData || !signupPrefs) {
    return <div className="p-4">Loading your pod…</div>;
  }

  if (!pod) {
    return (
      <div className="p-4 bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-xl">
        We couldn&apos;t find a matching pod. Please head back to the sign-up page and try again.
      </div>
    );
  }

  if (!quest) {
    return <div className="p-4">Loading this week&apos;s quest…</div>;
  }

  return (
    <div className="space-y-8">
      <section className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-asuMaroon/80">Welcome back</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-asuMaroon">{currentUserName}</h1>
            <p className="text-gray-600 mt-2">
              {pod.zone} Pod · {pod.timeslot} · {podMembers.length} members
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="bg-asuMaroon text-white rounded-2xl px-5 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-white/70">Current Week</p>
              <p className="text-2xl font-bold">{currentWeek} / 4</p>
            </div>
            <div className="bg-asuGold text-black rounded-2xl px-5 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-black/60">Captain</p>
              <p className="text-lg font-semibold">
                {bundle.users.find((user) => user.id === pod.captainId)?.name || 'TBD'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {pod.interests.slice(0, 5).map((interest) => (
            <span key={interest} className="px-3 py-1 rounded-full bg-asuGray text-asuMaroon/80">
              {interest}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-asuMaroon">Pod Roster</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            {podMembers.map((member) => (
              <li key={member.id} className="flex items-center justify-between">
                <span>{member.name}</span>
                <span className="text-xs uppercase tracking-wide text-gray-400">{member.id === pod.captainId ? 'Captain' : 'Member'}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500">
            Vibe score averages {pod.vibe}/5. Keep the rituals going to boost connection.
          </p>
        </div>
        <div className="lg:col-span-2 bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-asuMaroon">Connection Quest · Week {currentWeek}</h2>
              <p className="text-base text-gray-700 font-semibold">{quest.title}</p>
              <p className="text-sm text-gray-600">{quest.description}</p>
            </div>
            <div className="flex flex-col gap-3 min-w-[200px]">
              <button
                onClick={handleCheckIn}
                disabled={isCheckedInThisWeek}
                className={`rounded-full px-4 py-2 font-semibold text-sm transition ${
                  isCheckedInThisWeek ? 'bg-asuGray text-gray-500 cursor-not-allowed' : 'bg-asuMaroon text-white hover:bg-[#6f1833]'
                }`}
              >
                {isCheckedInThisWeek ? 'Checked In' : 'Check in (+10)'}
              </button>
              <button
                onClick={handleCompleteQuest}
                disabled={questCompleted}
                className={`rounded-full px-4 py-2 font-semibold text-sm transition ${
                  questCompleted ? 'bg-asuGray text-gray-500 cursor-not-allowed' : 'bg-asuGold text-black hover:brightness-95'
                }`}
              >
                {questCompleted ? 'Quest Completed' : 'Complete Quest (+30)'}
              </button>
              {isCheckedInThisWeek && (
                <p className="text-xs text-asuMaroon font-semibold text-center">Checked in for Week {currentWeek}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-asuMaroon/80">Pod points</p>
              <h2 className="text-3xl font-extrabold text-asuMaroon">{points.toLocaleString()} pts</h2>
            </div>
            <button
              onClick={() => navigate('/store')}
              className="rounded-full px-5 py-2 bg-asuGold text-black font-semibold text-sm hover:brightness-95"
            >
              Open Store
            </button>
          </div>
          {nextReward && (
            <div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Next reward: {nextReward.name}</span>
                <span>{Math.max(nextReward.cost - points, 0)} pts to go</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-asuGray overflow-hidden">
                <div className="h-full rounded-full bg-asuMaroon transition-all" style={{ width: `${progressToNextReward * 100}%` }} />
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-asuMaroon uppercase tracking-wide mb-3">Badges</h3>
            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(64px,1fr))]">
              {bundle.badges
                .slice()
                .sort((a, b) => {
                  const unlocked = unlockedBadges.map((badge) => badge.id);
                  const aUnlocked = unlocked.includes(a.id);
                  const bUnlocked = unlocked.includes(b.id);
                  if (aUnlocked === bUnlocked) return a.name.localeCompare(b.name);
                  return aUnlocked ? -1 : 1;
                })
                .map((badge) => (
                  <BadgeAvatar key={badge.id} badge={badge} unlocked={unlockedBadges.some((item) => item.id === badge.id)} />
                ))}
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-asuMaroon">Meeting Space</h2>
            {isCaptain && (
              <button
                onClick={() => setShowSpacePicker(true)}
                className="text-sm font-semibold text-asuMaroon hover:underline"
              >
                Choose Space
              </button>
            )}
          </div>
          {selectedSpace ? (
            <div className="space-y-1 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">{selectedSpace.name}</p>
              <p className="text-xs text-gray-500">
                Capacity {selectedSpace.capacity} · {selectedSpace.ada ? 'ADA friendly' : 'Standard'} ·{' '}
                {selectedSpace.sensoryFriendly ? 'Low stimulus' : 'Active'}
              </p>
              {!getEffectiveAvailability(selectedSpace, availabilityOverrides) && (
                <p className="text-xs text-red-600 font-semibold">Currently marked unavailable by your captain.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No space selected yet.</p>
          )}
          {!isCaptain && (
            <p className="text-xs text-gray-500">Only your captain can change this.</p>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-asuMaroon">Belonging Pulse</h2>
          {lastBelongingScore !== null ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                Last average: <span className="font-semibold text-asuMaroon">{lastBelongingScore.toFixed(1)}</span> / 5
              </p>
              {belongingDelta !== null && (
                <p className="text-xs text-gray-500">
                  Change since previous pulse:{' '}
                  <span className={belongingDelta >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {belongingDelta >= 0 ? '+' : ''}
                    {belongingDelta.toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">You haven&apos;t taken the pulse yet.</p>
          )}
          <button
            onClick={() => setShowPulseModal(true)}
            className="rounded-full px-4 py-2 bg-asuMaroon text-white text-sm font-semibold hover:bg-[#6f1833]"
          >
            Take Pulse
          </button>
        </div>
        <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-asuMaroon">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => navigate('/store')}
              className="rounded-2xl border border-asuMaroon/30 bg-asuMaroon/5 px-4 py-3 text-sm font-semibold text-asuMaroon hover:bg-asuMaroon/10"
            >
              Redeem Rewards
            </button>
            {isCaptain && (
              <button
                onClick={() => navigate('/captain')}
                className="rounded-2xl border border-asuGold/40 bg-asuGold/20 px-4 py-3 text-sm font-semibold text-asuMaroon hover:brightness-95"
              >
                Open Captain Console
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="rounded-2xl border border-asuGray bg-asuGray px-4 py-3 text-sm font-semibold text-asuMaroon hover:border-asuMaroon/30"
            >
              Update Preferences
            </button>
          </div>
        </div>
      </section>

      {showSpacePicker && (
        <SpacePicker
          zone={pod.zone}
          spaces={bundle.spaces}
          isCaptain={isCaptain}
          availabilityOverrides={availabilityOverrides}
          onSelect={(space) => {
            updateSelectedSpace(space);
            setShowSpacePicker(false);
          }}
          onToggleAvailability={toggleAvailability}
          onClose={() => setShowSpacePicker(false)}
        />
      )}
      {showPulseModal && (
        <BelongingPulse
          onSave={handleSavePulse}
          onClose={() => setShowPulseModal(false)}
        />
      )}
    </div>
  );
};

export default PodDashboard;
