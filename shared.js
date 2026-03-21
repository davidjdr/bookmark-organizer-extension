// Patterns are stored as strings so they can be serialized to chrome.storage.
// They are converted to RegExp at runtime for matching.

const DEFAULT_CATEGORIES = [
  {
    id: "sheets",
    name: "Hojas de calculo",
    patterns: [
      "sheets\\.google\\.com",
      "docs\\.google\\.com/spreadsheets",
      "airtable\\.com",
    ],
  },
  {
    id: "slides",
    name: "Presentaciones",
    patterns: [
      "docs\\.google\\.com/presentation",
      "slides\\.google\\.com",
      "prezi\\.com",
      "canva\\.com",
      "pitch\\.com",
      "gamma\\.app",
    ],
  },
  {
    id: "drive",
    name: "Google Drive",
    patterns: [
      "drive\\.google\\.com",
    ],
  },
  {
    id: "docs",
    name: "Documentos",
    patterns: [
      "docs\\.google\\.com",
      "notion\\.so",
      "confluence",
      "sharepoint",
      "dropbox\\.com",
      "onedrive",
      "evernote\\.com",
      "coda\\.io",
      "quip\\.com",
      "paper\\.dropbox",
      "docs\\.microsoft",
      "office\\.com",
    ],
  },
  {
    id: "video",
    name: "Videos",
    patterns: [
      "youtube\\.com",
      "youtu\\.be",
      "vimeo\\.com",
      "twitch\\.tv",
      "dailymotion\\.com",
      "loom\\.com",
      "wistia\\.com",
      "zoom\\.us/rec",
    ],
  },
  {
    id: "code",
    name: "Repositorios",
    patterns: [
      "github\\.com",
      "gitlab\\.com",
      "bitbucket\\.org",
      "furydocs\\.io",
      "melisource",
    ],
  },
  {
    id: "design",
    name: "Diseno",
    patterns: [
      "figma\\.com",
      "sketch\\.com",
      "invisionapp\\.com",
      "zeplin\\.io",
      "adobe\\.com",
      "dribbble\\.com",
      "behance\\.net",
      "miro\\.com",
      "whimsical\\.com",
      "excalidraw\\.com",
      "lucidchart",
      "draw\\.io",
      "diagrams\\.net",
    ],
  },
  {
    id: "tasks",
    name: "Tareas y proyectos",
    patterns: [
      "jira",
      "trello\\.com",
      "asana\\.com",
      "linear\\.app",
      "monday\\.com",
      "clickup\\.com",
      "basecamp\\.com",
      "todoist\\.com",
    ],
  },
  {
    id: "chat",
    name: "Comunicacion",
    patterns: [
      "slack\\.com",
      "teams\\.microsoft",
      "discord\\.com",
      "telegram\\.org",
      "meet\\.google",
      "zoom\\.us",
      "webex",
    ],
  },
  {
    id: "social",
    name: "Redes sociales",
    patterns: [
      "twitter\\.com",
      "x\\.com",
      "linkedin\\.com",
      "facebook\\.com",
      "instagram\\.com",
      "reddit\\.com",
    ],
  },
  {
    id: "news",
    name: "Noticias y blogs",
    patterns: [
      "medium\\.com",
      "dev\\.to",
      "hashnode",
      "substack\\.com",
      "blogspot",
      "wordpress\\.com",
      "techcrunch",
      "news\\.ycombinator",
    ],
  },
  {
    id: "learn",
    name: "Aprendizaje",
    patterns: [
      "udemy\\.com",
      "coursera\\.org",
      "pluralsight",
      "linkedin\\.com/learning",
      "edx\\.org",
      "khanacademy",
      "codecademy",
      "freecodecamp",
      "stackoverflow\\.com",
      "mdn\\.mozilla",
    ],
  },
  {
    id: "ai",
    name: "IA y herramientas",
    patterns: [
      "chat\\.openai",
      "claude\\.ai",
      "bard\\.google",
      "gemini\\.google",
      "perplexity\\.ai",
      "copilot",
      "huggingface",
      "chatgpt",
    ],
  },
];

const DEFAULT_CATEGORY_ID = "other";
const DEFAULT_CATEGORY_NAME = "Otros";

// --- Category storage ---

async function loadCategories() {
  const result = await chrome.storage.local.get("customCategories");
  if (result.customCategories && result.customCategories.length > 0) {
    return result.customCategories;
  }
  return DEFAULT_CATEGORIES;
}

async function saveCategories(categories) {
  await chrome.storage.local.set({ customCategories: categories });
}

async function resetCategories() {
  await chrome.storage.local.remove("customCategories");
}

// --- Categorization (uses loaded categories) ---

function categorize(url, categories) {
  if (!url) return DEFAULT_CATEGORY_ID;

  // Find the best (most specific) match across ALL categories.
  // "Most specific" = the longest pattern that matches.
  // This makes categorization independent of array order,
  // so reordering in settings only affects display order.
  let bestCatId = DEFAULT_CATEGORY_ID;
  let bestLen = 0;

  for (const cat of categories) {
    for (const p of cat.patterns) {
      let matched = false;
      try {
        matched = new RegExp(p).test(url);
      } catch {
        matched = url.includes(p);
      }
      if (matched && p.length > bestLen) {
        bestLen = p.length;
        bestCatId = cat.id;
      }
    }
  }

  return bestCatId;
}

function getCategoryName(id, categories) {
  if (id === DEFAULT_CATEGORY_ID) return DEFAULT_CATEGORY_NAME;
  const cat = categories.find((c) => c.id === id);
  return cat ? cat.name : DEFAULT_CATEGORY_NAME;
}

// --- Order storage ---

function getDefaultOrder(categories) {
  return [...categories.map((c) => c.id), DEFAULT_CATEGORY_ID];
}

async function loadCategoryOrder(categories) {
  const result = await chrome.storage.local.get("categoryOrder");
  if (result.categoryOrder && result.categoryOrder.length > 0) {
    const saved = result.categoryOrder;
    const allIds = getDefaultOrder(categories);
    const valid = saved.filter((id) => allIds.includes(id));
    const missing = allIds.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  }
  return getDefaultOrder(categories);
}

async function saveCategoryOrder(order) {
  await chrome.storage.local.set({ categoryOrder: order });
}

async function loadSortWithinGroups() {
  const result = await chrome.storage.local.get("sortWithinGroups");
  return result.sortWithinGroups !== undefined ? result.sortWithinGroups : "alpha";
}

async function saveSortWithinGroups(value) {
  await chrome.storage.local.set({ sortWithinGroups: value });
}
