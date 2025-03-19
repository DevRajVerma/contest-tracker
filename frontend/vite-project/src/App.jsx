// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Navbar from './components/Navbar';
import ContestList from './components/ContestList';
import Bookmarks from './components/Bookmarks';
import SolutionForm from './components/SolutionForm';
import { ThemeProvider } from './contexts/ThemeContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Navbar />
        <Container className="mt-4">
          <Routes>
            <Route path="/" element={<ContestList />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/add-solution" element={<SolutionForm />} />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
}

export default App;