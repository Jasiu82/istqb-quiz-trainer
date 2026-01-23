import { useState, useEffect } from 'react';
import type { ChapterProgress, KLevelStats, WeakArea, UserStatistics } from '../types';

const API_URL = 'http://localhost:3001/api';

interface Props {
  onBack: () => void;
}

export default function Statistics({ onBack }: Props) {
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [chapterProgress, setChapterProgress] = useState<ChapterProgress[]>([]);
  const [kLevelStats, setKLevelStats] = useState<KLevelStats[]>([]);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userStatsRes, chapterRes, kLevelRes, weakAreasRes] = await Promise.all([
        fetch(`${API_URL}/quiz/user-stats`),
        fetch(`${API_URL}/statistics/chapters`),
        fetch(`${API_URL}/statistics/k-levels`),
        fetch(`${API_URL}/statistics/weak-areas`)
      ]);

      const userStatsData = await userStatsRes.json();
      const chapterData = await chapterRes.json();
      const kLevelData = await kLevelRes.json();
      const weakAreasData = await weakAreasRes.json();

      setUserStats(userStatsData);
      setChapterProgress(chapterData);
      setKLevelStats(kLevelData);
      setWeakAreas(weakAreasData);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'K1': return '#28a745';
      case 'K2': return '#ffc107';
      case 'K3': return '#dc3545';
      default: return '#6c757d';
    }
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
      <div style={{ backgroundColor: '#6c757d', color: 'white', padding: '20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>Moje Statystyki</h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Szczegolowy przeglag postepow</p>
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
        {/* General Stats */}
        {userStats && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', marginTop: 0 }}>Ogolne statystyki</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
                  {userStats.totalAttempts}
                </div>
                <div style={{ color: '#666' }}>Prób</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
                  {userStats.correctAnswers}
                </div>
                <div style={{ color: '#666' }}>Poprawnych</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>
                  {userStats.incorrectAnswers}
                </div>
                <div style={{ color: '#666' }}>Niepoprawnych</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>
                  {userStats.masteredQuestions}
                </div>
                <div style={{ color: '#666' }}>Opanowanych</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6c757d' }}>
                  {userStats.averageStrikes.toFixed(1)}
                </div>
                <div style={{ color: '#666' }}>Srednia bledow</div>
              </div>
            </div>
          </div>
        )}

        {/* Chapter Progress */}
        {chapterProgress.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', marginTop: 0 }}>Postepy wg rozdzialow</h2>
            {chapterProgress.map((chapter) => {
              const progress = chapter.totalQuestions > 0
                ? (chapter.masteredQuestions / chapter.totalQuestions) * 100
                : 0;

              return (
                <div key={chapter.chapter} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ color: '#333', fontWeight: 'bold' }}>
                      Rozdzial {chapter.chapter}: {chapter.title}
                    </span>
                    <span style={{ color: '#666' }}>
                      {chapter.masteredQuestions} / {chapter.totalQuestions}
                    </span>
                  </div>
                  <div style={{
                    height: '20px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      backgroundColor: progress >= 80 ? '#28a745' : progress >= 50 ? '#ffc107' : '#dc3545',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '3px' }}>
                    {progress.toFixed(0)}% opanowane | Skutecznosc: {(chapter.correctRate * 100).toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* K-Level Stats */}
        {kLevelStats.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', marginTop: 0 }}>Postepy wg poziomu kognitywnego</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              {kLevelStats.map((stat) => (
                <div
                  key={stat.level}
                  style={{
                    border: `2px solid ${getLevelColor(stat.level)}`,
                    borderRadius: '8px',
                    padding: '15px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{
                      backgroundColor: getLevelColor(stat.level),
                      color: 'white',
                      padding: '3px 12px',
                      borderRadius: '15px',
                      fontWeight: 'bold'
                    }}>
                      {stat.level}
                    </span>
                    <span style={{ color: '#666', fontSize: '14px' }}>{stat.description}</span>
                  </div>
                  <div style={{ color: '#333' }}>
                    <div>Pytania: {stat.attemptedQuestions} / {stat.totalQuestions}</div>
                    <div>Opanowane: {stat.masteredQuestions}</div>
                    <div>Skutecznosc: {(stat.correctRate * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak Areas */}
        {weakAreas.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', marginTop: 0 }}>Slabe punkty do poprawy</h2>
            {weakAreas.map((area) => (
              <div
                key={area.learningObjective}
                style={{
                  borderLeft: '4px solid #dc3545',
                  padding: '12px 15px',
                  marginBottom: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '0 5px 5px 0'
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                  {area.learningObjective}
                </div>
                <div style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                  {area.description}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  Rozdzial {area.chapter} | Bledy: {area.strikes} | Proby: {area.attempts} | Skutecznosc: {(area.correctRate * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!userStats?.totalAttempts && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#666' }}>Brak danych statystycznych</h3>
            <p style={{ color: '#999' }}>Rozwiaz kilka pytan, aby zobaczyc swoje statystyki.</p>
          </div>
        )}
      </div>
    </div>
  );
}
