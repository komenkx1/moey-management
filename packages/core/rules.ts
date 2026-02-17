import { Category, CategoryRules } from "./types";

const DEFAULT_CATEGORY_KEYWORDS: Array<{ category: Category; keywords: string[] }> = [
  { category: "Makan", keywords: ["makan", "kopi", "nasi", "gacoan"] },
  { category: "Transport", keywords: ["grab", "gojek", "parkir", "tol"] },
  { category: "Belanja", keywords: ["indomaret", "alfamart", "belanja"] },
  { category: "Tagihan", keywords: ["listrik", "air", "internet", "tagihan"] },
  { category: "Hiburan", keywords: ["bioskop", "nonton", "game", "hiburan"] }
];

export function keywordFromText(text: string): string {
  const [firstWord = ""] = text.trim().toLowerCase().split(/\s+/);
  return firstWord;
}

export function inferCategory(text: string, rules: CategoryRules): Category {
  const normalizedText = text.trim().toLowerCase();
  if (!normalizedText) {
    return "Lainnya";
  }

  for (const rule of rules) {
    if (rule.match === "equals" && normalizedText === rule.pattern) {
      return rule.category;
    }
    if (rule.match === "contains" && normalizedText.includes(rule.pattern)) {
      return rule.category;
    }
  }

  for (const group of DEFAULT_CATEGORY_KEYWORDS) {
    if (group.keywords.some((keyword) => normalizedText.includes(keyword))) {
      return group.category;
    }
  }

  return "Lainnya";
}

export function updateCategoryRule(
  rules: CategoryRules,
  text: string,
  category: Category
): CategoryRules {
  const keyword = keywordFromText(text);
  if (!keyword) {
    return rules;
  }

  const existingIndex = rules.findIndex((rule) => rule.match === "contains" && rule.pattern === keyword);
  if (existingIndex >= 0) {
    const nextRules = [...rules];
    nextRules[existingIndex] = {
      ...nextRules[existingIndex],
      category
    };
    return nextRules;
  }

  return [
    ...rules,
    {
      pattern: keyword,
      match: "contains",
      category
    }
  ];
}
