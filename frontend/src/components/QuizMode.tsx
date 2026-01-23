import { useState, useEffect } from 'react';
import type { Question, QuizStatistics, UserStatistics, QuestionProgress } from '../types';

const API_URL = 'http://localhost:3001/api';

interface Props {
  onBack: () => void;
}

export default function QuizMode({ onBack }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<QuizStatistics | null>(null);
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [currentProgress, setCurrentProgress] = useState<QuestionProgress | null>(null);

  const fetchQuestion = async () => {
    setLoading(true);
    setSelectedAnswer(null);
    setShowFeedback(false);

    try {
      const params = new URLSearchParams();
      if (selectedChapter) params.append('chapter', selectedChapter.toString());
      if (selectedLevel) params.append('level', selectedLevel);

      const response = await fetch(`${API_URL}/quiz/question?${params.toString()}`);
      const data = await response.json();
      setCurrentQuestion(data);

      const questionId = `${data.chapter}-Q${questionCount}`;
      fetchQuestionProgress(questionId);
    } catch (error) {
      console.error('Error fetching question:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${API_URL}/quiz/stats`);
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchUserStatistics = async () => {
    try {
      const response = await fetch(`${API_URL}/quiz/user-stats`);
      const data = await response.json();
      setUserStats(data);
    } catch (error) {
      console.error('Error fetching user statistics:', error);
    }
  };

  const fetchQuestionProgress = async (questionId: string) => {
    try {
      const response = await fetch(`${API_URL}/quiz/progress/${questionId}`);
      const data = await response.json();
      setCurrentProgress(data);
    } catch (error) {
      console.error('Error fetching question progress:', error);
    }
  };

  const recordAnswer = async (questionId: string, userAnswer: string, isCorrect: boolean) => {
    try {
      await fetch(`${API_URL}/quiz/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, userAnswer, isCorrect })
      });
      fetchQuestionProgress(questionId);
      fetchUserStatistics();
    } catch (error) {
      console.error('Error recording answer:', error);
    }
  };

  useEffect(() => {
    fetchQuestion();
    fetchStatistics();
    fetchUserStatistics();
  }, []);

  const handleAnswerClick = async (answer: string) => {
    if (showFeedback) return;
    setSelectedAnswer(answer);
    setShowFeedback(true);

    if (currentQuestion) {
      const isCorrect = answer === currentQuestion.correct;
      const questionId = `${currentQuestion.chapter}-Q${questionCount}`;
      await recordAnswer(questionId, answer, isCorrect);
    }
  };

  const handleNextQuestion = () => {
    setQuestionCount(questionCount + 1);
    fetchQuestion();
  };

  const isCorrect = selectedAnswer === currentQuestion?.correct;

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#333', margin: 0 }}>Tryb Treningowy</h1>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Powrot do menu
        </button>
      </div>

      {/* User Progress */}
      {userStats && (
        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '15px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Twoje Postepy</h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', color: '#333' }}>
            <span>Opanowane: <strong>{userStats.masteredQuestions}</strong></span>
            <span>Poprawne: <strong>{userStats.correctAnswers}</strong></span>
            <span>Niepoprawne: <strong>{userStats.incorrectAnswers}</strong></span>
          </div>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '15px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Baza pytan: {statistics.total}</h3>
        </div>
      )}

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Filtry</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: 'bold' }}>
              Rozdzial:
            </label>
            <select
              value={selectedChapter || ''}
              onChange={(e) => setSelectedChapter(e.target.value ? parseInt(e.target.value) : null)}
              style={{ padding: '8px', fontSize: '14px', borderRadius: '5px', border: '1px solid #ddd' }}
            >
              <option value="">Wszystkie</option>
              <option value="1">Rozdzial 1</option>
              <option value="2">Rozdzial 2</option>
              <option value="3">Rozdzial 3</option>
              <option value="4">Rozdzial 4</option>
              <option value="5">Rozdzial 5</option>
              <option value="6">Rozdzial 6</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: 'bold' }}>
              Poziom:
            </label>
            <select
              value={selectedLevel || ''}
              onChange={(e) => setSelectedLevel(e.target.value || null)}
              style={{ padding: '8px', fontSize: '14px', borderRadius: '5px', border: '1px solid #ddd' }}
            >
              <option value="">Wszystkie</option>
              <option value="K1">K1</option>
              <option value="K2">K2</option>
              <option value="K3">K3</option>
            </select>
          </div>

          <button
            onClick={fetchQuestion}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Zastosuj filtry
          </button>
        </div>
      </div>

      {/* Question */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#333' }}>
          Ladowanie pytania...
        </div>
      )}

      {!loading && currentQuestion && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '15px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
            <span>Pytanie {questionCount} | Rozdzial: {currentQuestion.chapter} | Poziom: {currentQuestion.level}</span>
            {currentProgress && currentProgress.attempts > 0 && (
              <span style={{
                padding: '3px 10px',
                borderRadius: '15px',
                fontSize: '12px',
                backgroundColor: currentProgress.mastered ? '#d4edda' : '#fff3cd'
              }}>
                {currentProgress.mastered ? 'Opanowane' : `Bledy: ${currentProgress.strikes}/3`}
              </span>
            )}
          </div>

          <h3 style={{ color: '#333', marginBottom: '20px', lineHeight: '1.5' }}>
            {currentQuestion.question}
          </h3>

          <div>
            {Object.entries(currentQuestion.answers).map(([key, value]) => {
              let bgColor = 'white';
              let borderColor = '#ddd';

              if (showFeedback) {
                if (key === currentQuestion.correct) {
                  bgColor = '#d4edda';
                  borderColor = '#28a745';
                } else if (key === selectedAnswer) {
                  bgColor = '#f8d7da';
                  borderColor = '#dc3545';
                }
              }

              return (
                <button
                  key={key}
                  onClick={() => handleAnswerClick(key)}
                  disabled={showFeedback}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '15px',
                    marginBottom: '10px',
                    textAlign: 'left',
                    backgroundColor: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '5px',
                    cursor: showFeedback ? 'default' : 'pointer',
                    fontSize: '15px',
                    color: '#333'
                  }}
                >
                  <strong>{key})</strong> {value}
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: isCorrect ? '#d4edda' : '#f8d7da',
              borderRadius: '5px'
            }}>
              <h4 style={{ color: '#333', margin: '0 0 10px 0' }}>
                {isCorrect ? 'Poprawna odpowiedz!' : 'Niepoprawna odpowiedz'}
              </h4>
              <p style={{ color: '#333', margin: '0 0 15px 0' }}>
                <strong>Wyjasnienie:</strong> {currentQuestion.explanation}
              </p>
              <button
                onClick={handleNextQuestion}
                style={{
                  padding: '10px 25px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                Nastepne pytanie
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
