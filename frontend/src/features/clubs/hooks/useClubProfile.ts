import { useState, useEffect, useCallback } from 'react';
import { getClubProfile, updateClubProfile } from '../api/clubApi';
import type { ClubResponseDto, ClubUpdateRequestDto } from '../types/club';

export const useClubProfile = (clubId: string) => {
  const [data, setData] = useState<ClubResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestedClubId, setRequestedClubId] = useState(clubId);
  const [reloadCount, setReloadCount] = useState(0);

  // Reset during render, not in the effect, when the route switches to another club.
  if (clubId !== requestedClubId) {
    setRequestedClubId(clubId);
    setIsLoading(true);
    setErrorMessage(null);
  }

  // State changes only in the request callbacks; a superseded request is ignored.
  useEffect(() => {
    if (!clubId) return;
    let current = true;
    getClubProfile(clubId)
      .then((profile) => {
        if (current) setData(profile);
      })
      .catch((err: any) => {
        if (current) setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      })
      .finally(() => {
        if (current) setIsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [clubId, reloadCount]);

  const fetchProfile = useCallback(() => {
    if (!clubId) return;
    setIsLoading(true);
    setErrorMessage(null);
    setReloadCount((count) => count + 1);
  }, [clubId]);

  const handleUpdate = async (updateData: ClubUpdateRequestDto) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedProfile = await updateClubProfile(clubId, updateData);
      setData(updatedProfile);
      setSuccessMessage('อัปเดตข้อมูลชมรมสำเร็จเรียบร้อย');
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถอัปเดตข้อมูลได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    data,
    isLoading,
    isSubmitting,
    errorMessage,
    successMessage,
    handleUpdate,
    refetch: fetchProfile,
    clearAlerts: () => {
      setErrorMessage(null);
      setSuccessMessage(null);
    },
  };
};