import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

import LoginPage from "../modules/auth/pages/LoginPage";
import HealthPage from "../modules/health/pages/HealthPage";
import UsersPage from "../modules/users/pages/UsersPage";
import OperationsCenterScreen from "../modules/dashboard/screens/OperationsCenterScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/health",
    element: <HealthPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/dashboard',
            element: <OperationsCenterScreen />,
          },
          {
            path: '/users',
            element: <UsersPage />,
          },
        ],
      },
    ],
  },
]);
