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
  examples: Array<{ question: string; fullPrompt: string; answerKey?: string; type?: string; options?: any }>,
  count: number,
  model: string = DEFAULT_MODEL,
  customSystemPrompt?: string
): Promise<GeneratedPrompt[]> {
  // Detect prompt type - check if it's multiple choice by looking at the type field, options, or answer format
  const isMultipleChoice = examples[0]?.type === 'multiple_choice' ||
                          examples[0]?.type === 'MultipleChoice' ||
                          examples[0]?.type === 'multiple-choice' ||
                          (examples[0]?.options && Object.keys(examples[0].options).length > 0) ||
                          (examples[0]?.answerKey?.length === 1 && /^[A-D]$/i.test(examples[0].answerKey));
  const promptType: PromptType = isMultipleChoice ? 'multiple_choice' : 'open_ended';

  console.log(`📋 Detected prompt type: ${promptType}`);

  // Validate example quality first
  console.log(`\n🔍 Validating ${examples.length} example prompts for quality...`);
  const validExamples = examples.filter((ex, idx) => {
    const questionWords = ex.question?.trim().split(/\s+/).length || 0;
    const fullPromptWords = ex.fullPrompt?.trim().split(/\s+/).length || 0;

    if (questionWords < 3) {
      console.warn(`⚠️  Example ${idx + 1} has too short question (${questionWords} words): "${ex.question}"`);
      return false;
    }

    if (fullPromptWords < 3) {
      console.warn(`⚠️  Example ${idx + 1} has too short fullPrompt (${fullPromptWords} words): "${ex.fullPrompt}"`);
      return false;
    }

    // For open-ended questions, validate answerKey is substantive
    // For multiple choice, single-letter answers (A, B, C, D) are valid
    if (promptType === 'open_ended') {
      const answerKeyWords = ex.answerKey?.trim().split(/\s+/).length || 0;
      if (answerKeyWords < 3) {
        console.warn(`⚠️  Example ${idx + 1} has too short answerKey for open-ended (${answerKeyWords} words): "${ex.answerKey}"`);
        return false;
      }
    } else {
      // For multiple choice, just check that answerKey exists
      if (!ex.answerKey || ex.answerKey.trim().length === 0) {
        console.warn(`⚠️  Example ${idx + 1} missing answerKey for multiple choice`);
        return false;
      }
    }

    return true;
  });

  if (validExamples.length === 0) {
    console.error('❌ All example prompts are low quality (too short or invalid)');
    console.error('Example prompts:', examples.map(ex => ({
      question: ex.question?.substring(0, 50) + '...',
      answerKey: ex.answerKey,
      type: ex.type,
      hasOptions: ex.options ? Object.keys(ex.options).length : 0
    })));
    throw new Error(`Cannot generate prompts from low-quality examples. All ${examples.length} examples were rejected (questions or ${promptType === 'open_ended' ? 'answers' : 'answerKeys'} too short). Please select a different prompt set with higher quality examples.`);
  }

  if (validExamples.length < examples.length) {
    const rejected = examples.length - validExamples.length;
    console.warn(`⚠️  Using only ${validExamples.length} of ${examples.length} examples (${rejected} rejected for quality)`);
  } else {
    console.log(`✅ All ${validExamples.length} examples passed quality validation`);
  }

  // Log rejected examples for debugging
  if (validExamples.length < examples.length) {
    const rejectedExamples = examples.filter((ex) => !validExamples.includes(ex));
    rejectedExamples.slice(0, 3).forEach((ex, idx) => {
      console.warn(`   Rejected example ${idx + 1}: Question="${ex.question?.substring(0, 40)}...", AnswerKey="${ex.answerKey}", Type="${ex.type}"`);
    });
  }

  // Log first example for debugging
  const firstEx = validExamples[0]!;
  console.log(`📝 First valid example (${promptType}):`);
  console.log(`   Question: "${firstEx.question.substring(0, 80)}..."`);
  console.log(`   Answer: "${firstEx.answerKey || 'N/A'}"`);
  console.log(`   Type from DB: "${firstEx.type}"`);
  if (firstEx.options && promptType === 'multiple_choice') {
    console.log(`   Options: ${JSON.stringify(firstEx.options)}`);
  }

  const systemPrompt = customSystemPrompt || `You are an expert benchmark question designer specializing in creating high-quality evaluation questions for AI systems.

Your questions must:
- Be clear, unambiguous, and professionally written
- Have objective, verifiable answers
- Match the difficulty and style of the provided examples exactly
- Test real knowledge or reasoning ability (not trivial facts)
- Be complete, well-formed sentences with proper grammar
- Include comprehensive answer keys that show the expected correct response

Focus on creating questions that would meaningfully evaluate an AI's capabilities in the given domain.`;

  // Build examples string using validated examples only
  const examplesStr = validExamples.map((ex, i) => {
    let exampleText = `Example ${i + 1}:
Question: ${ex.question}
Full Prompt: ${ex.fullPrompt}`;

    // Include options for multiple choice questions
    if (ex.options && promptType === 'multiple_choice') {
      exampleText += `\nOptions: ${JSON.stringify(ex.options)}`;
    }

    if (ex.answerKey) {
      exampleText += `\nAnswer Key: ${ex.answerKey}`;
    }

    return exampleText;
  }).join('\n\n');

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
- A clear, specific question similar in style to the examples
- The expected correct answer in answerKey (should be comprehensive, not just a single word)
- If multiple valid answers exist, provide the most complete/canonical answer

CRITICAL for answerKey:
- For factual questions: provide the complete, accurate answer
- For analytical questions: provide a model answer showing the expected reasoning
- For coding questions: provide the expected code solution
- For math questions: provide the numerical answer with units if applicable
- Answer keys should be 1-3 sentences minimum, not single words

Example:
{
  "question": "Explain the difference between supervised and unsupervised learning in machine learning.",
  "fullPrompt": "Explain the difference between supervised and unsupervised learning in machine learning. Provide clear definitions and at least one example of each.",
  "answerKey": "Supervised learning uses labeled training data where the correct outputs are provided, allowing the model to learn the mapping from inputs to outputs (e.g., image classification with labeled images). Unsupervised learning works with unlabeled data and finds patterns or structures without predefined outputs (e.g., clustering customer segments based on purchase behavior)."
}`;
  }

  const userPrompt = `Analyze these example prompts and create ${count} NEW prompts in the SAME style and format:

${examplesStr}

${formatInstructions}

🚨 CRITICAL REQUIREMENTS:
1. Return ONLY a valid JSON array - no markdown, no code blocks, no explanation
2. Each prompt must have complete, full sentences for questions (minimum 10 words)
3. Questions must be clear, well-formed, and grammatically correct
4. ALL ${count} prompts MUST be ${promptType === 'multiple_choice' ? 'MULTIPLE CHOICE' : 'OPEN-ENDED'} format
5. Match the QUALITY, style, difficulty, and domain of the examples exactly
6. Use lowercase field names: "question", "fullPrompt", "answerKey", etc.
${promptType === 'multiple_choice' ? '7. MUST include "options" object and "answer" field for EVERY prompt' : '7. Answer keys must be substantive (multiple sentences), like the examples'}

⛔ ABSOLUTELY FORBIDDEN:
- Single words as questions (e.g., "Happy", "Sad", "Red")
- Single words as answers for open-ended questions (e.g., "Joyful", "Blue")
- Fragments or incomplete sentences
- Questions shorter than 10 words
- Trivial synonym pairs

✅ REQUIRED:
- Complete, well-formed questions that match the example style
- Comprehensive answer keys with proper context/reasoning
- Professional quality that matches or exceeds the examples

Create questions that are:
- Similar in difficulty and complexity to the examples
- On related topics/domains
- Using the same question format and style
- NEW and different from the examples (don't repeat them)

Return the JSON array now:`;

  let response = await callLLM(systemPrompt, userPrompt, model);
  let retryCount = 0;
  const maxRetries = 2;

  // Retry loop in case LLM generates garbage
  while (retryCount <= maxRetries) {
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      let prompts;
      try {
        prompts = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Failed to parse JSON:', jsonMatch[0].substring(0, 300));
        throw parseError;
      }

      if (!Array.isArray(prompts)) {
        throw new Error('LLM response is not an array');
      }

      console.log(`Parsed ${prompts.length} prompts from LLM response`);

      // Ensure we have the right number of prompts and add promptType
      const result = prompts.slice(0, count).map((p: any, index: number) => {
      // Normalize keys to lowercase (LLMs sometimes capitalize)
      const normalized: any = {};
      for (const [key, value] of Object.entries(p)) {
        const lowerKey = key.toLowerCase().replace(/\s+/g, '');
        normalized[lowerKey] = value;
      }

      // Map common variations
      const question = normalized.question || normalized.q || p.question;
      const fullPrompt = normalized.fullprompt || normalized.full_prompt || p.fullPrompt || p['Full Prompt'];
      const answerKey = normalized.answerkey || normalized.answer_key || p.answerKey;
      const answer = normalized.answer || p.answer;
      const options = normalized.options || p.options;

      // Log the structure of the first prompt for debugging
      if (index === 0) {
        console.log(`First prompt structure - original keys: ${Object.keys(p).join(', ')}`);
        console.log(`Normalized to: question=${!!question}, fullPrompt=${!!fullPrompt}`);
      }

      // Validate that question exists and has reasonable length
      if (!question || typeof question !== 'string' || question.length < 10) {
        console.error(`Generated prompt ${index + 1} has invalid question (too short or missing). Keys present:`, Object.keys(p));
        console.error('Prompt data:', JSON.stringify(p, null, 2));
        throw new Error(`LLM generated prompt ${index + 1} without valid question field (minimum 10 characters required)`);
      }

      // Additional quality checks
      const questionWords = question.trim().split(/\s+/).length;
      if (questionWords < 3) {
        console.error(`Generated prompt ${index + 1} has too few words (${questionWords}): "${question}"`);
        throw new Error(`LLM generated prompt ${index + 1} with insufficient question length (need at least 3 words, got ${questionWords})`);
      }

      // For open-ended questions, validate answerKey quality
      if (promptType === 'open_ended') {
        if (!answerKey || typeof answerKey !== 'string' || answerKey.trim().length < 10) {
          console.error(`Generated prompt ${index + 1} has invalid or missing answerKey for open-ended question`);
          console.error('Question:', question);
          console.error('AnswerKey:', answerKey);
          throw new Error(`LLM generated prompt ${index + 1} without proper answerKey (open-ended questions need substantive answers, not single words)`);
        }

        // Check if answerKey is just a single word (likely too simple)
        const answerWords = answerKey.trim().split(/\s+/).length;
        if (answerWords < 5) {
          console.warn(`⚠️  Prompt ${index + 1} has very short answerKey (${answerWords} words): "${answerKey}"`);
          console.warn(`   Consider this a low-quality answer for the question: "${question}"`);
          // Don't throw, just warn - some factual questions might have short answers
        }
      }

      // Ensure fullPrompt exists - generate if missing
      let finalFullPrompt = fullPrompt;
      if (!finalFullPrompt) {
        if (promptType === 'multiple_choice' && options) {
          // Generate fullPrompt for multiple choice
          const optionsText = Object.entries(options)
            .map(([key, value]) => `${key}) ${value}`)
            .join('\n');
          finalFullPrompt = `${question}\n\n${optionsText}`;
        } else {
          // For open-ended, fullPrompt is just the question
          finalFullPrompt = question;
        }
      }

      return {
        question,
        fullPrompt: finalFullPrompt,
        answerKey,
        answer,
        options: promptType === 'multiple_choice' ? options : undefined,
        promptType,
      };
    });

      // If we got here, parsing succeeded - return the prompts
      return result;

    } catch (error) {
      retryCount++;

      if (retryCount > maxRetries) {
        // Final failure after retries
        console.error('❌ Failed to generate valid prompts after', maxRetries, 'retries');
        console.error('Last LLM response:', response.substring(0, 500));
        throw new Error(`Failed to parse prompts after ${maxRetries} retries: ${error}`);
      }

      // Retry with stronger warning
      console.warn(`⚠️  Attempt ${retryCount} failed: ${error}`);
      console.warn(`🔄 Retrying with stronger instructions (attempt ${retryCount + 1}/${maxRetries + 1})...`);

      const retryUserPrompt = `${userPrompt}

⚠️  PREVIOUS ATTEMPT FAILED - You must follow ALL instructions exactly!
The previous response was INVALID because it contained single words or trivial fragments.
This is your LAST CHANCE to generate proper, complete questions.

REMEMBER: Questions must be AT LEAST 10 words long and be complete sentences!
Answer keys for open-ended questions must be substantive explanations, not single words!`;

      response = await callLLM(systemPrompt, retryUserPrompt, model);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw new Error('Unexpected error in prompt generation');
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
  const systemPrompt = customSystemPrompt || `You are an expert benchmark question designer specializing in creating high-quality evaluation questions for AI systems.

Your questions must:
- Be clear, unambiguous, and professionally written
- Have objective, verifiable answers
- Test real knowledge, reasoning ability, or problem-solving skills
- Be complete, well-formed sentences with proper grammar
- Include comprehensive answer keys that show the expected correct response
- Match the difficulty level appropriate for the domain
- Be diverse in their approach and testing different aspects of the domain

Avoid:
- Trivial or overly simple questions
- Questions with subjective or ambiguous answers
- Single-word questions or fragments
- Questions that rely on recent events or changing information

Focus on creating questions that would meaningfully evaluate an AI's capabilities in the given domain.`;

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
- A clear, specific question that requires a detailed answer
- The expected correct answer in answerKey (should be comprehensive, not just a single word)
- The fullPrompt should provide any necessary context or constraints

CRITICAL for answerKey:
- For factual questions: provide the complete, accurate answer with context
- For analytical questions: provide a model answer showing the expected reasoning
- For coding questions: provide the expected code solution with explanation
- For math questions: provide the numerical answer with working/explanation and units
- For conceptual questions: provide a thorough explanation (2-4 sentences)
- Answer keys should be substantive, not just single words or numbers

Good Example:
{
  "question": "Explain how a binary search tree maintains its ordering property and what operations benefit from this structure.",
  "fullPrompt": "Explain how a binary search tree maintains its ordering property and what operations benefit from this structure. Include specific complexity analysis.",
  "answerKey": "A binary search tree maintains the ordering property where each node's left subtree contains only values less than the node's value, and the right subtree contains only values greater. This property enables efficient search, insertion, and deletion operations with O(log n) average time complexity for balanced trees, as each comparison eliminates roughly half of the remaining possibilities. However, in the worst case of an unbalanced tree, these operations degrade to O(n)."
}

Bad Example:
{
  "question": "What is BST?",
  "answerKey": "Binary Search Tree"
}`;
  }

  const userPrompt = `Create ${count} test prompts for this benchmark:
Theme: ${benchmarkIdea.theme}
Description: ${benchmarkIdea.description}
Domain: ${benchmarkIdea.targetDomain}

${formatInstructions}

🚨 CRITICAL REQUIREMENTS:
1. Return ONLY a valid JSON array - no markdown, no code blocks, no explanation
2. Each prompt must have complete, full sentences for questions (minimum 10 words)
3. Questions must be clear, well-formed, and grammatically correct
4. ALL ${count} prompts MUST be ${promptType === 'multiple_choice' ? 'MULTIPLE CHOICE' : 'OPEN-ENDED'} format
5. Use lowercase field names: "question", "fullPrompt", "answerKey", etc.
${promptType === 'multiple_choice' ? '6. MUST include "options" object and "answer" field for EVERY prompt' : '6. Answer keys must be comprehensive (2-4 sentences for open-ended), not single words'}

❌ DO NOT:
- Return single words or fragments as questions
- Use trivial or overly simple questions
- Provide single-word answer keys for open-ended questions
- Create ambiguous or subjective questions

✅ DO:
- Create challenging, meaningful questions that test real understanding
- Provide comprehensive answer keys with proper reasoning/context
- Vary the difficulty and aspects being tested
- Write professionally as if for a real benchmark

Make questions challenging, diverse, and high-quality.
Return the JSON array now:`;

  let response = await callLLM(systemPrompt, userPrompt, model);
  let retryCount = 0;
  const maxRetries = 2;

  // Retry loop in case LLM generates garbage
  while (retryCount <= maxRetries) {
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      let prompts;
      try {
        prompts = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Failed to parse JSON:', jsonMatch[0].substring(0, 300));
        throw parseError;
      }

      if (!Array.isArray(prompts)) {
        throw new Error('LLM response is not an array');
      }

      console.log(`Parsed ${prompts.length} prompts from LLM response`);

      // Ensure we have the right number of prompts and add promptType
      const result = prompts.slice(0, count).map((p: any, index: number) => {
      // Normalize keys to lowercase (LLMs sometimes capitalize)
      const normalized: any = {};
      for (const [key, value] of Object.entries(p)) {
        const lowerKey = key.toLowerCase().replace(/\s+/g, '');
        normalized[lowerKey] = value;
      }

      // Map common variations
      const question = normalized.question || normalized.q || p.question;
      const fullPrompt = normalized.fullprompt || normalized.full_prompt || p.fullPrompt || p['Full Prompt'];
      const answerKey = normalized.answerkey || normalized.answer_key || p.answerKey;
      const answer = normalized.answer || p.answer;
      const options = normalized.options || p.options;

      // Log the structure of the first prompt for debugging
      if (index === 0) {
        console.log(`First prompt structure - original keys: ${Object.keys(p).join(', ')}`);
        console.log(`Normalized to: question=${!!question}, fullPrompt=${!!fullPrompt}`);
      }

      // Validate that question exists and has reasonable length
      if (!question || typeof question !== 'string' || question.length < 10) {
        console.error(`Generated prompt ${index + 1} has invalid question (too short or missing). Keys present:`, Object.keys(p));
        console.error('Prompt data:', JSON.stringify(p, null, 2));
        throw new Error(`LLM generated prompt ${index + 1} without valid question field (minimum 10 characters required)`);
      }

      // Additional quality checks
      const questionWords = question.trim().split(/\s+/).length;
      if (questionWords < 3) {
        console.error(`Generated prompt ${index + 1} has too few words (${questionWords}): "${question}"`);
        throw new Error(`LLM generated prompt ${index + 1} with insufficient question length (need at least 3 words, got ${questionWords})`);
      }

      // For open-ended questions, validate answerKey quality
      if (promptType === 'open_ended') {
        if (!answerKey || typeof answerKey !== 'string' || answerKey.trim().length < 10) {
          console.error(`Generated prompt ${index + 1} has invalid or missing answerKey for open-ended question`);
          console.error('Question:', question);
          console.error('AnswerKey:', answerKey);
          throw new Error(`LLM generated prompt ${index + 1} without proper answerKey (open-ended questions need substantive answers, not single words)`);
        }

        // Check if answerKey is just a single word (likely too simple)
        const answerWords = answerKey.trim().split(/\s+/).length;
        if (answerWords < 5) {
          console.warn(`⚠️  Prompt ${index + 1} has very short answerKey (${answerWords} words): "${answerKey}"`);
          console.warn(`   Consider this a low-quality answer for the question: "${question}"`);
          // Don't throw, just warn - some factual questions might have short answers
        }
      }

      // Ensure fullPrompt exists - generate if missing
      let finalFullPrompt = fullPrompt;
      if (!finalFullPrompt) {
        if (promptType === 'multiple_choice' && options) {
          // Generate fullPrompt for multiple choice
          const optionsText = Object.entries(options)
            .map(([key, value]) => `${key}) ${value}`)
            .join('\n');
          finalFullPrompt = `${question}\n\n${optionsText}`;
        } else {
          // For open-ended, fullPrompt is just the question
          finalFullPrompt = question;
        }
      }

      return {
        question,
        fullPrompt: finalFullPrompt,
        answerKey,
        answer,
        options: promptType === 'multiple_choice' ? options : undefined,
        promptType,
      };
    });

      // If we got here, parsing succeeded - return the prompts
      return result;

    } catch (error) {
      retryCount++;

      if (retryCount > maxRetries) {
        // Final failure after retries
        console.error('❌ Failed to generate valid prompts after', maxRetries, 'retries');
        console.error('Last LLM response:', response.substring(0, 500));
        throw new Error(`Failed to parse prompts after ${maxRetries} retries: ${error}`);
      }

      // Retry with stronger warning
      console.warn(`⚠️  Attempt ${retryCount} failed: ${error}`);
      console.warn(`🔄 Retrying with stronger instructions (attempt ${retryCount + 1}/${maxRetries + 1})...`);

      const retryUserPrompt = `${userPrompt}

⚠️  PREVIOUS ATTEMPT FAILED - You must follow ALL instructions exactly!
The previous response was INVALID because it contained single words or trivial fragments.
This is your LAST CHANCE to generate proper, complete questions.

REMEMBER: Questions must be AT LEAST 10 words long and be complete sentences!
Answer keys for open-ended questions must be substantive explanations, not single words!`;

      response = await callLLM(systemPrompt, retryUserPrompt, model);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw new Error('Unexpected error in prompt generation');
}
