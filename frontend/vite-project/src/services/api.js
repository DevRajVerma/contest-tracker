// src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const getContests = async (filters) => {
  const queryParams = new URLSearchParams();
  
  if (filters.platforms && filters.platforms.length > 0) {
    queryParams.append('platform', filters.platforms.join(','));
  }
  
  if (filters.status) {
    queryParams.append('status', filters.status);
  }
  
  const response = await axios.get(`${API_URL}/contests?${queryParams}`);
  return response.data;
};

export const getBookmarks = async (userId) => {
  const response = await axios.get(`${API_URL}/bookmarks/${userId}`);
  return response.data;
};

export const addBookmark = async (contestId, userId) => {
  const response = await axios.post(`${API_URL}/bookmarks`, { contestId, userId });
  return response.data;
};

export const removeBookmark = async (bookmarkId) => {
  const response = await axios.delete(`${API_URL}/bookmarks/${bookmarkId}`);
  return response.data;
};

export const updateSolutionLink = async (contestId, solutionLink) => {
  const response = await axios.patch(`${API_URL}/contests/${contestId}/solution`, { solutionLink });
  return response.data;
};