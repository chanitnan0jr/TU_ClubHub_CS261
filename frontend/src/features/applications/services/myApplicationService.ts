const API_BASE_URL = 'http://localhost:8080/api/v1';

export const fetchMyApplicationsAPI = async (userId: string = 'student-001'): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/applications/my`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching applications: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch my applications:', error);
    throw error;
  }
};

export const getMyApplications = fetchMyApplicationsAPI;

export const myApplicationService = {
  fetchMyApplicationsAPI,
  getMyApplications,
};

export default myApplicationService;