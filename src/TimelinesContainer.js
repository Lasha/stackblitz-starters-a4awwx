// TimelinesContainer.js

import React, { useEffect, useRef, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { v4 as uuidv4 } from 'uuid';
import './TimelinesContainer.css'; // Import the CSS file for TimelinesContainer

const simulateAPICall = (timeout) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const entries = Array.from({ length: 20 }, (_, entryIndex) => {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor((19 - entryIndex) / 3));

        return {
          id: uuidv4(), // Generate a unique ID for the entry
          content: `Entry ${entryIndex + 1}`,
          timestamp: date.toString(),
          editable: false,
          highlighted: false, // Set "highlighted" to false for newly generated entries
        };
      });

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

const fakeAPISearch = (entries, term) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const results = entries.filter((entry) =>
        entry.content.toLowerCase().includes(term.toLowerCase())
      );
      resolve(results);
    }, 1000);
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
          id: uuidv4(),
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
        timelines.map((timeline) => (
          <Timeline
            key={timeline.id}
            title={timeline.title}
            entries={timeline.entries}
          />
        ))
      )}
    </div>
  );
};

const Timeline = ({ title, entries }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [timelineSearchResults, setTimelineSearchResults] = useState(null);

  const [timelineTitle, setTimelineTitle] = useState(title);
  const [timelineEntries, setTimelineEntries] = useState(entries);
  const [loading, setLoading] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [showEditOptions, setShowEditOptions] = useState(true);
  const [showHabits, setShowHabits] = useState(true);
  const [showTodos, setShowTodos] = useState(true);
  const [newEntriesLoaded, setNewEntriesLoaded] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [habitsExpanded, setHabitsExpanded] = useState(
    !!Math.round(Math.random())
  );
  const [habits, setHabits] = useState([
    'Exercise',
    'Read',
    'Meditate',
    // Add more habits as needed
  ]);

  const [todosExpanded, setTodosExpanded] = useState(
    !!Math.round(Math.random())
  );
  const [todos, setTodos] = useState(['Task 1', 'Task 2', 'Task 3']); // Default todos to start with

  // Define your state and ref here...
  const [entryValue, setEntryValue] = useState('');
  const textareaRef = useRef();
  const entryInputSubmitButtonRef = useRef();
  const [templates, setTemplates] = useState([
    'Template 1:\nThis is a sample template\nWith third line text',
    'Template 2:\nThis is another sample template',
    'Template 3:\nThis is yet another sample template',
  ]);

  const timelineTitleInputRef = useRef(null);

  const timelineRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  // useRef to store a mapping of entry IDs to refs
  const editEntryFormElementRefs = useRef({});

  // State to keep track of refs for textareas in editing mode
  // const [editingRefs, setEditingRefs] = useState({});

  useEffect(() => {
    if (!newEntriesLoaded) {
      scrollToBottom();
    } else {
      // When entries (e.g. older entries) are appended to the timeline,
      // maintain the scroll position. User manually scrolls to see new content.
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

  useEffect(() => {
    adjustTextareaHeight();
  }, [entryValue]);

  useEffect(() => {
    // Why is this here? EDGE CASE BUG FIX. Probably delete in future for better solution... Reproduce:
    // 1. search something that results in 1 item. older posts get loaded invisibly.
    // 2. delete search term and go back to normal entries.
    // 3. notice timeline auto scrolled to the top now (FIX THIS BUG)
    // 4. scroll down and up again to trigger loading older posts. once they're loaded, timeline scrolls all the way down due to bad calculation.
    // 5. this line below is needed to "refresh/update" the scrollHeight so the math is correctly calculated when loading older posts again
    // Ideally this whole displayTimelineEntries switching won't even be a thing because when we're loading read data and perform search, the original timelineEntries will be updated etc.
    prevScrollHeightRef.current = timelineRef.current.scrollHeight;
    scrollToBottom(); // when flipping back to timelineEntries after viewing timelineSearchResults, scroll to bottom of timeline again
  }, [timelineSearchResults]);

  const handleSearch = async (e) => {
    if (e.key === 'Enter') {
      const term = e.target.value;

      if (!term) {
        setTimelineSearchResults(null);
        return;
      }

      setLoading(true);
      const results = await fakeAPISearch(timelineEntries, searchTerm);

      setTimelineSearchResults(results);

      setLoading(false);
    }

    if (e.key === 'Escape') {
      setSearchTerm('');
      setTimelineSearchResults(null);
    }
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
  };

  const displayTimelineEntries = timelineSearchResults || timelineEntries;

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
        setEntryValue('');
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
    window.alert('Implement timeline entries refresh');
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

  // Function to handle edit mode
  const handleEditModeRefSetting = (entryFormElement, entryId) => {
    if (!editEntryFormElementRefs.current[entryId]) {
      editEntryFormElementRefs.current[entryId] = entryFormElement;
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

  const handleSaveEntry = async (entryId, newContent) => {
    setLoading(true);
    try {
      // Simulate API call with a 1-second delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const updatedEntries = timelineEntries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              content: newContent,
              editable: false,
              timestamp: new Date().toString(),
            }
          : entry
      );
      setTimelineEntries(updatedEntries);
      setShouldScrollToBottom(false);

      handleSaveOrCancel(entryId);
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEditEntry = (entryId) => {
    let shouldCancelEdit = true;
    const isDirty =
      editEntryFormElementRefs.current[entryId].elements['entry-textarea']
        .isDirty;

    if (isDirty) {
      shouldCancelEdit = window.confirm(
        'Are you sure you want to cancel? All changes will be lost.'
      );
    }

    if (shouldCancelEdit) {
      setTimelineEntries((prevEntries) =>
        prevEntries.map((entry) =>
          entry.id === entryId ? { ...entry, editable: false } : entry
        )
      );

      handleSaveOrCancel(entryId);
    }
  };

  const handleSaveOrCancel = (entryId) => {
    // Delete ref to entry form element when it's no longer needed
    delete editEntryFormElementRefs.current[entryId];
  };

  const handleTitleChange = (e) => {
    setNewTitle(e.target.value);
  };

  const handleEditTitle = () => {
    setEditingTitle(true);
  };

  const handleSaveTitle = (e) => {
    e.preventDefault();

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

  // ----------------------------Todos functions
  // Function to add a todo as an entry in the timeline and remove it from todos
  const handleAddTodoEntry = async (todo, todoIndex) => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate 1 second delay

      debugger;

      const newEntry = {
        id: uuidv4(),
        content: todo,
        timestamp: new Date().toString(),
        editable: false,
        highlighted: false,
      };
      setTimelineEntries((prevEntries) => [...prevEntries, newEntry]); // Append new entry instead of prepending
      setShouldScrollToBottom(true); // Scroll to bottom when a new entry is added

      // Remove the todo from the list
      setTodos((prevTodos) =>
        prevTodos.filter((_, index) => index !== todoIndex)
      );
    } catch (error) {
      console.error('Error adding todo entry:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new todo
  const handleAddTodo = () => {
    const newTodo = prompt('Enter a new task:');
    if (newTodo) {
      setTodos((prevTodos) => [...prevTodos, newTodo]);
    }
  };

  // Function to edit a todo
  const handleEditTodo = (todoIndex) => {
    const updatedTodo = prompt('Edit the task:', todos[todoIndex]);
    if (updatedTodo) {
      setTodos((prevTodos) =>
        prevTodos.map((todo, index) =>
          index === todoIndex ? updatedTodo : todo
        )
      );
    }
  };

  // Function to delete a todo
  const handleDeleteTodo = (todoIndex) => {
    setTodos((prevTodos) =>
      prevTodos.filter((_, index) => index !== todoIndex)
    );
  };

  // Function to handle click on the todos header
  const handleTodosHeaderClick = () => {
    setTodosExpanded(!todosExpanded);
  };

  //----------------------------- Habits functions
  const handleAddHabitEntry = async (habit) => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate 1 second delay
      debugger;
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

  const handleSelectTemplate = (event) => {
    const templateIndex = parseInt(event.target.value, 10);

    if (isNaN(templateIndex)) {
      return;
    }

    const textareaContent = entryValue.trim();

    if (
      textareaContent !== '' &&
      !window.confirm('This will replace your current content. Are you sure?')
    ) {
      event.target.value = 'default'; // Reset the select value
      return; // If the user cancels, do nothing
    }

    setEntryValue(templates[templateIndex]); // Replace the textarea value with the selected template
    event.target.value = 'default'; // Reset the select value after populating the textarea
  };

  // Function to adjust textarea height
  // TODO: possibly refactor to be more generic. Pass in form DOM element to adjust
  const adjustTextareaHeight = (entryId) => {
    if (entryId) {
      const ref =
        editEntryFormElementRefs.current[entryId].elements['entry-textarea'];
      if (ref) {
        ref.style.height = '0px';
        ref.style.height = `${ref.scrollHeight}px`;
      }
    } else {
      textareaRef.current.style.height = '0px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // textareaElement param can be an input or textarea
  const setCursorToEnd = (textareaElement) => {
    if (textareaElement) {
      const textarea = textareaElement;
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    }
  };

  // This function exists to update editEntryFormElementRefs{}
  // and run adjustTextareaHeight() automatically when an entry goes into editing mode.
  const updateRefOfEntryTextarea = (entryFormElement, entryId) => {
    if (!editEntryFormElementRefs.current[entryId]) {
      handleEditModeRefSetting(entryFormElement, entryId);
      adjustTextareaHeight(entryId);
      setCursorToEnd(entryFormElement.elements['entry-textarea']);
    }
  };

  return (
    <div className="timeline">
      <div className="timeline-header-container">
        <div className="timeline-header">
          {editingTitle ? (
            <form className="timeline-editing" onSubmit={handleSaveTitle}>
              <input
                type="text"
                value={newTitle}
                onChange={handleTitleChange}
                disabled={loading}
                ref={(timelineTitleInputRef) => {
                  setCursorToEnd(timelineTitleInputRef);
                }}
              />
              <button type="submit" disabled={loading}>
                Save
              </button>
              <button
                onClick={() => handleCancelEditTitle()}
                disabled={loading}
              >
                Cancel
              </button>
            </form>
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
                checked={showTodos}
                onChange={() => setShowTodos((prev) => !prev)}
              />
              Show Todos
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
      <div className="timeline-search">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleSearch}
          placeholder="Search..."
        />
      </div>
      <div className="timeline-entries" ref={timelineRef}>
        {displayTimelineEntries.map((entry) => (
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
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.keyCode === 13 || e.keyCode === 32) {
                  // 13 for Enter, 32 for Space
                  e.preventDefault(); // Prevent any default behavior
                  e.target.click();
                }
              }}
            ></div>
            {entry.editable ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const newContent = e.target.elements['entry-textarea'].value;
                  handleSaveEntry(entry.id, newContent);
                }}
                ref={(entryFormElement) => {
                  if (entryFormElement) {
                    updateRefOfEntryTextarea(entryFormElement, entry.id);
                  }
                }}
              >
                <textarea
                  name="entry-textarea"
                  defaultValue={entry.content}
                  onChange={(e) => {
                    adjustTextareaHeight(entry.id);
                    editEntryFormElementRefs.current[entry.id].elements[
                      'entry-textarea'
                    ].isDirty = true;
                  }}
                  onKeyDown={(e) => {
                    if (
                      (e.ctrlKey || e.metaKey) &&
                      (e.keyCode === 13 || e.charCode === 13)
                    ) {
                      e.preventDefault();
                      editEntryFormElementRefs.current[entry.id].elements[
                        'entry-save'
                      ].click();
                    }
                  }}
                  disabled={loading}
                />
                <div className="entry-buttons">
                  <button type="submit" disabled={loading} name="entry-save">
                    Save
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleCancelEditEntry(entry.id);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
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
          ref={textareaRef}
          disabled={loading}
          name="entry"
          placeholder="What's happening?"
          value={entryValue}
          onChange={(e) => {
            setEntryValue(e.target.value);
            // Note: We have a useEffect that listens for changes to entryValue
            // Which in turn calls adjustTextareaHeight() for auto height
          }}
          onKeyDown={(e) => {
            if (
              (e.ctrlKey || e.metaKey) &&
              (e.keyCode === 13 || e.charCode === 13)
            ) {
              e.preventDefault();
              entryInputSubmitButtonRef.current.click();
            }
          }}
        />
        <button
          ref={entryInputSubmitButtonRef}
          disabled={loading}
          type="submit"
        >
          Add
        </button>
      </form>

      <div className="template-container">
        <select
          defaultValue="default"
          onChange={handleSelectTemplate}
          disabled={loading}
        >
          <option value="default" disabled>
            Select a template...
          </option>
          {templates.map((template, index) => (
            <option key={index} value={index}>
              {`Template ${index + 1}`}
            </option>
          ))}
        </select>
      </div>

      {showTodos && (
        <div className="todos-container">
          <div className="todos-header" onClick={handleTodosHeaderClick}>
            Todos {todosExpanded ? '▾' : '▸'}
          </div>
          {todosExpanded && (
            <div className="todos">
              {!todos.length && (
                <div className="todo-item">No todos! Add some?</div>
              )}
              {todos.map((todo, index) => (
                <div key={index} className="todo-item">
                  <span
                    className="todo-bullet-point"
                    onClick={() => handleAddTodoEntry(todo, index)}
                  >
                    +
                  </span>
                  <span className="todo-text">{todo}</span>
                  {showEditOptions && (
                    <div className="todo-actions">
                      <button onClick={() => handleEditTodo(index)}>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteTodo(index)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button className="add-todo-button" onClick={handleAddTodo}>
                Add Task
              </button>
            </div>
          )}
        </div>
      )}

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
