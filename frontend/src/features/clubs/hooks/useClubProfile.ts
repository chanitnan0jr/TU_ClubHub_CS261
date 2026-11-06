import { useState, useEffect, useCallback } from 'react';
import { getClubProfile, listClubCategories, listInterestTags } from '../api/clubApi';
import { describeApiError } from '../../../lib/api';
import type { ClubOption, ClubResponseDto } from '../types/club';

/** Everything the profile editor needs before it can show the form. */
export interface ClubProfileEditData {
  profile: ClubResponseDto;
  categories: ClubOption[];
  tags: ClubOption[];
}

/** Loads the club's public profile with the category and tag lists; no data on failure. */
export const useClubProfile = (clubId: string) => {
  const [data, setData] = useState<ClubProfileEditData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestedClubId, setRequestedClubId] = useState(clubId);
  const [reloadCount, setReloadCount] = useState(0);

  // Reset during render, not in the effect, when the route switches to another club.
  if (clubId !== requestedClubId) {
    setRequestedClubId(clubId);
    setData(null);
    setIsLoading(true);
    setErrorMessage(null);
  }

  // State changes only in the request callbacks; a superseded request is ignored.
  useEffect(() => {
    if (!clubId) return;
    let current = true;
    Promise.all([getClubProfile(clubId), listClubCategories(), listInterestTags()])
      .then(([profile, categories, tags]) => {
        if (current) setData({ profile, categories: categories.items, tags: tags.items });
      })
      .catch((err: unknown) => {
        if (current) setErrorMessage(describeApiError(err, 'เกิดข้อผิดพลาดในการโหลดข้อมูล'));
      })
      .finally(() => {
        if (current) setIsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [clubId, reloadCount]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setReloadCount((count) => count + 1);
  }, []);

  return { data, isLoading, errorMessage, refetch };
};
