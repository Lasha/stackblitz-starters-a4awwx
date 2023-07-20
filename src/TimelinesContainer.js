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
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

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
      setShouldScrollToBottom(true);

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
    if (timelineRef.current && shouldScrollToBottom) {
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

  const handleEditEntry = (entryId) => {
    setShouldScrollToBottom(false);
    setTimelineEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === entryId ? { ...entry, editable: true } : entry
      )
    );
  };

  const handleSaveEntry = async (entryId) => {
    setLoading(true);
    try {
      // Simulate API call with a 1-second delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const updatedEntries = timelineEntries.map((entry) =>
        entry.id === entryId
          ? { ...entry, editable: false, timestamp: new Date().toString() }
          : entry
      );
      setTimelineEntries(updatedEntries);
      setShouldScrollToBottom(false);
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEntryChange = (entryId, newContent) => {
    setTimelineEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === entryId ? { ...entry, content: newContent } : entry
      )
    );
  };

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h2>{title}</h2>
        {loading && <div className="timeline-loader"></div>}
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
            {entry.editable ? (
              <div>
                <textarea
                  value={entry.content}
                  onChange={(e) => handleEntryChange(entry.id, e.target.value)}
                  disabled={loading}
                />
                <div className="entry-buttons">
                  <button
                    onClick={() => handleSaveEntry(entry.id)}
                    disabled={loading}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p>{entry.content}</p>
                {showTimestamp && (
                  <small>{formatTimestamp(entry.timestamp)}</small>
                )}
                <div className="entry-buttons">
                  <button
                    onClick={() => handleEditEntry(entry.id)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
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
