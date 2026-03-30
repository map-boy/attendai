import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentForm from './pages/StudentForm'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        {/* /attend is what TeacherDashboard generates in the QR link */}
        <Route path="/attend" element={<StudentForm />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)