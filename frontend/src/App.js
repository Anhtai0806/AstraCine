import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './pages/AdminLayout';
import GenrePage from './pages/GenrePage';
import MoviePage from './pages/MoviePage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/genres" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/genres" replace />} />
          <Route path="genres" element={<GenrePage />} />
          <Route path="movies" element={<MoviePage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
