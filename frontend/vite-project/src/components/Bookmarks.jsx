// src/components/Bookmarks.jsx
import { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import ContestItem from './ContestItem';
import { getBookmarks, removeBookmark } from '../services/api';

const Bookmarks = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Use a hardcoded userId for simplicity
  const userId = 'user123';

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const data = await getBookmarks(userId);
      setBookmarks(data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
    setLoading(false);
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

  return (
    <Container>
      <h2 className="mb-4">Bookmarked Contests</h2>
      <Row>
        {loading ? (
          <Col className="text-center mt-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </Col>
        ) : bookmarks.length === 0 ? (
          <Col className="text-center mt-5">
            <h4>No bookmarked contests</h4>
          </Col>
        ) : (
          bookmarks.map(bookmark => (
            <Col key={bookmark._id} xs={12} md={6} lg={4}>
              <ContestItem
                contest={bookmark.contestId}
                isBookmarked={true}
                onRemoveBookmark={handleRemoveBookmark}
              />
            </Col>
          ))
        )}
      </Row>
    </Container>
  );
};

export default Bookmarks;