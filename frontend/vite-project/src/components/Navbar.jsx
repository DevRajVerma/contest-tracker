// src/components/Navbar.jsx
import { useContext } from 'react';
import { Navbar as BsNavbar, Container, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { ThemeContext } from '../contexts/ThemeContext';

const Navbar = () => {
  const { theme } = useContext(ThemeContext);

  return (
    <BsNavbar bg={theme} variant={theme} expand="lg" className="mb-4">
      <Container>
        <BsNavbar.Brand as={Link} to="/">Contest Tracker</BsNavbar.Brand>
        <BsNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BsNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/bookmarks">Bookmarks</Nav.Link>
            <Nav.Link as={Link} to="/add-solution">Add Solution</Nav.Link>
          </Nav>
          <ThemeToggle />
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
};

export default Navbar;