import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { BookingListPage } from '@/pages/bookings/BookingListPage';
import { BookingCreatePage } from '@/pages/bookings/BookingCreatePage';
import { BookingDetailPage } from '@/pages/bookings/BookingDetailPage';
import { UserListPage } from '@/pages/users/UserListPage';
import { ItineraryLibraryPage } from '@/pages/itinerary/ItineraryLibraryPage';
import { Role } from '@/types';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/bookings" element={<BookingListPage />} />
        <Route path="/bookings/new" element={<BookingCreatePage />} />
        <Route path="/bookings/:id" element={<BookingDetailPage />} />
        <Route
          path="/itinerary"
          element={
            <ProtectedRoute roles={[Role.OPS_MANAGER]}>
              <ItineraryLibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={[Role.OPS_MANAGER]}>
              <UserListPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
