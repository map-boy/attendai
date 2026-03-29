import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentForm from './pages/StudentForm'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentForm />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
