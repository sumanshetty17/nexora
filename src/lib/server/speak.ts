const SKIP =
  /\b(a|an|the|and|or|to|of|for|in|on|at|is|are|do|does|did|you|your|we|our|it|this|that|with|from|what|when|where|how|why|can|could|would|should|about|have|has|was|were|be|if|my|me|i|please|just|like|want|need)\b/i;

export function speakReply(question: string, chunks: { title: string; content: string }[]): string {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !SKIP.test(word));
  const aboutCompany = /\b(history|founded|who|about|company)\b/i.test(question);
  const sentences: { text: string; hits: number }[] = [];

  for (const chunk of chunks) {
    if (chunk.title === "Company facts" && !aboutCompany) continue;
    const clean = chunk.content.replace(/\s+/g, " ").replace(/^#+\s*/, "").trim();
    const parts = clean.split(/(?<=[.!?])\s+/);
    for (const part of parts) {
      const text = part.trim();
      if (text.length < 40 || text.length > 260) continue;
      if (/cookie|accept all|skip to|sign in to continue/i.test(text)) continue;
      const words = text.split(/\s+/);
      if (words.length < 6) continue;
      const low = text.toLowerCase();
      const hits = terms.filter((term) => low.includes(term)).length;
      sentences.push({ text, hits });
    }
  }

  sentences.sort((a, b) => b.hits - a.hits || a.text.length - b.text.length);
  const picked = sentences.filter((row) => row.hits > 0).slice(0, 2);
  if (picked.length === 0) {
    return "I don't see that in the pages I read. Tell me a little more about what you need and I'll look again.";
  }

  let answer = picked.map((row) => row.text).join(" ");
  if (/^(yes|no)[,.]/i.test(answer)) {
    /* already starts like an answer */
  } else if (/^(do|does|did|is|are|can|could|will|would|have|has)\b/i.test(question)) {
    const negative = /\b(no|not|don't|doesn't|cannot|can't|unable|isn't|aren't|won't)\b/i.test(answer);
    answer = `${negative ? "No." : "Yes."} ${answer}`;
  }

  const follow = /\b(price|cost|pricing)\b/i.test(question)
    ? "Want me to go through what's included?"
    : /\b(ship|shipping|deliver)\b/i.test(question)
      ? "Want me to check the timing too?"
      : /\b(return|refund|exchange)\b/i.test(question)
        ? "If your order is different from that, tell me what happened."
        : "What else should I check?";

  return `${answer} ${follow}`.replace(/\s+/g, " ").trim();
}
