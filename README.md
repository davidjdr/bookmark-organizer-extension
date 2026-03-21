# Bookmark Organizer by Type

Chrome extension that organizes your bookmarks within a folder by type — documents, videos, repositories, design tools, and more.

## Features

### Two organization modes

- **Sort in place** — Reorders bookmarks within the same folder, grouping them by type. No subfolders are created. For example: `docA, video1, docB` becomes `docA, docB, video1`.
- **Group into subfolders** — Creates subfolders by type (Documents, Videos, Repos, etc.) and moves bookmarks into them.

### Smart categorization

Bookmarks are classified by URL patterns into categories like:

| Category | Example sites |
|---|---|
| Google Drive | drive.google.com |
| Documents | Google Docs, Notion, Confluence, Dropbox, OneDrive |
| Spreadsheets | Google Sheets, Airtable |
| Presentations | Google Slides, Canva, Prezi |
| Videos | YouTube, Vimeo, Loom, Twitch |
| Repositories | GitHub, GitLab, Bitbucket |
| Design | Figma, Miro, Excalidraw, Lucidchart |
| Tasks & Projects | Jira, Trello, Linear, Asana |
| Communication | Slack, Teams, Discord, Zoom |
| Social media | Twitter/X, LinkedIn, Reddit |
| News & Blogs | Medium, Dev.to, Substack |
| Learning | Udemy, Coursera, StackOverflow, MDN |
| AI & Tools | ChatGPT, Claude, Perplexity |
| Other | Everything else |

When a URL matches multiple categories, the **most specific pattern wins** — so `docs.google.com/spreadsheets` is always classified as Spreadsheets, not Documents.

### Folder handling

Existing subfolders within the selected folder are moved to the top while preserving their original order. Bookmarks are then sorted below them.

### Custom categories

From the settings page you can:

- **Add** new categories with custom name and URL patterns (plain text or regex)
- **Edit** any existing category, including the defaults
- **Delete** categories you don't need
- **Drag and drop** to reorder display priority
- **Choose sorting within groups** — alphabetical (A-Z) or keep original order

Display order and matching priority are independent, so reordering categories for display never breaks the classification logic.

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `bookmark-organizer-extension` folder

## Usage

1. Click the extension icon in the toolbar
2. Select a bookmark folder from the dropdown
3. Choose a mode: **Sort in place** or **Group into subfolders**
4. Click **Preview** to see how bookmarks will be organized
5. Click **Apply** to execute

To configure category order or add custom categories, click the gear icon to open the settings page.

## Permissions

- `bookmarks` — Read and reorganize bookmarks
- `storage` — Save category configuration and preferences

## Tech

- Chrome Extension Manifest V3
- Vanilla JavaScript, no dependencies
- All data stored locally via `chrome.storage.local`
