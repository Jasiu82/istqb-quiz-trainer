import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SyllabusSection {
  learningObjective: string; // e.g., "FL-1.1.1"
  chapter: number;
  section: number;
  subsection: number;
  level: 'K1' | 'K2' | 'K3';
  description: string;
  content: string;
}

export class SyllabusParserService {
  private syllabusPath: string;
  private cachedSections: Map<string, SyllabusSection> = new Map();

  constructor() {
    this.syllabusPath = path.resolve(
      __dirname,
      '../../../data/syllabus/ISTQB_CertyfikowanyTester_PoziomPodstawowy_v4.0.1.pdf'
    );
  }

  /**
   * Parse entire syllabus and extract learning objectives
   */
  async parseSyllabus(): Promise<SyllabusSection[]> {
    console.log('📄 Parsing syllabus PDF...');

    const dataBuffer = fs.readFileSync(this.syllabusPath);
    const pdfParser = new PDFParse({ data: dataBuffer });
    const result = await pdfParser.getText();

    const sections: SyllabusSection[] = [];

    // Pattern to match learning objectives: FL-X.Y.Z (KN) Description
    const loPattern = /(FL-(\d+)\.(\d+)\.(\d+))\s+\((K[123])\)\s+([^\n]+)/g;

    let match;
    while ((match = loPattern.exec(result.text)) !== null) {
      const [, learningObjective, chapter, section, subsection, level, description] = match;

      // Extract content after this learning objective
      const startPos = match.index + match[0].length;
      const nextMatch = loPattern.exec(result.text);
      const endPos = nextMatch ? nextMatch.index : startPos + 500;

      loPattern.lastIndex = match.index + match[0].length; // Reset for next iteration

      const content = result.text.substring(startPos, endPos).trim();

      const sectionData: SyllabusSection = {
        learningObjective,
        chapter: parseInt(chapter),
        section: parseInt(section),
        subsection: parseInt(subsection),
        level: level as 'K1' | 'K2' | 'K3',
        description: description.trim(),
        content: this.cleanContent(content)
      };

      sections.push(sectionData);
      this.cachedSections.set(learningObjective, sectionData);
    }

    console.log(`✅ Parsed ${sections.length} learning objectives from syllabus`);
    return sections;
  }

  /**
   * Get syllabus section by learning objective
   */
  async getSectionByLearningObjective(learningObjective: string): Promise<SyllabusSection | null> {
    // Check cache first
    if (this.cachedSections.has(learningObjective)) {
      return this.cachedSections.get(learningObjective)!;
    }

    // Parse syllabus if not cached
    if (this.cachedSections.size === 0) {
      await this.parseSyllabus();
    }

    return this.cachedSections.get(learningObjective) || null;
  }

  /**
   * Get enhanced explanation with syllabus excerpt
   */
  async getEnhancedExplanation(
    learningObjective: string,
    baseExplanation: string = ''
  ): Promise<string> {
    const section = await this.getSectionByLearningObjective(learningObjective);

    if (!section) {
      return baseExplanation || 'Odpowiedź zgodna z sylabusem ISTQB Foundation Level 4.0';
    }

    const syllabusExcerpt = section.content.substring(0, 300);

    return `
**${section.learningObjective}** (${section.level}) - ${section.description}

${baseExplanation}

📚 **Wyciąg z sylabusa:**
${syllabusExcerpt}${section.content.length > 300 ? '...' : ''}

_Rozdział ${section.chapter}, Sekcja ${section.chapter}.${section.section}_
    `.trim();
  }

  /**
   * Get all sections for a specific chapter
   */
  async getSectionsByChapter(chapter: number): Promise<SyllabusSection[]> {
    if (this.cachedSections.size === 0) {
      await this.parseSyllabus();
    }

    return Array.from(this.cachedSections.values()).filter(s => s.chapter === chapter);
  }

  /**
   * Clean extracted content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n+/g, ' ') // Remove newlines
      .replace(/[^\S ]/g, '') // Remove special whitespace
      .trim()
      .substring(0, 800); // Limit to 800 characters
  }
}
