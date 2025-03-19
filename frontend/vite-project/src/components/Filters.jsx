// src/components/Filters.jsx
import { useState, useEffect } from 'react';
import { Form, Card } from 'react-bootstrap';

const Filters = ({ onFilterChange }) => {
  const [platforms, setPlatforms] = useState([]);
  const [status, setStatus] = useState('');

  const platformOptions = [
    { value: 'Codeforces', label: 'Codeforces' },
    { value: 'CodeChef', label: 'CodeChef' },
    { value: 'LeetCode', label: 'LeetCode' }
  ];

  const statusOptions = [
    { value: '', label: 'All' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'past', label: 'Past' }
  ];

  useEffect(() => {
    applyFilters();
  }, [platforms, status]);

  const handlePlatformChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setPlatforms([...platforms, value]);
    } else {
      setPlatforms(platforms.filter(p => p !== value));
    }
  };

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
  };

  const applyFilters = () => {
    onFilterChange({
      platforms,
      status
    });
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>Filters</Card.Title>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Platforms</Form.Label>
            <div className="d-flex gap-3">
              {platformOptions.map(option => (
                <Form.Check
                  key={option.value}
                  type="checkbox"
                  id={`platform-${option.value}`}
                  label={option.label}
                  value={option.value}
                  onChange={handlePlatformChange}
                />
              ))}
            </div>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select value={status} onChange={handleStatusChange}>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default Filters;
