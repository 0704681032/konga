import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import AppLayout from './components/Layout/AppLayout';
import { useAuthStore } from './stores/authStore';

// Lazy load pages
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Connections = lazy(() => import('./pages/Connections'));
const Services = lazy(() => import('./pages/Services'));
const ServiceDetail = lazy(() => import('./pages/Services/ServiceDetail'));
const Routes = lazy(() => import('./pages/Routes'));
const RouteDetail = lazy(() => import('./pages/Routes/RouteDetail'));
const Consumers = lazy(() => import('./pages/Consumers'));
const ConsumerDetail = lazy(() => import('./pages/Consumers/ConsumerDetail'));
const Plugins = lazy(() => import('./pages/Plugins'));
const Upstreams = lazy(() => import('./pages/Upstreams'));
const Certificates = lazy(() => import('./pages/Certificates'));
const Snapshots = lazy(() => import('./pages/Snapshots'));
const Users = lazy(() => import('./pages/Users'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Admin route wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.admin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: '/register',
    element: (
      <Suspense fallback={<PageLoader />}>
        <Register />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'connections',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Connections />
          </Suspense>
        ),
      },
      {
        path: 'services',
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <Services />
              </Suspense>
            ),
          },
          {
            path: ':id',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ServiceDetail />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'routes',
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <Routes />
              </Suspense>
            ),
          },
          {
            path: ':id',
            element: (
              <Suspense fallback={<PageLoader />}>
                <RouteDetail />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'consumers',
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <Consumers />
              </Suspense>
            ),
          },
          {
            path: ':id',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ConsumerDetail />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'plugins',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Plugins />
          </Suspense>
        ),
      },
      {
        path: 'upstreams',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Upstreams />
          </Suspense>
        ),
      },
      {
        path: 'certificates',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Certificates />
          </Suspense>
        ),
      },
      {
        path: 'snapshots',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Snapshots />
          </Suspense>
        ),
      },
      {
        path: 'users',
        element: (
          <AdminRoute>
            <Suspense fallback={<PageLoader />}>
              <Users />
            </Suspense>
          </AdminRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
  },
]);