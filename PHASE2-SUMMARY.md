# Faza 2: PDF Parser i Baza Danych - Podsumowanie

## ✅ Ukończone Zadania

### 1. Analiza Struktury PDFów
- Przeanalizowano oficjalne PDFy ISTQB Foundation Level 4.0
- Zidentyfikowano 4 zestawy pytań (A, B, C, D)
- Każdy zestaw zawiera ~40-66 pytań
- Format: pytanie + 4 odpowiedzi + klucz odpowiedzi + metadane

### 2. PDF Parser Service
**Plik:** `backend/src/services/pdf-parser.service.ts`

**Funkcjonalność:**
- Parsuje pytania z PDF używając biblioteki `pdf-parse`
- Ekstrahuje:
  - Treść pytania
  - 4 odpowiedzi (A, B, C, D)
  - Poprawną odpowiedź
  - Poziom kognitywny (K1, K2, K3)
  - Rozdział (1-6)
  - Cel nauczania (np. FL-1.1.1)
- Parsuje klucz odpowiedzi z osobnego PDF

**Statystyki:**
- **Łącznie:** 186 pytań
- **Podział według rozdziałów:**
  - Rozdział 1: 38 pytań
  - Rozdział 2: 28 pytań
  - Rozdział 3: 20 pytań
  - Rozdział 4: 48 pytań
  - Rozdział 5: 44 pytań
  - Rozdział 6: 8 pytań
- **Podział według poziomu:**
  - K1: 38 pytań (zapamiętanie)
  - K2: 114 pytań (zrozumienie)
  - K3: 34 pytań (zastosowanie)

### 3. Database Service (SQLite)
**Plik:** `backend/src/services/database.service.ts`

**Schemat bazy danych:**
```sql
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer_a TEXT NOT NULL,
  answer_b TEXT NOT NULL,
  answer_c TEXT NOT NULL,
  answer_d TEXT NOT NULL,
  correct TEXT NOT NULL,
  explanation TEXT,
  chapter INTEGER NOT NULL,
  level TEXT NOT NULL,
  learning_objective TEXT NOT NULL,
  points INTEGER NOT NULL,
  set_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Funkcjonalność:**
- `getRandomQuestion(chapter?, level?)` - losowe pytanie z filtrami
- `getQuestions(chapter?, level?, limit)` - wiele pytań
- `getStatistics()` - statystyki pytań
- `bulkInsertQuestions()` - import masowy

**Baza danych:** `data/questions.db`

### 4. Aktualizacja Quiz Endpoint
**Plik:** `backend/src/routes/quiz.routes.ts`

**Nowe endpointy:**

#### `GET /api/quiz/question`
**Query params:**
- `chapter` (opcjonalny) - numer rozdziału (1-6)
- `level` (opcjonalny) - poziom kognitywny (K1, K2, K3)
- `useAI` (opcjonalny) - jeśli `true`, używa Claude API zamiast bazy

**Przykłady:**
```bash
# Losowe pytanie z bazy danych
curl "http://localhost:3001/api/quiz/question"

# Pytanie z rozdziału 1, poziom K2
curl "http://localhost:3001/api/quiz/question?chapter=1&level=K2"

