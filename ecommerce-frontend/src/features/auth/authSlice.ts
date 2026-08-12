import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { api, toApiFailure, tokenStorage } from '@/api/client'
import type { ApiEnvelope, ApiFailure, User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  /** True until the stored token has been checked against the API on boot. */
  initialising: boolean
  error: ApiFailure | null
}

const initialState: AuthState = {
  user: null,
  token: tokenStorage.get(),
  status: 'idle',
  initialising: true,
  error: null,
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  phone?: string
}

export const register = createAsyncThunk<
  { user: User; token: string },
  RegisterInput,
  { rejectValue: ApiFailure }
>('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<ApiEnvelope<{ user: User; token: string }>>(
      '/auth/register',
      payload
    )
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const login = createAsyncThunk<
  { user: User; token: string },
  { email: string; password: string },
  { rejectValue: ApiFailure }
>('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<ApiEnvelope<{ user: User; token: string }>>('/auth/login', payload)
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

/** Restores the session from a stored token when the app boots. */
export const loadSession = createAsyncThunk<User | null, void, { rejectValue: ApiFailure }>(
  'auth/loadSession',
  async (_, { rejectWithValue }) => {
    if (!tokenStorage.get()) return null
    try {
      const { data } = await api.get<ApiEnvelope<{ user: User }>>('/auth/me')
      return data.data.user
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/auth/logout')
  } catch {
    // Logging out locally must succeed even if the request fails.
  }
  tokenStorage.clear()
})

export const updateProfile = createAsyncThunk<
  User,
  { name?: string; phone?: string; avatar?: string },
  { rejectValue: ApiFailure }
>('auth/updateProfile', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<ApiEnvelope<{ user: User }>>('/auth/me', payload)
    return data.data.user
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const changePassword = createAsyncThunk<
  void,
  { currentPassword: string; newPassword: string },
  { rejectValue: ApiFailure }
>('auth/changePassword', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<ApiEnvelope<{ token: string }>>('/auth/change-password', payload)
    tokenStorage.set(data.data.token)
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null
    },
    /** Called when an interceptor sees the token rejected mid-session. */
    sessionExpired(state) {
      state.user = null
      state.token = null
      state.status = 'idle'
    },
  },
  extraReducers: (builder) => {
    const authSucceeded = (state: AuthState, action: PayloadAction<{ user: User; token: string }>) => {
      state.status = 'succeeded'
      state.user = action.payload.user
      state.token = action.payload.token
      state.error = null
      tokenStorage.set(action.payload.token)
    }

    builder
      .addCase(register.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(register.fulfilled, authSucceeded)
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Registration failed' }
      })

      .addCase(login.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(login.fulfilled, authSucceeded)
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Login failed' }
      })

      .addCase(loadSession.pending, (state) => {
        state.initialising = true
      })
      .addCase(loadSession.fulfilled, (state, action) => {
        state.initialising = false
        state.user = action.payload
        if (!action.payload) state.token = null
      })
      .addCase(loadSession.rejected, (state) => {
        state.initialising = false
        state.user = null
        state.token = null
        tokenStorage.clear()
      })

      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.status = 'idle'
      })

      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload
      })
  },
})

export const { clearAuthError, sessionExpired } = authSlice.actions
export default authSlice.reducer
