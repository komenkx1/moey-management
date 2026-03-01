export interface QuickFormatTemplate {
  id: "basic" | "qty" | "sum" | "split";
  sample: string;
  description: string;
}

export function extractQuickFormatKeyword(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const tokens = trimmed
    .replace(/[,+]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  for (const token of tokens) {
    const normalized = token.replace(/^[\-–—]+|[\-–—]+$/g, "");
    if (!normalized) {
      continue;
    }

    if (/^\d+p$/i.test(normalized)) {
      continue;
    }
    if (/^\d+(?:[.,]\d+)?(?:k|rb|jt)?$/i.test(normalized)) {
      continue;
    }
    if (/^[x×]\d+$/i.test(normalized) || /^\d+[x×]$/i.test(normalized)) {
      continue;
    }
    if (/^\d+[x×]\d+(?:[.,]\d+)?(?:k|rb|jt)?$/i.test(normalized)) {
      continue;
    }

    if (/[a-zA-Z]/.test(normalized)) {
      return normalized.toLowerCase();
    }
  }

  return null;
}

export function deriveQuickFormatTemplates(params: {
  quickInput: string;
  fallbackBase?: string;
}): QuickFormatTemplate[] {
  const fallbackBase = params.fallbackBase ?? "makan";
  const keywordRaw = extractQuickFormatKeyword(params.quickInput) ?? fallbackBase;
  const keyword = keywordRaw.replace(/\s+/g, " ").trim().slice(0, 24) || "makan";
  const base = keyword.toLowerCase();

  const templates: QuickFormatTemplate[] = [
    {
      id: "basic",
      sample: `${base} 20k`,
      description: "Nominal cepat"
    },
    {
      id: "qty",
      sample: `${base} 3x 15k`,
      description: "Qty x nominal"
    },
    {
      id: "sum",
      sample: `${base} 20k + 15k`,
      description: "Jumlahkan item"
    },
    {
      id: "split",
      sample: `${base} 45k 3p`,
      description: "Split 3 orang"
    }
  ];

  const intent =
    /\d+\s*p$/i.test(params.quickInput) || /\bp\d+$/i.test(params.quickInput)
      ? "split"
      : /[+]/.test(params.quickInput)
        ? "sum"
        : /[x×]/i.test(params.quickInput)
          ? "qty"
          : "basic";

  return [...templates].sort((left, right) => {
    const leftPriority = left.id === intent ? 0 : 1;
    const rightPriority = right.id === intent ? 0 : 1;
    return leftPriority - rightPriority;
  });
}
