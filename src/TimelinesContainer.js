// TimelinesContainer.js

import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { v4 as uuidv4 } from 'uuid';
import './TimelinesContainer.css'; // Import the CSS file for TimelinesContainer

const simulateAPICall = (timeout) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const entries = Array.from({ length: 20 }, (_, entryIndex) => ({
        id: uuidv4(), // Generate a unique ID for the entry
        content: `Entry ${entryIndex + 1}`,
        timestamp: new Date().toString(),
        editable: false,
        highlighted: false, // Set "highlighted" to false for newly generated entries
      }));
      resolve(entries);
    }, timeout);
  });

const simulateLoadOlderEntries = (timeout) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const entries = Array.from({ length: 5 }, (_, entryIndex) => ({
        id: uuidv4(), // Generate a unique ID for the entry
        content: `Older Entry ${entryIndex}`,
        timestamp: new Date().toString(),
        editable: false,
        highlighted: false, // Set "highlighted" to false for newly generated entries
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
  const timelineCount = 5; // Number of timelines
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
  const [timelineTitle, setTimelineTitle] = useState(title);
  const [timelineEntries, setTimelineEntries] = useState(entries);
  const [loading, setLoading] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [showEditOptions, setShowEditOptions] = useState(true);
  const [showHabits, setShowHabits] = useState(true);
  const [newEntriesLoaded, setNewEntriesLoaded] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [habitsExpanded, setHabitsExpanded] = useState(true);
  const [habits, setHabits] = useState([
    'Exercise',
    'Read',
    'Meditate',
    // Add more habits as needed
  ]);

  const timelineRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  // const habits = [
  //   'Drink 8 glasses of water',
  //   'Take a 15-minute walk',
  //   'Eat a piece of fruit',
  // ];

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

  const addEntry = async (event) => {
    event.preventDefault(); // Prevent form submission
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call delay

      const textarea = event.target.elements.entry;
      const content = textarea.value.trim();

      if (content !== '') {
        setShouldScrollToBottom(true);

        const newEntry = {
          id: uuidv4(), // Generate a unique ID for the entry
          content,
          timestamp: new Date().toString(),
          editable: false,
          highlighted: false, // Set "highlighted" to false for newly generated entries
        };

        setTimelineEntries((prevEntries) => [...prevEntries, newEntry]);
        textarea.value = '';
      }
    } catch (error) {
      console.error('Failed to add entry:', error);
    } finally {
      setLoading(false);
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

  const handleToggleEditOptions = () => {
    setShowEditOptions((prevShowEditOptions) => !prevShowEditOptions);
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

  const handleCancelEdit = (entryId) => {
    setTimelineEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === entryId ? { ...entry, editable: false } : entry
      )
    );
  };

  const handleEntryChange = (entryId, newContent) => {
    setTimelineEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === entryId ? { ...entry, content: newContent } : entry
      )
    );
  };

  const handleTitleChange = (e) => {
    setNewTitle(e.target.value);
  };

  const handleEditTitle = () => {
    setEditingTitle(true);
  };

  const handleSaveTitle = () => {
    setLoading(true);
    // Simulate API call with a 1-second delay
    setTimeout(() => {
      // Update the title with the new value
      setTimelineTitle(newTitle);
      setEditingTitle(false);
      setLoading(false);
    }, 1000);
  };

  const handleCancelEditTitle = () => {
    setEditingTitle(false);
  };

  const handleDeleteEntry = (id) => {
    const shouldDelete = window.confirm(
      'Are you sure you want to delete this entry?'
    );
    if (shouldDelete) {
      setShouldScrollToBottom(false);
      setTimelineEntries((prevEntries) =>
        prevEntries.filter((entry) => entry.id !== id)
      );
    }
  };

  const handleBulletClick = (id) => {
    setTimelineEntries((prevEntries) =>
      prevEntries.map((entry) => {
        if (entry.id === id) {
          return { ...entry, highlighted: !entry.highlighted };
        }
        return entry;
      })
    );
    setShouldScrollToBottom(false); // Set to false when the bullet-point is clicked
  };

  const handleAddHabitEntry = async (habit) => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate 1 second delay

      const newEntry = {
        id: uuidv4(),
        content: habit,
        timestamp: new Date().toString(),
        editable: false,
        highlighted: false,
      };
      setTimelineEntries((prevEntries) => [...prevEntries, newEntry]); // Append new entry instead of prepending
      setShouldScrollToBottom(true); // Scroll to bottom when a new entry is added
    } catch (error) {
      console.error('Error adding habit entry:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new habit
  const handleAddHabit = () => {
    const newHabit = prompt('Enter a new habit:');
    if (newHabit) {
      setHabits((prevHabits) => [...prevHabits, newHabit]);
    }
  };

  // Function to edit a habit
  const handleEditHabit = (habitIndex) => {
    const updatedHabit = prompt('Edit the habit:', habits[habitIndex]);
    if (updatedHabit) {
      setHabits((prevHabits) =>
        prevHabits.map((habit, index) =>
          index === habitIndex ? updatedHabit : habit
        )
      );
    }
  };

  // Function to delete a habit
  const handleDeleteHabit = (habitIndex) => {
    setHabits((prevHabits) =>
      prevHabits.filter((_, index) => index !== habitIndex)
    );
  };

  // Function to handle click on the habits header
  const handleHabitsHeaderClick = () => {
    setHabitsExpanded(!habitsExpanded);
  };

  return (
    <div className="timeline">
      <div className="timeline-header-container">
        <div className="timeline-header">
          {editingTitle ? (
            <div>
              <input
                type="text"
                value={newTitle}
                onChange={handleTitleChange}
                disabled={loading}
              />
              <button onClick={handleSaveTitle} disabled={loading}>
                Save
              </button>
              <button
                onClick={() => handleCancelEditTitle()}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          ) : (
            <h2 onClick={handleEditTitle}>{timelineTitle}</h2>
          )}
          {loading && <div className="timeline-loader"></div>}
        </div>
        <div className="timeline-actions">
          <div className="timeline-toggle-options">
            <label>
              <input
                type="checkbox"
                checked={showTimestamp}
                onChange={handleToggleTimestamp}
              />
              Show Timestamp
            </label>
            <label>
              <input
                type="checkbox"
                checked={showEditOptions}
                onChange={handleToggleEditOptions}
              />
              Show Edit Options
            </label>
            <label>
              <input
                type="checkbox"
                checked={showHabits}
                onChange={() => setShowHabits((prev) => !prev)}
              />
              Show Habits
            </label>
          </div>
          <button onClick={handleRefresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>
      <div className="timeline-entries" ref={timelineRef}>
        {timelineEntries.map((entry) => (
          <div
            key={entry.id}
            className={`timeline-entry${
              entry.highlighted ? ' highlighted' : ''
            }`}
          >
            <div
              className={`bullet-point${
                entry.highlighted ? ' highlighted' : ''
              }`}
              onClick={() => handleBulletClick(entry.id)}
            ></div>
            {entry.editable ? (
              <>
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
                  <button
                    onClick={() => handleCancelEdit(entry.id)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      entry.content.replace(/\n/g, '<br />')
                    ),
                  }}
                ></div>
                {showTimestamp && (
                  <small>{formatTimestamp(entry.timestamp)}</small>
                )}
                {showEditOptions && (
                  <div className="entry-buttons">
                    <button
                      onClick={() => handleEditEntry(entry.id)}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <form className="entry-input" onSubmit={addEntry}>
        <textarea
          name="entry"
          placeholder="Add an entry..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          Add
        </button>
      </form>

      {showHabits && (
        <div className="habits-container">
          <div className="habits-header" onClick={handleHabitsHeaderClick}>
            Habits {habitsExpanded ? '▾' : '▸'}
          </div>
          {habitsExpanded && (
            <div className="habits">
              {!habits.length && (
                <div className="habit-item">No habits! Add some?</div>
              )}
              {habits.map((habit, index) => (
                <div key={index} className="habit-item">
                  <span
                    className="habit-bullet-point"
                    onClick={() => handleAddHabitEntry(habit)}
                  >
                    +
                  </span>
                  <span className="habit-text">{habit}</span>
                  {showEditOptions && (
                    <div className="habit-actions">
                      <button onClick={() => handleEditHabit(index)}>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteHabit(index)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button className="add-habit-button" onClick={handleAddHabit}>
                Add Habit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelinesContainer;
