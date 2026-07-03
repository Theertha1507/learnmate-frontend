import { useState, useEffect } from 'react';
import './CoursePathwayAgent.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5050';

const QUIZ_QUESTIONS = [
  {
    key: 'exposure',
    question: 'Have you built anything in this area before?',
    options: [
      { label: 'Never tried it', score: 0 },
      { label: 'Followed a tutorial or two', score: 1 },
      { label: 'Built a small project on my own', score: 2 },
    ],
  },
  {
    key: 'concepts',
    question: 'How comfortable are you with the core concepts?',
    options: [
      { label: 'Not familiar', score: 0 },
      { label: 'I know the basics', score: 1 },
      { label: 'I can explain them to someone else', score: 2 },
    ],
  },
  {
    key: 'independence',
    question: 'Could you start a new project here without a tutorial?',
    options: [
      { label: 'No, I’d need guidance', score: 0 },
      { label: 'With reference docs, yes', score: 1 },
      { label: 'Yes, comfortably', score: 2 },
    ],
  },
];

function scoreToLevel(totalScore) {
  if (totalScore <= 1) return 'beginner';
  if (totalScore <= 4) return 'intermediate';
  return 'advanced';
}

function courseCode(id) {
  return id.toUpperCase();
}

export default function CoursePathwayAgent() {
  const [tracks, setTracks] = useState([]);
  const [interest, setInterest] = useState('');
  const [completedIds, setCompletedIds] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [assessing, setAssessing] = useState(true);
  const [answers, setAnswers] = useState({});
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/tracks`)
      .then((res) => res.json())
      .then((data) => {
        setTracks(data.tracks || []);
        if (data.tracks?.length) setInterest(data.tracks[0]);
      })
      .catch(() => setError('Could not reach the agent backend. Is it running?'));
  }, []);

  useEffect(() => {
    if (!interest) return;
    setAssessing(true);
    setAnswers({});
    setPlan(null);
    setCompletedIds([]);
    setLevel(null);
  }, [interest]);

  function selectAnswer(qKey, score) {
    setAnswers((prev) => ({ ...prev, [qKey]: score }));
  }

  async function submitAssessment() {
    const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
    const assessedLevel = scoreToLevel(totalScore);
    setLevel(assessedLevel);
    setAssessing(false);
    await loadRoadmap(assessedLevel, goal);
  }

  async function loadRoadmap(assessedLevel, statedGoal) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interest,
          level: assessedLevel,
          completedIds: [],
          goal: statedGoal,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setPlan(data);
      setCompletedIds(data.completed);
    } catch (err) {
      setError('Failed to load roadmap. Check the backend server.');
    } finally {
      setLoading(false);
    }
  }

  async function markComplete(courseId) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest, level, completedIds, newlyCompletedId: courseId, goal }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setPlan(data);
      setCompletedIds(data.completed);
    } catch (err) {
      setError('Failed to update progress. Check the backend server.');
    } finally {
      setLoading(false);
    }
  }

  const allAnswered = QUIZ_QUESTIONS.every((q) => answers[q.key] !== undefined);

  return (
    <div className="cpa-root">
      <aside className="cpa-sidebar">
        <div className="cpa-sidebar-word">LearnMate</div>
        <div className="cpa-sidebar-tag">Agent · IBM Granite</div>

        <div className="cpa-sidebar-label">Tracks</div>
        <div className="cpa-sidebar-nav">
          {tracks.map((t) => (
            <button
              key={t}
              className={`cpa-sidebar-item ${interest === t ? 'active' : ''}`}
              onClick={() => setInterest(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {level && (
          <div className="cpa-sidebar-footer">
            Level: <span className="cpa-sidebar-level">{level}</span>
          </div>
        )}
      </aside>

      <main className="cpa-main">
        <div className="cpa-breadcrumb">Pathway / {interest || '—'}</div>
        <h1 className="cpa-page-title">{interest || 'Select a track'}</h1>

        {error && <div className="cpa-error">{error}</div>}

        {assessing && interest && (
          <div className="cpa-quiz">
            {QUIZ_QUESTIONS.map((q, i) => (
              <div className="cpa-quiz-q" key={q.key}>
                <div className="cpa-quiz-q-num">Q{i + 1}</div>
                <div className="cpa-quiz-q-body">
                  <div className="cpa-quiz-question">{q.question}</div>
                  <div className="cpa-quiz-options">
                    {q.options.map((opt) => (
                      <button
                        key={opt.label}
                        className={`cpa-quiz-option ${answers[q.key] === opt.score ? 'selected' : ''}`}
                        onClick={() => selectAnswer(q.key, opt.score)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <div className="cpa-quiz-q">
              <div className="cpa-quiz-q-num">Q{QUIZ_QUESTIONS.length + 1}</div>
              <div className="cpa-quiz-q-body">
                <label className="cpa-quiz-goal-label" htmlFor="goal-input">
                  What's your goal? (optional)
                </label>
                <div className="cpa-quiz-goal-hint">e.g. placement ready in 3 months, or switching careers into this field</div>
                <input
                  id="goal-input"
                  className="cpa-quiz-input"
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Tell the agent what you're aiming for"
                />
              </div>
            </div>

            <button className="cpa-quiz-submit" disabled={!allAnswered} onClick={submitAssessment}>
              Submit assessment
            </button>
          </div>
        )}

        {loading && <p className="cpa-loading">consulting granite…</p>}

        {plan && !assessing && !loading && (
          <>
            <div className="cpa-level-tag">
              Assessed level: {level}
              {plan.preferenceMode && plan.preferenceMode !== 'balanced' && (
                <> · Optimizing for: {plan.preferenceMode === 'urgency' ? 'speed' : 'depth'}</>
              )}
              <button className="cpa-retake" onClick={() => setAssessing(true)}>
                retake assessment
              </button>
            </div>

            <div className="cpa-transmission">
              <span className="cpa-transmission-label">Agent guidance</span>
              <p className="cpa-transmission-body">{plan.guidance}</p>
            </div>

            <div className="cpa-table-wrap">
              <div className="cpa-table-head">
                <span>Code</span>
                <span>Course</span>
                <span>Level</span>
                <span>Hrs</span>
                <span style={{ textAlign: 'right' }}>Actions</span>
              </div>
              {plan.recommended.map((course) => (
                <div key={course.id} className="cpa-node unlocked">
                  <span className="cpa-card-code">{courseCode(course.id)}</span>
                  <span className="cpa-card-title">{course.title}</span>
                  <span className="cpa-card-level">{course.level}</span>
                  <span className="cpa-card-hours">{course.hours}h</span>
                  <div className="cpa-card-actions">
                    {course.resourceUrl && (
                      <a href={course.resourceUrl} target="_blank" rel="noopener noreferrer" className="cpa-btn-link">
                        Start
                      </a>
                    )}
                    <button className="cpa-btn-complete" onClick={() => markComplete(course.id)}>
                      Mark complete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {plan.completed?.length > 0 && (
              <div className="cpa-progress-footer">
                {plan.completed.length} course{plan.completed.length !== 1 ? 's' : ''} recorded complete on this pathway
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}