import { spawn } from 'child_process';

const CLAUDE_PATH = process.env.CLAUDE_PATH || 'claude';
const CLASSIFY_MODEL = process.env.CLASSIFY_MODEL || 'claude-haiku-4-5-20251001';

const CLASSIFY_PROMPT = `You are a knowledge classifier. Given a note's content and metadata, classify it for an AI knowledge base.

Return ONLY valid JSON (no markdown fencing, no explanation) with these fields:
{
  "type": one of: "research", "idea", "workflow", "lesson", "fix", "decision", "source", "person", "company", "project",
  "tags": array of 3-8 specific, lowercase tags (e.g. ["ai-agents", "obsidian", "automation", "knowledge-management"]),
  "project": project name if relevant (e.g. "my-app", "backend", "frontend") or null,
  "summary": 1-2 sentence summary optimized for AI retrieval (max 200 chars),
  "confidence": "high", "medium", or "low",
  "key_topics": array of 2-4 main topics/concepts covered
}

Classification guidelines:
- "research": articles, papers, technical deep-dives, analysis of tools/systems
- "idea": business ideas, product concepts, feature proposals
- "workflow": processes, automation patterns, how-to guides
- "lesson": things learned, best practices, anti-patterns
- "fix": bug fixes, troubleshooting solutions
- "decision": architectural or business decisions with rationale
- "source": raw reference material, bookmarks, clippings that don't fit other types
- Tags should be specific and reusable (not one-off descriptions)
- Summary should help an AI agent decide whether to read the full note`;

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn(CLAUDE_PATH, [
      '-p', '--model', CLASSIFY_MODEL,
      '--output-format', 'json',
      '--max-turns', '1',
    ], {
      env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: 'cli' },
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });

    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`claude exited ${code}: ${stderr}`));
      resolve(stdout);
    });

    proc.on('error', reject);

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

export async function classifyNote(title, content, sourcePath) {
  const prompt = `${CLASSIFY_PROMPT}

---
Title: ${title}
Source path: ${sourcePath}
---

${content.slice(0, 4000)}`;

  try {
    const stdout = await runClaude(prompt);
    const response = JSON.parse(stdout);
    const resultText = response.result || '';

    // Parse the JSON from the response — handle markdown fencing if present
    const jsonStr = resultText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    const classification = JSON.parse(jsonStr);

    return {
      success: true,
      ...classification,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      type: 'source',
      tags: ['unclassified'],
      summary: title,
      confidence: 'low',
      key_topics: [],
      project: null,
    };
  }
}

export async function classifyBatch(notes) {
  const results = [];
  for (const note of notes) {
    const result = await classifyNote(note.title, note.content, note.path);
    results.push({ ...note, classification: result });
  }
  return results;
}
