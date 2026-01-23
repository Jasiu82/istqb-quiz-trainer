import { useState, useEffect } from 'react';
import type { ExamResult, ExamStatistics } from '../types';

const API_URL = 'http://localhost:3001/api';

interface Props {
  onBack: () => void;
}

export default function ExamHistory({ onBack }: Props) {
  const [history, setHistory] = useState<ExamResult[]>([]);
  const [statistics, setStatistics] = useState<ExamStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/exam/history`),
        fetch(`${API_URL}/exam/statistics`)
      ]);

      const historyData = await historyRes.json();
      const statsData = await statsRes.json();

      setHistory(historyData);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <h1 style={{ color: '#333' }}>Ladowanie...</h1>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#17a2b8', color: 'white', padding: '20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>Historia Egzaminow</h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Twoje wyniki z egzaminow probnych</p>
          </div>
          <button
            onClick={onBack}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid white',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Powrot
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        {/* Statistics */}
        {statistics && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', marginTop: 0, marginBottom: '20px' }}>Podsumowanie</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#17a2b8' }}>
                  {statistics.totalExams}
                </div>
                <div style={{ color: '#666' }}>Egzaminow</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
                  {statistics.passedExams}
                </div>
                <div style={{ color: '#666' }}>Zdanych</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>
                  {statistics.failedExams}
                </div>
                <div style={{ color: '#666' }}>Niezdanych</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
                  {statistics.averageScore.toFixed(0)}%
                </div>
                <div style={{ color: '#666' }}>Srednia</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>
                  {statistics.bestScore}%
                </div>
                <div style={{ color: '#666' }}>Najlepszy</div>
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        {history.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#666' }}>Brak historii egzaminow</h3>
            <p style={{ color: '#999' }}>Rozwiaz pierwszy egzamin, aby zobaczyc wyniki tutaj.</p>
          </div>
        ) : (
          <div>
            <h2 style={{ color: '#333', marginBottom: '15px' }}>Wszystkie egzaminy</h2>
            {history.map((exam) => (
              <div
                key={exam.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  borderLeft: `4px solid ${exam.passed ? '#28a745' : '#dc3545'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{
                        backgroundColor: exam.passed ? '#d4edda' : '#f8d7da',
                        color: exam.passed ? '#28a745' : '#dc3545',
                        padding: '3px 10px',
                        borderRadius: '15px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {exam.passed ? 'ZDANY' : 'NIEZDANY'}
                      </span>
                      <span style={{ color: '#666', fontSize: '14px' }}>
                        {formatDate(exam.startedAt)}
                      </span>
                    </div>
                    <div style={{ color: '#333' }}>
                      Poprawne: <strong>{exam.correctAnswers}</strong> / {exam.totalQuestions}
                      <span style={{ margin: '0 10px', color: '#ddd' }}>|</span>
                      Czas: <strong>{formatDuration(exam.durationSeconds)}</strong>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: exam.passed ? '#28a745' : '#dc3545'
                  }}>
                    {exam.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
