/**
 * LLM Generators for Realistic Simulation
 *
 * Uses Gemini Flash 2.5 via OpenRouter to generate:
 * - User personalities
 * - Benchmark ideas
 * - Prompts
 *
 * @module server-only
 */

import 'server-only';
import type { RealisticPersonality, RealisticBenchmarkIdea } from '../types';

const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Track generated names to ensure uniqueness
const generatedNames = new Set<string>();

export type PromptType = 'multiple_choice' | 'open_ended';

interface GeneratedPrompt {
  question: string;
  fullPrompt: string;
  answerKey?: string;
  answer?: string;
  options?: Record<string, string>; // For multiple choice: {A: "text", B: "text", ...}
  promptType: PromptType;
}

/**
 * Call OpenRouter API with Gemini Flash 2.5
 */
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://peerbench.com',
      'X-Title': 'PeerBench Simulation',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8, // Higher temperature for more creativity
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Generate a realistic user personality with unique name
 */
export async function generatePersonality(
  model: string = DEFAULT_MODEL,
  customSystemPrompt?: string,
  country?: string | null,
  universityName?: string
): Promise<RealisticPersonality> {
  const systemPrompt = customSystemPrompt || `You are a creative persona generator for academic/research simulation. Generate diverse, realistic researcher/developer personalities with COMPLETELY UNIQUE names. Each person must have a different name - never repeat names.`;

  const existingNames = Array.from(generatedNames);
  const avoidNamesInstruction = existingNames.length > 0
    ? `\n\n🚨 CRITICAL REQUIREMENT 🚨\nThe following names are ALREADY IN USE. You MUST generate a COMPLETELY DIFFERENT name:\n${existingNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nYour new person MUST have a different first name AND last name from all of these.`
    : '';

  const countryContext = country
    ? `\n\n📍 LOCATION REQUIREMENT:\nThis researcher is affiliated with ${universityName || 'a university'} in ${country}.\nGenerate a name that is COMMON and REALISTIC for someone from ${country}.\nUse typical naming conventions for ${country}.`
    : '\n\nGenerate a unique name with varied cultural background (Asian, African, European, Latin American, Middle Eastern, etc.).';

  const userPrompt = `Generate a realistic personality for a researcher or developer who might contribute to a benchmark platform.

REQUIREMENTS:
- Create a UNIQUE name that is different from any existing names
${country ? `- The person is from ${country}, so use a name common in that country` : '- Use diverse cultural backgrounds for names'}
- Make the personality distinct and realistic

Return ONLY a JSON object with this structure:
{
  "name": "Full Name (MUST BE UNIQUE and appropriate for ${country || 'their background'})",
  "background": "Brief background (education, experience)",
  "interests": ["interest1", "interest2", "interest3"],
  "behaviorTraits": ["trait1", "trait2", "trait3"],
  "reviewStyle": "How they review others' work (1-2 sentences)",
  "promptCreationStyle": "How they create benchmarks (1-2 sentences)"
}

No markdown, just the JSON object.${countryContext}${avoidNamesInstruction}`;

  const response = await callLLM(systemPrompt, userPrompt, model);

  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const personality = JSON.parse(jsonMatch[0]);

    // Check if name is duplicate
    if (generatedNames.has(personality.name)) {
      console.warn(`⚠️  LLM generated duplicate name: ${personality.name}, retrying...`);
      // Retry once with even stronger instruction
      return generatePersonality(model, customSystemPrompt, country, universityName);
    }

    // Track the generated name
    generatedNames.add(personality.name);
    console.log(`  Added name to cache: ${personality.name} (total: ${generatedNames.size})`);

    return personality;
  } catch (error) {
    console.error('Failed to parse personality JSON:', response);
    throw new Error(`Failed to parse personality: ${error}`);
  }
}

/**
 * Reset generated names cache (useful for new simulation runs)
 */
export function resetGeneratedNames(): void {
  generatedNames.clear();
}

