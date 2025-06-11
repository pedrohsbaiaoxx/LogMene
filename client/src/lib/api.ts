/// <reference types="vite/client" />

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = async (method: string, url: string, data?: any) => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}; 