// Model essays for grading calibration
export const MODEL_ESSAYS = {
  'A+': {
    score: 95,
    content: `[Torts - Negligence Analysis]

ISSUE: Whether defendant is liable for negligence.

RULE: To establish negligence, plaintiff must prove: (1) duty, (2) breach, (3) causation (factual and proximate), and (4) damages.

APPLICATION: 
Duty: Defendant owed a duty of reasonable care under the circumstances. All persons owe a general duty to act as a reasonable person would under similar circumstances.

Breach: Defendant breached this duty by [specific conduct]. A reasonable person would not have [specific action] given the foreseeable risk of harm.

Causation: But-for defendant's conduct, the harm would not have occurred (factual causation). The harm was also a foreseeable consequence of defendant's breach (proximate causation).

Damages: Plaintiff suffered [specific damages] directly resulting from the incident.

CONCLUSION: Defendant is liable for negligence as all elements are satisfied.`,
  },
  'B': {
    score: 80,
    content: `[Torts - Negligence]

Defendant is liable for negligence. Negligence requires duty, breach, causation, and damages.

Defendant had a duty to act reasonably. Defendant breached this duty by acting unreasonably. This breach caused plaintiff's injuries. Plaintiff was injured and has damages.

Therefore, defendant is liable.`,
  },
  'C': {
    score: 65,
    content: `Defendant was negligent. They didn't act carefully and hurt the plaintiff. The plaintiff can sue for money damages.`,
  }
};

export function buildCalibrationPrompt(userAnswer: string, question: string): string {
  const modelA = MODEL_ESSAYS['A+'];
  
  return `Compare the following two answers to this bar exam question. Is the user's answer equal to, better than, or worse than the model A+ answer? Score accordingly.

Question: ${question}

MODEL A+ ANSWER (Score: 95/100):
${modelA.content}

USER'S ANSWER:
${userAnswer}

CRITICAL GRADING INSTRUCTIONS:
- If user's answer is equal to or better than the model A+, score 90-100
- Only deduct points for genuine legal errors, misapplication of facts, or incoherent structure
- Do NOT deduct points for stylistic differences or minor omissions if the legal analysis is sound
- Must justify ALL point deductions with specific legal flaws

Respond in JSON format:
{
  "score": number (0-100),
  "comparison": "equal to/better than/worse than model A+",
  "feedback": "detailed explanation with specific justification for any point deductions",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`;
}