import { ApiError, apiRequest, describeApiError } from '../../../lib/api.ts';
import type {
  ClubDetailData,
  PublicClubProfile,
  PublicOpenRoundPage,
} from '../types/club.ts';

export type ClubDetailResult =
  | { status: 'ok'; club: ClubDetailData }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

const orUndefined = (value: string | null): string | undefined => value || undefined;

export function toClubDetailData(
  profile: PublicClubProfile,
  rounds: PublicOpenRoundPage | null,
): ClubDetailData {
  return {
    id: profile.id,
    name: profile.name,
    category: profile.category?.name ?? '',
    description: profile.description,
    objectives: profile.objectives ?? '',
    tags: profile.tags.map((tag) => tag.name),
    imageUrl: orUndefined(profile.imageUrl),
    bannerUrl: orUndefined(profile.bannerUrl),
    contacts: {
      website: orUndefined(profile.contactUrl),
      facebook: orUndefined(profile.facebookUrl),
      instagram: orUndefined(profile.instagramUrl),
      email: orUndefined(profile.contactEmail),
    },
    rounds: (rounds?.items ?? []).map((round) => ({
      id: round.id,
      title: round.name,
      opensAt: round.opensAt,
      closesAt: round.closesAt,
    })),
    roundsUnavailable: rounds === null,
  };
}

/** Loads a public club profile and its currently open recruitment rounds. */
export async function fetchClubDetail(clubId: string): Promise<ClubDetailResult> {
  const base = `/api/v1/public/clubs/${encodeURIComponent(clubId)}`;

  const [profile, rounds] = await Promise.allSettled([
    apiRequest<PublicClubProfile>(base),
    apiRequest<PublicOpenRoundPage>(`${base}/recruitment-rounds`),
  ]);

  if (profile.status === 'rejected') {
    const error = profile.reason;
    // 404 for an unknown or inactive club, 400 for a malformed ID.
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return { status: 'not-found' };
    }
    return {
      status: 'error',
      message: describeApiError(error, 'ไม่สามารถโหลดข้อมูลชมรมได้ กรุณาลองใหม่อีกครั้ง'),
    };
  }

  return {
    status: 'ok',
    club: toClubDetailData(
      profile.value,
      rounds.status === 'fulfilled' ? rounds.value : null,
    ),
  };
}
