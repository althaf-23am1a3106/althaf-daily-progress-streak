// Dashboard configuration constants

export const DASHBOARD_CONFIG = {
  startDate: new Date('2026-05-10'),
  endDate: new Date('2027-05-10'),
  totalDays: 365,
  owner: {
    name: 'Your Name',
    tagline: 'Building consistency, one day at a time',
  },
};

export const TRACKS = {
  AIML: {
    id: 'aiml',
    name: 'AI/ML',
    fullName: 'Artificial Intelligence & Machine Learning',
    icon: '🤖',
  },
  DSA: {
    id: 'dsa',
    name: 'DSA',
    fullName: 'Data Structures & Algorithms',
    icon: '🧩',
  },
} as const;

export const MILESTONES = [
  { days: 7, label: '1 Week', icon: '🌱' },
  { days: 14, label: '2 Weeks', icon: '🌿' },
  { days: 30, label: '1 Month', icon: '🌳' },
  { days: 60, label: '2 Months', icon: '💪' },
  { days: 90, label: '3 Months', icon: '🔥' },
  { days: 180, label: '6 Months', icon: '⭐' },
  { days: 365, label: '1 Year', icon: '🏆' },
];

export const MOTIVATIONAL_QUOTES = [
  {
    quote: "Success is the sum of small efforts, repeated day in and day out.",
    author: "Robert Collier",
  },
  {
    quote: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    quote: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
  },
  {
    quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle",
  },
  {
    quote: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    quote: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
  },
  {
    quote: "Small daily improvements are the key to staggering long-term results.",
    author: "Robin Sharma",
  },
  {
    quote: "Consistency is what transforms average into excellence.",
    author: "Unknown",
  },
];

export const PHILOSOPHY_TEXT = `Consistency is the silent architect of extraordinary achievements. Every single day that you show up, you're not just learning—you're building neural pathways, strengthening habits, and proving to yourself that you're capable of sustained excellence.

This dashboard is my commitment to myself: 365 days of deliberate practice in AI/ML and Data Structures & Algorithms. Not perfection, but persistence. Not intensity, but consistency.

Each box represents a choice—the choice to show up, to learn something new, to push my boundaries even when motivation fades. The glow of completed days isn't just visual; it's the accumulation of knowledge, skill, and most importantly, character.

Remember: Champions don't do extraordinary things. They do ordinary things extraordinarily well, day after day after day.`;