# Wygeneruj pytanie przez AI
curl "http://localhost:3001/api/quiz/question?useAI=true&chapter=1&level=K2"
```

#### `GET /api/quiz/stats`
Zwraca statystyki pytań w bazie danych.

**Przykład odpowiedzi:**
```json
{
  "total": 186,
  "byChapter": {
    "1": 38,
    "2": 28,
    "3": 20,
    "4": 48,
    "5": 44,
    "6": 8
  },
  "byLevel": {
    "K1": 38,
    "K2": 114,
    "K3": 34
  },
  "bySet": {
    "A": 66,
    "B": 40,
    "C": 40,
    "D": 40
  }
}
```

### 5. Scripts Narzędziowe

**Załadowanie pytań do bazy:**
```bash
npx tsx src/scripts/load-questions.ts
```

**Analiza PDF:**
```bash
npx tsx src/scripts/analyze-pdf.ts
npx tsx src/scripts/analyze-answers.ts
```

**Test parsera:**
```bash
npx tsx src/scripts/test-parser.ts
```

## 🎯 Nowe Zależności

```json
{
  "dependencies": {
    "pdf-parse": "^2.4.5",
    "sqlite": "^5.1.1",
    "sqlite3": "^5.1.7"
  },
  "devDependencies": {
    "@types/sqlite3": "^3.1.11"
  }
}
```

## 🚀 Jak Używać

### 1. Pierwsze uruchomienie (załadowanie bazy)
```bash
cd backend
npm install
npx tsx src/scripts/load-questions.ts
```

### 2. Uruchomienie serwera
```bash
npm run dev
```

### 3. Testowanie
```bash
# Endpoint pytań
curl "http://localhost:3001/api/quiz/question?chapter=1&level=K2"

# Statystyki
curl "http://localhost:3001/api/quiz/stats"
```

## 📊 Hybrid Approach

System używa **hybrydowego podejścia**:

1. **Źródło podstawowe:** Oficjalne pytania ISTQB z PDF-ów (186 pytań)
2. **Fallback:** Claude API do generowania dodatkowych pytań (gdy `useAI=true`)

**Zalety:**
- ✅ Oficjalne pytania zgodne z ISTQB
- ✅ Szybkie działanie (bez API calls)
- ✅ Możliwość generowania dodatkowych pytań
- ✅ Filtrowanie według rozdziału i poziomu

## 🐛 Znane Problemy

1. **Parser wieloliniowych odpowiedzi**: Niektóre odpowiedzi mogą zawierać znaki nowej linii, co może powodować niewielkie błędy formatowania.
2. **Brak wyjaśnień**: Obecnie pytania nie zawierają szczegółowych wyjaśnień (tylko podstawowy placeholder).

## 🔜 Następne Kroki (Faza 3)

1. **UI dla wyboru parametrów:**
   - Dropdown dla wyboru rozdziału (1-6)
   - Dropdown dla wyboru poziomu (K1, K2, K3)
   - Przycisk "Tryb AI" dla generowania pytań

2. **System 3-strike:**
   - Przechowywanie błędnych odpowiedzi
   - 3 próby na każde pytanie
   - Feedback z wyciągiem z sylabusa

3. **Progress tracking:**
   - Statystyki użytkownika
   - Historia odpowiedzi
   - Procent ukończenia dla każdego rozdziału

4. **Exam Mode:**
   - 40 pytań
   - Timer 60 minut
   - Brak feedbacku podczas testu
   - Wynik na końcu

## 📁 Struktura Plików

```
backend/
├── src/
│   ├── routes/
│   │   └── quiz.routes.ts         # Zaktualizowane endpointy
│   ├── services/
│   │   ├── pdf-parser.service.ts  # Parser PDF-ów [NOWY]
│   │   ├── database.service.ts     # Obsługa SQLite [NOWY]
│   │   └── ai.service.ts           # Claude API (fallback)
│   └── scripts/
│       ├── load-questions.ts       # Import do bazy [NOWY]
│       ├── test-parser.ts          # Testy parsera [NOWY]
│       ├── analyze-pdf.ts          # Analiza PDF [NOWY]
│       └── analyze-answers.ts      # Analiza odpowiedzi [NOWY]
data/
├── questions/                       # PDFy ISTQB
└── questions.db                     # SQLite baza [NOWY]
```

## ✨ Podsumowanie

Faza 2 została ukończona pomyślnie. System teraz używa oficjalnych pytań ISTQB z bazy danych SQLite, z możliwością generowania dodatkowych pytań przez Claude API jako fallback. Baza zawiera 186 pytań z pełnymi metadanymi, gotowych do użycia w treningu i trybie egzaminacyjnym.
