import { useState } from 'react';
import QuizMode from './components/QuizMode';
import LearningMode from './components/LearningMode';
import ExamMode from './components/ExamMode';
import ExamHistory from './components/ExamHistory';
import Statistics from './components/Statistics';

type AppMode = 'menu' | 'quiz' | 'learning' | 'exam' | 'history' | 'statistics';

const buttonStyle = {
  padding: '20px 40px',
  fontSize: '18px',
  cursor: 'pointer',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  minWidth: '300px',
  fontWeight: 'bold' as const,
};

function App() {
  const [mode, setMode] = useState<AppMode>('menu');

  if (mode === 'quiz') return <QuizMode onBack={() => setMode('menu')} />;
  if (mode === 'learning') return <LearningMode onBack={() => setMode('menu')} />;
  if (mode === 'exam') return <ExamMode onBack={() => setMode('menu')} />;
  if (mode === 'history') return <ExamHistory onBack={() => setMode('menu')} />;
  if (mode === 'statistics') return <Statistics onBack={() => setMode('menu')} />;

  return (
    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <h1 style={{ color: '#333', marginBottom: '10px' }}>ISTQB Foundation Level</h1>
      <h2 style={{ color: '#666', fontWeight: 'normal', marginBottom: '40px' }}>Quiz Trainer v4.0</h2>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
        <button
          onClick={() => setMode('quiz')}
          style={{ ...buttonStyle, backgroundColor: '#007bff' }}
        >
          Tryb Treningowy
        </button>

        <button
          onClick={() => setMode('exam')}
          style={{ ...buttonStyle, backgroundColor: '#dc3545' }}
        >
          Egzamin (40 pytan, 60 min)
        </button>

        <button
          onClick={() => setMode('learning')}
          style={{ ...buttonStyle, backgroundColor: '#28a745' }}
        >
          Nauka
        </button>

        <button
          onClick={() => setMode('history')}
          style={{ ...buttonStyle, backgroundColor: '#17a2b8' }}
        >
          Historia Egzaminow
        </button>

        <button
          onClick={() => setMode('statistics')}
          style={{ ...buttonStyle, backgroundColor: '#6c757d' }}
        >
          Moje Statystyki
        </button>
      </div>
    </div>
  );
}

export default App;