/**
 * Generate a benchmark idea based on a personality
 */
export async function generateBenchmarkIdea(
  personality: RealisticPersonality,
  model: string = DEFAULT_MODEL,
  customSystemPrompt?: string
): Promise<RealisticBenchmarkIdea> {
  const systemPrompt = customSystemPrompt || `You are a benchmark design assistant. Create creative, realistic benchmark ideas for evaluating AI models.`;

  const userPrompt = `Given this researcher's personality:
Name: ${personality.name}
Background: ${personality.background}
Interests: ${personality.interests.join(', ')}

Generate a benchmark idea they might create. Return ONLY a JSON object:
{
  "theme": "Benchmark theme/title",
  "description": "What this benchmark tests (2-3 sentences)",
  "targetDomain": "Domain/field (e.g., medical, coding, math, reasoning)",
  "promptCount": 5
}

Make it creative and aligned with their interests. No markdown, just JSON.`;

  const response = await callLLM(systemPrompt, userPrompt, model);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse benchmark idea JSON:', response);
    throw new Error(`Failed to parse benchmark idea: ${error}`);
  }
}

/**
 * Generate prompts similar to existing examples (portable function)
 */
export async function generatePromptsFromExamples(
  examples: Array<{ question: string; fullPrompt: string; answerKey?: string; type?: string }>,
  count: number,
  model: string = DEFAULT_MODEL,
  customSystemPrompt?: string
): Promise<GeneratedPrompt[]> {
  const promptType: PromptType = examples[0]?.type === 'multiple_choice' ? 'multiple_choice' : 'open_ended';

  const systemPrompt = customSystemPrompt || `You are a benchmark question designer. Analyze the examples provided and create similar high-quality test questions that match the style, difficulty, and format.`;

  // Build examples string
  const examplesStr = examples.map((ex, i) =>
    `Example ${i + 1}:
Question: ${ex.question}
Full Prompt: ${ex.fullPrompt}
${ex.answerKey ? `Answer Key: ${ex.answerKey}` : ''}`
  ).join('\n\n');

  let formatInstructions: string;
  if (promptType === 'multiple_choice') {
    formatInstructions = `
Format: MULTIPLE CHOICE questions (matching the examples)
Each prompt should include:
- A clear question similar in style to the examples
- 4 answer options (A, B, C, D)
- The correct answer letter in answerKey
- The correct answer TEXT in answer
- The options object with keys A, B, C, D

Example format:
{
  "question": "What is the capital of France?",
  "fullPrompt": "What is the capital of France?\\n\\nA) London\\nB) Berlin\\nC) Paris\\nD) Madrid",
  "options": {"A": "London", "B": "Berlin", "C": "Paris", "D": "Madrid"},
  "answerKey": "C",
  "answer": "Paris"
}`;
  } else {
    formatInstructions = `
Format: OPEN-ENDED questions (matching the examples)
Each prompt should include:
- A clear question similar in style to the examples
- The expected correct answer or answer pattern in answerKey`;
  }

  const userPrompt = `Analyze these example prompts and create ${count} NEW prompts in the SAME style and format:

${examplesStr}

${formatInstructions}

Return ONLY a JSON array of prompts matching the format above.

Create questions that are:
1. Similar in difficulty and complexity to the examples
2. On related topics/domains
3. Using the same question format and style
4. NEW and different from the examples (don't repeat them)

ALL ${count} prompts MUST be ${promptType === 'multiple_choice' ? 'MULTIPLE CHOICE' : 'OPEN-ENDED'} format.
${promptType === 'multiple_choice' ? 'IMPORTANT: Include the "options" object and "answer" field for every prompt!' : ''}
No markdown, just the JSON array.`;

  const response = await callLLM(systemPrompt, userPrompt, model);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    const prompts = JSON.parse(jsonMatch[0]);

    // Ensure we have the right number of prompts and add promptType
    return prompts.slice(0, count).map((p: any) => {
      // Ensure fullPrompt exists - generate if missing
      let fullPrompt = p.fullPrompt;
      if (!fullPrompt) {
        if (promptType === 'multiple_choice' && p.options) {
          // Generate fullPrompt for multiple choice
          const optionsText = Object.entries(p.options)
            .map(([key, value]) => `${key}) ${value}`)
            .join('\n');
          fullPrompt = `${p.question}\n\n${optionsText}`;
        } else {
          // For open-ended, fullPrompt is just the question
          fullPrompt = p.question;
        }
      }

      return {
        ...p,
        fullPrompt,
        promptType,
      };
    });
  } catch (error) {
    console.error('Failed to parse prompts JSON:', response);
    throw new Error(`Failed to parse prompts: ${error}`);
  }
}

