import { configureStore } from '@reduxjs/toolkit';
import themeReducer   from '../features/theme/themeSlice';
import bookingReducer from '../features/booking/bookingSlice';
import authReducer    from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    theme:   themeReducer,
    booking: bookingReducer,
    auth:    authReducer,
  },
});

export default store;
