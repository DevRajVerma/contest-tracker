// src/components/ThemeToggle.jsx
import { useContext } from 'react';
import { Button } from 'react-bootstrap';
import { ThemeContext } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <Button
      variant={theme === 'light' ? 'dark' : 'light'}
      onClick={toggleTheme}
      className="ms-2"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </Button>
  );
};

export default ThemeToggle;