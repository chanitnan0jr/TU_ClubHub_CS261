import { useState, useEffect, useCallback } from 'react';
import { getClubProfile, updateClubProfile } from '../api/clubApi';
import type { ClubResponseDto, ClubUpdateRequestDto } from '../types/club';

export const useClubProfile = (clubId: string) => {
  const [data, setData] = useState<ClubResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!clubId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const profile = await getClubProfile(clubId);
      setData(profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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