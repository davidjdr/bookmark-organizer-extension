# Bookmark Organizer

Chrome extension to organize, browse, and verify your bookmarks. Each tool opens in its own dedicated tab for a full-page experience.

## Features

The extension popup acts as a launcher with four tools:

### Sort in place

Reorders bookmarks within the same folder. Choose the sorting criteria:

- **By category** — groups bookmarks by type. For example: `docA, video1, docB` becomes `docA, docB, video1`.
- **By date (newest first)** — most recently added bookmarks at the top.
- **By date (oldest first)** — oldest bookmarks at the top.

### Group into subfolders

Creates subfolders by type (Documents, Videos, Repos, etc.) and moves bookmarks into them.

Both organization modes move existing subfolders to the top, preserving their original order. Each opens in a dedicated tab where you select a folder, preview the result, and apply.

### Browse by date

Opens a dedicated tab to view all bookmarks in a folder sorted by creation date (newest or oldest first). Each entry shows its title, creation date, and a clickable URL. Select individual bookmarks or all at once to delete in bulk.

### Verify links

Scans bookmarks to find broken links and redirections. Opens in a dedicated tab with:

- **Detect broken links** — finds bookmarks returning 404, 410, or connection errors
- **Detect redirections** — finds bookmarks returning 301/302 with the destination URL
- **Selective deletion** — check individual bookmarks or select all, then delete in bulk
- **Clickable URLs** — click any URL in the results to verify it manually in a new tab
- **Progress bar** with live counter of issues found
- **Stop button** to cancel a scan in progress
- Requests that return 403 (authentication required) are excluded since the resource likely exists but requires login

### Smart categorization

Bookmarks are classified by URL patterns into built-in categories:

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

### Custom categories

From the settings page (gear icon in the popup) you can:

- **Add** new categories with custom name and URL patterns (plain text or regex)
- **Edit** or **delete** any category, including the defaults
- **Drag and drop** to reorder display priority
- **Choose sorting within groups** — alphabetical (A-Z) or keep original order

Display order and matching priority are independent, so reordering categories never breaks the classification logic.

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `bookmark-organizer-extension` folder

## Usage

1. Click the extension icon in the toolbar — a launcher popup appears with four options
2. Click any option to open it in a dedicated tab
3. In the tab, select a bookmark folder and use the tool
4. To configure categories or sorting preferences, click the gear icon in the popup

## Permissions

- `bookmarks` — Read, move, and delete bookmarks
- `storage` — Save category configuration and preferences
- `host_permissions: <all_urls>` — Required to check bookmark URLs for broken links and redirections

## Tech

- Chrome Extension Manifest V3
- Vanilla JavaScript, no dependencies
- All data stored locally via `chrome.storage.local`
