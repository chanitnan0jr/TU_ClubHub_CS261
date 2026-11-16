// Fictional demo images are keyed by the demo banner asset, never by database IDs.
const DEMO_CLUB_IMAGES: Record<string, string> = {
  'club-programming.webp': 'programming',
  'club-robotics-iot.webp': 'robotics-iot',
  'club-ai-data-science.webp': 'ai-data-science',
  'club-football.webp': 'football',
  'club-badminton.webp': 'badminton',
  'club-running.webp': 'running',
  'club-music.webp': 'music',
  'club-photography.webp': 'photography',
  'club-community-volunteer.webp': 'community-volunteer',
  'club-environment.webp': 'environment',
};

export function demoClubActivities(banner: string | null | undefined): string[] {
  const prefix = '/images/tu-clubhub-extra-clubs/';
  if (!banner?.startsWith(prefix)) return [];
  const club = DEMO_CLUB_IMAGES[banner.slice(prefix.length)];
  return club ? ['01', '02', '03'].map((number) => `/images/club-activities/${club}/${number}.webp`) : [];
}
