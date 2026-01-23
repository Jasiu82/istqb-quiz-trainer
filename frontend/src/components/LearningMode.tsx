import { useState, useEffect } from 'react';
import type { Chapter, SyllabusSection, Recommendation } from '../types';

const API_URL = 'http://localhost:3001/api';

interface Props {
  onBack: () => void;
}

export default function LearningMode({ onBack }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [objectives, setObjectives] = useState<SyllabusSection[]>([]);
  const [filteredObjectives, setFilteredObjectives] = useState<SyllabusSection[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedObjective, setExpandedObjective] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterObjectives();
  }, [objectives, searchQuery, selectedChapter, bookmarks]);

  const loadData = async () => {
    try {
      const [chaptersRes, objectivesRes, bookmarksRes, recommendationsRes] = await Promise.all([
        fetch(`${API_URL}/syllabus/chapters`),
        fetch(`${API_URL}/syllabus/all`),
        fetch(`${API_URL}/quiz/bookmarks`),
        fetch(`${API_URL}/quiz/recommendations?limit=5`)
      ]);

      const chaptersData = await chaptersRes.json();
      const objectivesData = await objectivesRes.json();
      const bookmarksData = await bookmarksRes.json();
      const recommendationsData = await recommendationsRes.json();

      setChapters(chaptersData);
      setObjectives(objectivesData);
      setBookmarks(bookmarksData);
      setRecommendations(recommendationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterObjectives = () => {
    let filtered = objectives;

    if (selectedChapter !== null) {
      filtered = filtered.filter(obj => obj.chapter === selectedChapter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(obj =>
        obj.learningObjective.toLowerCase().includes(query) ||
        obj.description.toLowerCase().includes(query) ||
        obj.content.toLowerCase().includes(query)
      );
    }

    setFilteredObjectives(filtered);
  };

  const toggleBookmark = async (learningObjective: string) => {
    const isBookmarked = bookmarks.includes(learningObjective);

    try {
      if (isBookmarked) {
        await fetch(`${API_URL}/quiz/bookmark`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learningObjective })
        });
        setBookmarks(bookmarks.filter(b => b !== learningObjective));
      } else {
        await fetch(`${API_URL}/quiz/bookmark`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learningObjective })
        });
        setBookmarks([...bookmarks, learningObjective]);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
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
      <div style={{ backgroundColor: '#28a745', color: 'white', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>Tryb Nauki</h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Przegladaj syllabus ISTQB</p>
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

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', gap: '20px' }}>
        {/* Sidebar */}
        <div style={{ width: '300px', flexShrink: 0 }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Szukaj..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              marginBottom: '15px',
              boxSizing: 'border-box'
            }}
          />

          {/* Chapters */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#333' }}>
              Rozdzialy
            </div>
            <div
              onClick={() => setSelectedChapter(null)}
              style={{
                padding: '12px 15px',
                cursor: 'pointer',
                backgroundColor: selectedChapter === null ? '#e7f3ff' : 'white',
                color: '#333',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              Wszystkie rozdzialy
            </div>
            {chapters.map((chapter) => (
              <div
                key={chapter.chapter}
                onClick={() => setSelectedChapter(chapter.chapter)}
                style={{
                  padding: '12px 15px',
                  cursor: 'pointer',
                  backgroundColor: selectedChapter === chapter.chapter ? '#e7f3ff' : 'white',
                  color: '#333',
                  borderBottom: '1px solid #f0f0f0'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>Rozdzial {chapter.chapter}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{chapter.title}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>{chapter.count} celow</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Recommendations */}
          {recommendations.length > 0 && !searchQuery && selectedChapter === null && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Rekomendacje nauki</h3>
              {recommendations.map((rec) => (
                <div
                  key={rec.learningObjective}
                  onClick={() => {
                    setSearchQuery(rec.learningObjective);
                    const obj = objectives.find(o => o.learningObjective === rec.learningObjective);
                    if (obj) setSelectedChapter(obj.chapter);
                  }}
                  style={{
                    padding: '10px',
                    backgroundColor: 'white',
                    borderRadius: '5px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    border: '1px solid #ddd'
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#333' }}>{rec.learningObjective}</div>
                  <div style={{ fontSize: '13px', color: '#666' }}>{rec.description}</div>
                  <div style={{ fontSize: '12px', color: '#dc3545' }}>{rec.reason}</div>
                </div>
              ))}
            </div>
          )}

          {/* Results count */}
          <div style={{
            backgroundColor: 'white',
            padding: '12px 15px',
            borderRadius: '8px',
            marginBottom: '15px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            color: '#333'
          }}>
            Znaleziono: <strong>{filteredObjectives.length}</strong> celow nauczania
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  marginLeft: '15px',
                  padding: '5px 10px',
                  backgroundColor: '#f0f0f0',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Wyczysc
              </button>
            )}
          </div>

          {/* Objectives List */}
          {filteredObjectives.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '40px',
              textAlign: 'center',
              borderRadius: '8px',
              color: '#666'
            }}>
              Brak wynikow
            </div>
          ) : (
            filteredObjectives.map((objective) => (
              <div
                key={objective.learningObjective}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  overflow: 'hidden'
                }}
              >
                <div
                  onClick={() => setExpandedObjective(
                    expandedObjective === objective.learningObjective ? null : objective.learningObjective
                  )}
                  style={{
                    padding: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 'bold', color: '#333', fontFamily: 'monospace' }}>
                        {objective.learningObjective}
                      </span>
                      <span style={{
                        backgroundColor: getLevelColor(objective.level),
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {objective.level}
                      </span>
                      {bookmarks.includes(objective.learningObjective) && (
                        <span style={{ color: '#ffc107' }}>*</span>
                      )}
                    </div>
                    <div style={{ color: '#333', fontSize: '14px' }}>{objective.description}</div>
                  </div>
                  <span style={{ color: '#999', fontSize: '18px' }}>
                    {expandedObjective === objective.learningObjective ? '-' : '+'}
                  </span>
                </div>

                {expandedObjective === objective.learningObjective && (
                  <div style={{ padding: '0 15px 15px 15px', borderTop: '1px solid #eee' }}>
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '12px',
                      borderRadius: '5px',
                      marginTop: '10px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '8px' }}>
                        Wyciag z sylabusa:
                      </div>
                      <div style={{ color: '#333', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {objective.content}
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(objective.learningObjective);
                        }}
                        style={{
                          padding: '8px 15px',
                          backgroundColor: bookmarks.includes(objective.learningObjective) ? '#ffc107' : '#f0f0f0',
                          color: bookmarks.includes(objective.learningObjective) ? 'white' : '#333',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        {bookmarks.includes(objective.learningObjective) ? 'Usun zakladke' : 'Dodaj zakladke'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
