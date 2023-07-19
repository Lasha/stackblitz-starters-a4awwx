// TimelinesContainer.js

import React, { useEffect, useRef, useState } from 'react';
import './TimelinesContainer.css'; // Import the CSS file for TimelinesContainer

const simulateAPICall = (timeout) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const entries = Array.from({ length: 20 }, (_, entryIndex) => ({
        id: entryIndex + 1,
        content: `Entry ${entryIndex + 1}`,
        timestamp: new Date().toString(),
      }));
      resolve(entries);
    }, timeout);
  });

const simulateLoadOlderEntries = (timeout) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const entries = Array.from({ length: 5 }, (_, entryIndex) => ({
        id: entryIndex,
        content: `Older Entry ${entryIndex}`,
        timestamp: new Date().toString(),
      })).reverse();
      resolve(entries);
    }, timeout);
  });

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
};

const TimelinesContainer = () => {
  const timelineCount = 10; // Number of timelines
  const [loading, setLoading] = useState(true);
  const [timelines, setTimelines] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const timelinesData = [];
      for (let i = 1; i <= timelineCount; i++) {
        const entries = await simulateAPICall(100); // Simulate a delay of 1 second for each timeline
        timelinesData.push({
          id: i,
          title: `Timeline ${i}`,
          entries,
        });
      }
      setTimelines(timelinesData);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="timelines-container">
      {loading ? (
        <p>Loading...</p> // Display a loading state
      ) : (
        <div className="timelines-wrapper">
          {timelines.map((timeline) => (
            <Timeline
              key={timeline.id}
              title={timeline.title}
              entries={timeline.entries}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Timeline = ({ title, entries }) => {
  const [timelineEntries, setTimelineEntries] = useState(entries);
  const [loading, setLoading] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [newEntriesLoaded, setNewEntriesLoaded] = useState(false);

  const timelineRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  useEffect(() => {
    if (!newEntriesLoaded) {
      scrollToBottom();
    } else {
      const newContentHeight =
        timelineRef.current.scrollHeight - prevScrollHeightRef.current;
      timelineRef.current.scrollTop += newContentHeight;
      prevScrollHeightRef.current = timelineRef.current.scrollHeight;
      setNewEntriesLoaded(false);
    }
  }, [timelineEntries]);

  useEffect(() => {
    prevScrollHeightRef.current = timelineRef.current.scrollHeight;
    const handleScroll = () => {
      if (timelineRef.current.scrollTop === 0) {
        loadOlderPosts();
      }
    };

    timelineRef.current.addEventListener('scroll', handleScroll);

    return () => {
      timelineRef.current.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const addEntry = (event) => {
    event.preventDefault();
    const input = event.target.elements.entry;
    const content = input.value.trim();
    if (content !== '') {
      const newEntry = {
        id: Date.now(),
        content,
        timestamp: new Date().toString(),
      };
      setTimelineEntries((prevEntries) => [...prevEntries, newEntry]);
      input.value = '';
    }
  };

  const scrollToBottom = () => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const refreshedEntries = await simulateAPICall(1000);
      setTimelineEntries(refreshedEntries);
      setNewEntriesLoaded(true);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTimestamp = () => {
    setShowTimestamp((prevShowTimestamp) => !prevShowTimestamp);
  };

  const loadOlderPosts = async () => {
    setLoading(true);
    try {
      const olderEntries = await simulateLoadOlderEntries(1000);
      setTimelineEntries((prevEntries) => [...olderEntries, ...prevEntries]);
      setNewEntriesLoaded(true);
    } catch (error) {
      console.error('Error loading older posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h2>{title}</h2>
        {!loading && <div className="timeline-loader"></div>}
      </div>
      <div className="timeline-actions">
        <label>
          <input
            type="checkbox"
            checked={showTimestamp}
            onChange={handleToggleTimestamp}
          />
          Show Timestamp
        </label>
        <button onClick={handleRefresh} disabled={loading}>
          Refresh
        </button>
      </div>
      <div className="timeline-entries" ref={timelineRef}>
        {timelineEntries.map((entry) => (
          <div key={entry.id} className="timeline-entry">
            <p>{entry.content}</p>
            {showTimestamp && <small>{formatTimestamp(entry.timestamp)}</small>}
          </div>
        ))}
      </div>
      <form className="entry-input" onSubmit={addEntry}>
        <input type="text" name="entry" placeholder="Add an entry" />
        <button type="submit">Add</button>
      </form>
    </div>
  );
};

export default TimelinesContainer;
