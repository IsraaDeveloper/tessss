import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Mutasi from './pages/Mutasi.jsx';
import Developer from './pages/Developer.jsx';
import Documentation from './pages/Documentation.jsx';
import Admin from './pages/Admin.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/docs" element={<Documentation />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/mutasi" element={<Mutasi />} />
        <Route path="/developer" element={<Developer />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;
