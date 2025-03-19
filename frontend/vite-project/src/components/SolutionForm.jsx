// src/components/SolutionForm.jsx - continued
import { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Row, Col } from 'react-bootstrap';
import { getContests, updateSolutionLink } from '../services/api';

const SolutionForm = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState('');
  const [solutionLink, setSolutionLink] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPastContests();
  }, []);

  const fetchPastContests = async () => {
    setLoading(true);
    try {
      const data = await getContests({ status: 'past' });
      setContests(data);
    } catch (error) {
      console.error('Error fetching past contests:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContest || !solutionLink) {
      setMessage('Please select a contest and provide a solution link');
      return;
    }

    try {
      await updateSolutionLink(selectedContest, solutionLink);
      setMessage('Solution link updated successfully');
      setSolutionLink('');
      setSelectedContest('');
      fetchPastContests();
    } catch (error) {
      console.error('Error updating solution link:', error);
      setMessage('Failed to update solution link');
    }
  };

  return (
    <Container>
      <h2 className="mb-4">Add Solution Links</h2>
      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Select Contest</Form.Label>
              <Form.Select 
                value={selectedContest} 
                onChange={(e) => setSelectedContest(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a contest</option>
                {contests.map(contest => (
                  <option key={contest._id} value={contest._id}>
                    {contest.platform} - {contest.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Solution Link</Form.Label>
              <Form.Control
                type="url"
                placeholder="Enter YouTube video URL"
                value={solutionLink}
                onChange={(e) => setSolutionLink(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                Provide a link to the YouTube video solution
              </Form.Text>
            </Form.Group>
            <Button variant="primary" type="submit">
              Add Solution Link
            </Button>
            {message && (
              <div className="mt-3 alert alert-info">{message}</div>
            )}
          </Form>
        </Card.Body>
      </Card>

      <Row className="mt-4">
        <Col>
          <h4>Suggested YouTube Playlists</h4>
          <ul>
            <li>Leetcode PCDs</li>
            <li>Codeforces PCDs</li>
            <li>Codechef PCDs</li>
          </ul>
        </Col>
      </Row>
    </Container>
  );
};

export default SolutionForm;