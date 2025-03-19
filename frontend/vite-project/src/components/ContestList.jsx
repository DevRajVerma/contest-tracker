// src/components/ContestList.jsx
import { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import ContestItem from './ContestItem';
import Filters from './Filters';
import { getContests, addBookmark, removeBookmark, getBookmarks } from '../services/api';

const ContestList = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);
  const [filters, setFilters] = useState({
    platforms: [],
    status: ''
  });

  // Use a hardcoded userId for simplicity
  const userId = 'user123';

  useEffect(() => {
    fetchContests();
    fetchBookmarks();
  }, [filters]);

  const fetchContests = async () => {
    setLoading(true);
    try {
      const data = await getContests(filters);
      setContests(data);
    } catch (error) {
      console.error('Error fetching contests:', error);
    }
    setLoading(false);
  };

  const fetchBookmarks = async () => {
    try {
      const data = await getBookmarks(userId);
      setBookmarks(data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const handleBookmark = async (contestId) => {
    try {
      await addBookmark(contestId, userId);
      fetchBookmarks();
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  };

  const handleRemoveBookmark = async (contestId) => {
    try {
      const bookmark = bookmarks.find(b => b.contestId._id === contestId);
      if (bookmark) {
        await removeBookmark(bookmark._id);
        fetchBookmarks();
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const isBookmarked = (contestId) => {
    return bookmarks.some(bookmark => bookmark.contestId._id === contestId);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <Container>
      <Filters onFilterChange={handleFilterChange} />
      <Row>
        {loading ? (
          <Col className="text-center mt-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </Col>
        ) : contests.length === 0 ? (
          <Col className="text-center mt-5">
            <h4>No contests found</h4>
          </Col>
        ) : (
          contests.map(contest => (
            <Col key={contest._id} xs={12} md={6} lg={4}>
              <ContestItem
                contest={contest}
                isBookmarked={isBookmarked(contest._id)}
                onBookmark={handleBookmark}
                onRemoveBookmark={handleRemoveBookmark}
              />
            </Col>
          ))
        )}
      </Row>
    </Container>
  );
};

export default ContestList;