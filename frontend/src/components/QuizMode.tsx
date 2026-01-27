import { useState, useEffect } from 'react';
import type { Question, QuizStatistics, UserStatistics, QuestionProgress } from '../types';

const API_URL = 'http://localhost:3001/api';

interface Props {
  onBack: () => void;
}

export default function QuizMode({ onBack }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<QuizStatistics | null>(null);
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [currentProgress, setCurrentProgress] = useState<QuestionProgress | null>(null);

  // Funkcje pomocnicze dla multiple-choice
  const isMultipleChoice = (q: Question | null): boolean => q?.correct.includes(',') ?? false;
  const getRequiredCount = (q: Question | null): number => q?.correct.split(',').length ?? 1;

  const fetchQuestion = async () => {
    setLoading(true);
    setSelectedAnswers([]);
    setIsSubmitted(false);
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

  // Toggle zaznaczenia odpowiedzi (bez walidacji)
  const handleAnswerClick = (answerKey: string) => {
    if (isSubmitted) return; // Zablokuj po zatwierdzeniu

    if (isMultipleChoice(currentQuestion)) {
      // Multiple choice - toggle zaznaczenia
      setSelectedAnswers(prev => {
        if (prev.includes(answerKey)) {
          return prev.filter(a => a !== answerKey);
        } else {
          return [...prev, answerKey].sort();
        }
      });
    } else {
      // Single choice - tylko jedna odpowiedź
      setSelectedAnswers([answerKey]);
    }
  };

  // Walidacja po kliknięciu "Zatwierdź odpowiedź"
  const handleSubmitAnswer = async () => {
    if (selectedAnswers.length === 0 || isSubmitted) return;

    const correctAnswers = currentQuestion!.correct.split(',').map(a => a.trim()).sort();
    const userAnswers = [...selectedAnswers].sort();

    const isAnswerCorrect =
      correctAnswers.length === userAnswers.length &&
      correctAnswers.every((ans, idx) => ans === userAnswers[idx]);

    setIsSubmitted(true);
    setShowFeedback(true);

    if (currentQuestion) {
      const questionId = `${currentQuestion.chapter}-Q${questionCount}`;
      const userAnswerString = selectedAnswers.join(',');
      await recordAnswer(questionId, userAnswerString, isAnswerCorrect);
    }
  };

  const handleNextQuestion = () => {
    setQuestionCount(questionCount + 1);
    setSelectedAnswers([]);
    setIsSubmitted(false);
    fetchQuestion();
  };

  // Oblicz czy odpowiedź jest poprawna (dla wyświetlania feedback)
  const isCorrect = (() => {
    if (!currentQuestion || selectedAnswers.length === 0) return false;
    const correctAnswers = currentQuestion.correct.split(',').map(a => a.trim()).sort();
    const userAnswers = [...selectedAnswers].sort();
    return correctAnswers.length === userAnswers.length &&
      correctAnswers.every((ans, idx) => ans === userAnswers[idx]);
  })();

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

          {/* Info o multiple-choice */}
          {isMultipleChoice(currentQuestion) && !isSubmitted && (
            <div style={{
              padding: '10px 15px',
              backgroundColor: '#e3f2fd',
              borderRadius: '5px',
              marginBottom: '15px',
              color: '#1565c0',
              fontSize: '14px'
            }}>
              Wybierz {getRequiredCount(currentQuestion)} odpowiedzi (wybrano: {selectedAnswers.length})
            </div>
          )}

          <div>
            {Object.entries(currentQuestion.answers).map(([key, value]) => {
              const isSelected = selectedAnswers.includes(key);
              const correctAnswers = currentQuestion.correct.split(',').map(a => a.trim());
              const isCorrectAnswer = correctAnswers.includes(key);

              // Określ styl na podstawie stanu
              let bgColor = 'white';
              let borderColor = '#ddd';

              if (isSubmitted && showFeedback) {
                // PO ZATWIERDZENIU - kolorowanie walidacyjne
                if (isCorrectAnswer) {
                  bgColor = '#d4edda';
                  borderColor = '#28a745';
                } else if (isSelected && !isCorrectAnswer) {
                  bgColor = '#f8d7da';
                  borderColor = '#dc3545';
                }
              } else if (isSelected) {
                // PRZED ZATWIERDZENIEM - zaznaczenie użytkownika
                bgColor = '#e3f2fd';
                borderColor = '#2196f3';
              }

              return (
                <button
                  key={key}
                  onClick={() => handleAnswerClick(key)}
                  disabled={isSubmitted}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '15px',
                    marginBottom: '10px',
                    textAlign: 'left',
                    backgroundColor: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '5px',
                    cursor: isSubmitted ? 'default' : 'pointer',
                    fontSize: '15px',
                    color: '#333'
                  }}
                >
                  {/* Checkbox/Radio indicator */}
                  <span style={{
                    width: '22px',
                    height: '22px',
                    marginRight: '12px',
                    border: `2px solid ${isSelected ? '#2196f3' : '#ccc'}`,
                    borderRadius: isMultipleChoice(currentQuestion) ? '4px' : '50%',
                    backgroundColor: isSelected ? '#2196f3' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </span>
                  <span>
                    <strong>{key})</strong> {value}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Przycisk Zatwierdź odpowiedź */}
          {!isSubmitted && selectedAnswers.length > 0 && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={handleSubmitAnswer}
                disabled={isMultipleChoice(currentQuestion) && selectedAnswers.length !== getRequiredCount(currentQuestion)}
                style={{
                  padding: '12px 40px',
                  backgroundColor: (!isMultipleChoice(currentQuestion) || selectedAnswers.length === getRequiredCount(currentQuestion))
                    ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: (!isMultipleChoice(currentQuestion) || selectedAnswers.length === getRequiredCount(currentQuestion))
                    ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Zatwierdz odpowiedz
              </button>
            </div>
          )}

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
              {!isCorrect && (
                <p style={{ color: '#333', margin: '0 0 10px 0' }}>
                  <strong>Poprawna odpowiedz:</strong> {currentQuestion.correct}
                </p>
              )}
              <p style={{ color: '#333', margin: '0 0 15px 0' }}>
                <strong>Wyjasnienie:</strong> {currentQuestion.explanation || 'Brak wyjaśnienia w bazie danych.'}
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