/**
 * Generate prompts for a benchmark - all of the SAME type
 */
export async function generatePrompts(
  benchmarkIdea: RealisticBenchmarkIdea,
  count: number,
  promptType: PromptType,
  model: string = DEFAULT_MODEL,
  customSystemPrompt?: string
): Promise<GeneratedPrompt[]> {
  const systemPrompt = customSystemPrompt || `You are a benchmark question designer. Create high-quality test questions for evaluating AI models.`;

  let formatInstructions: string;
  if (promptType === 'multiple_choice') {
    formatInstructions = `
Format: MULTIPLE CHOICE questions
Each prompt should include:
- A clear question
- 4 answer options (A, B, C, D)
- The correct answer letter in answerKey
- The correct answer TEXT in answer
- The options object with keys A, B, C, D

Example:
{
  "question": "What is the capital of France?",
  "fullPrompt": "What is the capital of France?\\n\\nA) London\\nB) Berlin\\nC) Paris\\nD) Madrid",
  "options": {"A": "London", "B": "Berlin", "C": "Paris", "D": "Madrid"},
  "answerKey": "C",
  "answer": "Paris"
}`;
  } else {
    formatInstructions = `
Format: OPEN-ENDED questions with expected answers
Each prompt should include:
- A clear question that requires a specific answer
- The expected correct answer or answer pattern in answerKey

Example:
{
  "question": "What is the chemical formula for water?",
  "fullPrompt": "Provide the chemical formula for water. Give your answer in standard notation.",
  "answerKey": "H2O"
}`;
  }

  const userPrompt = `Create ${count} test prompts for this benchmark:
Theme: ${benchmarkIdea.theme}
Description: ${benchmarkIdea.description}
Domain: ${benchmarkIdea.targetDomain}

${formatInstructions}

Return ONLY a JSON array of prompts matching the example format above.

ALL ${count} prompts MUST be ${promptType === 'multiple_choice' ? 'MULTIPLE CHOICE' : 'OPEN-ENDED'} format.
${promptType === 'multiple_choice' ? 'IMPORTANT: Include the "options" object and "answer" field for every prompt!' : ''}
Make questions challenging and diverse. No markdown, just the JSON array.`;

  const response = await callLLM(systemPrompt, userPrompt, model);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    const prompts = JSON.parse(jsonMatch[0]);

    // Ensure we have the right number of prompts and add promptType
    return prompts.slice(0, count).map((p: any) => {
      // Ensure fullPrompt exists - generate if missing
      let fullPrompt = p.fullPrompt;
      if (!fullPrompt) {
        if (promptType === 'multiple_choice' && p.options) {
          // Generate fullPrompt for multiple choice
          const optionsText = Object.entries(p.options)
            .map(([key, value]) => `${key}) ${value}`)
            .join('\n');
          fullPrompt = `${p.question}\n\n${optionsText}`;
        } else {
          // For open-ended, fullPrompt is just the question
          fullPrompt = p.question;
        }
      }

      return {
        ...p,
        fullPrompt,
        promptType,
      };
    });
  } catch (error) {
    console.error('Failed to parse prompts JSON:', response);
    throw new Error(`Failed to parse prompts: ${error}`);
  }
}
