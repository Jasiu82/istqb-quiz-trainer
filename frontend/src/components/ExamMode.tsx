import { useState, useEffect, useRef } from 'react';
import type { Question } from '../types';

const API_URL = 'http://localhost:3001/api';
const EXAM_TIME = 60 * 60; // 60 minutes in seconds
const TOTAL_QUESTIONS = 40;

interface Props {
  onBack: () => void;
}

interface ExamQuestion extends Question {
  userAnswer: string | null;
}

export default function ExamMode({ onBack }: Props) {
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(EXAM_TIME);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ correct: number; incorrect: number; unanswered: number } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (examStarted && !examFinished && timeRemaining > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            finishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [examStarted, examFinished]);

  const startExam = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/exam/start`);
      const data = await response.json();

      const examQuestions: ExamQuestion[] = data.questions.map((q: Question) => ({
        ...q,
        userAnswer: null
      }));

      setQuestions(examQuestions);
      setExamStarted(true);
      setTimeRemaining(EXAM_TIME);
    } catch (error) {
      console.error('Error starting exam:', error);
      alert('Nie udalo sie rozpoczac egzaminu');
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (answer: string) => {
    if (examFinished) return;

    const updated = [...questions];
    updated[currentIndex].userAnswer = answer;
    setQuestions(updated);
  };

  const finishExam = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const correct = questions.filter(q => q.userAnswer === q.correct).length;
    const unanswered = questions.filter(q => q.userAnswer === null).length;
    const incorrect = TOTAL_QUESTIONS - correct - unanswered;

    setResults({ correct, incorrect, unanswered });
    setExamFinished(true);

    // Save to backend
    try {
      await fetch(`${API_URL}/exam/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map((q, idx) => ({
            questionIndex: idx,
            userAnswer: q.userAnswer,
            correct: q.correct,
            isCorrect: q.userAnswer === q.correct
          })),
          timeRemaining,
          durationSeconds: EXAM_TIME - timeRemaining
        })
      });
    } catch (error) {
      console.error('Error saving exam results:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Pre-exam screen
  if (!examStarted) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <h1 style={{ color: '#333' }}>Egzamin ISTQB</h1>
        <div style={{
          backgroundColor: 'white',
          maxWidth: '500px',
          margin: '30px auto',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#333', marginTop: 0 }}>Zasady egzaminu</h2>
          <ul style={{ textAlign: 'left', color: '#333', lineHeight: '2' }}>
            <li>40 pytan wielokrotnego wyboru</li>
            <li>60 minut na rozwiazanie</li>
            <li>Prog zdawalnosci: 65% (26 poprawnych)</li>
            <li>Mozesz wracac do poprzednich pytan</li>
          </ul>

          <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={onBack}
              style={{
                padding: '12px 25px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Powrot
            </button>
            <button
              onClick={startExam}
              disabled={loading}
              style={{
                padding: '12px 25px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Ladowanie...' : 'Rozpocznij egzamin'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (examFinished && results) {
    const percentage = Math.round((results.correct / TOTAL_QUESTIONS) * 100);
    const passed = percentage >= 65;

    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <h1 style={{ color: '#333' }}>Wyniki egzaminu</h1>
        <div style={{
          backgroundColor: passed ? '#d4edda' : '#f8d7da',
          maxWidth: '500px',
          margin: '30px auto',
          padding: '30px',
          borderRadius: '10px',
          border: `2px solid ${passed ? '#28a745' : '#dc3545'}`
        }}>
          <h2 style={{ color: passed ? '#28a745' : '#dc3545', marginTop: 0 }}>
            {passed ? 'ZDANY!' : 'NIEZDANY'}
          </h2>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#333' }}>
            {percentage}%
          </div>
          <div style={{ marginTop: '20px', color: '#333' }}>
            <p>Poprawne: <strong>{results.correct}</strong> / {TOTAL_QUESTIONS}</p>
            <p>Niepoprawne: <strong>{results.incorrect}</strong></p>
            <p>Bez odpowiedzi: <strong>{results.unanswered}</strong></p>
          </div>
        </div>

        <button
          onClick={onBack}
          style={{
            padding: '12px 30px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Powrot do menu
        </button>
      </div>
    );
  }

  // Exam screen
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter(q => q.userAnswer !== null).length;

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div>
          <strong>Egzamin ISTQB</strong>
          <span style={{ marginLeft: '20px' }}>
            Pytanie {currentIndex + 1} / {TOTAL_QUESTIONS}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span>Odpowiedziano: {answeredCount} / {TOTAL_QUESTIONS}</span>
          <span style={{
            backgroundColor: timeRemaining < 300 ? '#fff3cd' : 'rgba(255,255,255,0.2)',
            color: timeRemaining < 300 ? '#333' : 'white',
            padding: '5px 15px',
            borderRadius: '5px',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            {formatTime(timeRemaining)}
          </span>
          <button
            onClick={() => {
              if (confirm('Czy na pewno chcesz zakonczyc egzamin?')) {
                finishExam();
              }
            }}
            style={{
              padding: '8px 15px',
              backgroundColor: 'white',
              color: '#dc3545',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Zakoncz egzamin
          </button>
        </div>
      </div>

      {/* Question navigation */}
      <div style={{
        backgroundColor: 'white',
        padding: '10px 20px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px'
      }}>
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            style={{
              width: '35px',
              height: '35px',
              border: idx === currentIndex ? '2px solid #007bff' : '1px solid #ddd',
              borderRadius: '5px',
              backgroundColor: q.userAnswer ? '#d4edda' : 'white',
              cursor: 'pointer',
              fontWeight: idx === currentIndex ? 'bold' : 'normal',
              fontSize: '12px'
            }}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      {/* Question */}
      <div style={{ maxWidth: '900px', margin: '20px auto', padding: '0 20px' }}>
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }}>
            Rozdzial: {currentQuestion.chapter} | Poziom: {currentQuestion.level}
          </div>

          <h3 style={{ color: '#333', marginBottom: '25px', lineHeight: '1.6' }}>
            {currentQuestion.question}
          </h3>

          <div>
            {Object.entries(currentQuestion.answers).map(([key, value]) => (
              <button
                key={key}
                onClick={() => selectAnswer(key)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '15px',
                  marginBottom: '10px',
                  textAlign: 'left',
                  backgroundColor: currentQuestion.userAnswer === key ? '#007bff' : 'white',
                  color: currentQuestion.userAnswer === key ? 'white' : '#333',
                  border: `2px solid ${currentQuestion.userAnswer === key ? '#007bff' : '#ddd'}`,
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                <strong>{key})</strong> {value}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              style={{
                padding: '10px 25px',
                backgroundColor: currentIndex === 0 ? '#ccc' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Poprzednie
            </button>
            <button
              onClick={() => setCurrentIndex(Math.min(TOTAL_QUESTIONS - 1, currentIndex + 1))}
              disabled={currentIndex === TOTAL_QUESTIONS - 1}
              style={{
                padding: '10px 25px',
                backgroundColor: currentIndex === TOTAL_QUESTIONS - 1 ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: currentIndex === TOTAL_QUESTIONS - 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Nastepne
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
