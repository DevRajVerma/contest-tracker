// src/components/ContestItem.jsx
import { Card, Badge, Button } from 'react-bootstrap';
import moment from 'moment';

const ContestItem = ({ contest, isBookmarked, onBookmark, onRemoveBookmark }) => {
  const getStatusBadge = () => {
    switch (contest.status) {
      case 'upcoming':
        return <Badge bg="primary">Upcoming</Badge>;
      case 'ongoing':
        return <Badge bg="success">Ongoing</Badge>;
      case 'past':
        return <Badge bg="secondary">Past</Badge>;
      default:
        return null;
    }
  };

  const getPlatformBadge = () => {
    switch (contest.platform) {
      case 'Codeforces':
        return <Badge bg="danger">Codeforces</Badge>;
      case 'CodeChef':
        return <Badge bg="warning" text="dark">CodeChef</Badge>;
      case 'LeetCode':
        return <Badge bg="info">LeetCode</Badge>;
      default:
        return null;
    }
  };

  const getTimeRemaining = () => {
    if (contest.status === 'upcoming') {
      return `Starts in ${moment(contest.startTime).fromNow(true)}`;
    } else if (contest.status === 'ongoing') {
      return `Ends in ${moment(contest.endTime).fromNow(true)}`;
    } else {
      return `Ended ${moment(contest.endTime).fromNow()}`;
    }
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <Card.Title>{contest.name}</Card.Title>
        <div className="d-flex gap-2 mb-2">
          {getPlatformBadge()}
          {getStatusBadge()}
        </div>
        <Card.Text>
          <strong>Start:</strong> {moment(contest.startTime).format('MMMM D, YYYY, h:mm A')}
          <br />
          <strong>Duration:</strong> {Math.floor(contest.duration / 60)}h {contest.duration % 60}m
          <br />
          <strong>Status:</strong> {getTimeRemaining()}
        </Card.Text>
        <div className="d-flex justify-content-between">
          <Button variant="outline-primary" href={contest.url} target="_blank">
            Go to Contest
          </Button>
          {isBookmarked ? (
            <Button variant="outline-danger" onClick={() => onRemoveBookmark(contest._id)}>
              Remove Bookmark
            </Button>
          ) : (
            <Button variant="outline-success" onClick={() => onBookmark(contest._id)}>
              Bookmark
            </Button>
          )}
        </div>
        {contest.solutionLink && (
          <div className="mt-2">
            <Button variant="outline-info" href={contest.solutionLink} target="_blank">
              Watch Solution
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ContestItem;