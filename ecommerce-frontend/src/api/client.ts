import axios, { AxiosError } from 'axios'
import type { ApiFailure } from '@/types'

const TOKEN_KEY = 'shopkart_token'

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// Defaults to the Vite dev proxy, so no CORS setup is needed locally.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Where to send a user whose session turned out to be invalid. */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: ApiFailure['errors'] }>) => {
    // A rejected token means the stored session is stale; drop it once.
    if (error.response?.status === 401 && tokenStorage.get()) {
      tokenStorage.clear()
      onUnauthorized?.()
    }
    return Promise.reject(error)
  }
)

/** Turns any axios failure into the single shape the slices reject with. */
export function toApiFailure(error: unknown): ApiFailure {
  const axiosError = error as AxiosError<{ message?: string; errors?: ApiFailure['errors'] }>

  if (axiosError.response) {
    return {
      message: axiosError.response.data?.message || 'Something went wrong. Please try again.',
      errors: axiosError.response.data?.errors,
      status: axiosError.response.status,
    }
  }

  if (axiosError.request) {
    return { message: 'Cannot reach the server. Is the API running on port 5000?' }
  }

  return { message: axiosError.message || 'Unexpected error' }
}
