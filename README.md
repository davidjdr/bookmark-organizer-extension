# Bookmark Organizer

Chrome extension to organize, sort, and verify your bookmarks. Categorize by type, detect broken links, and clean up redirections.

## Features

### Organize by type

Two modes for sorting bookmarks within a folder:

- **Sort in place** — Reorders bookmarks grouping them by type without creating subfolders. For example: `docA, video1, docB` becomes `docA, docB, video1`.
- **Group into subfolders** — Creates subfolders by type (Documents, Videos, Repos, etc.) and moves bookmarks into them.

Existing subfolders are always moved to the top, preserving their original order.

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

From the settings page (gear icon) you can:

- **Add** new categories with custom name and URL patterns (plain text or regex)
- **Edit** or **delete** any category, including the defaults
- **Drag and drop** to reorder display priority
- **Choose sorting within groups** — alphabetical (A-Z) or keep original order

Display order and matching priority are independent, so reordering categories never breaks the classification logic.

### Verify links

Opens in a dedicated tab so results persist even if you navigate away. Features:

- **Detect broken links** — finds bookmarks returning 404, 410, or connection errors
- **Detect redirections** — finds bookmarks returning 301/302 with the destination URL
- **Selective deletion** — check individual bookmarks or select all, then delete in bulk
- **Clickable URLs** — click any URL in the results to verify it manually in a new tab
- **Progress bar** with live counter of issues found
- **Stop button** to cancel a scan in progress
- Requests that return 403 (authentication required) are excluded from results since the resource likely exists but requires login

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `bookmark-organizer-extension` folder

## Usage

### Organizing

1. Click the extension icon in the toolbar
2. Select a bookmark folder from the dropdown
3. Choose a mode: **Sort in place** or **Group into subfolders**
4. Click **Preview** to see how bookmarks will be organized
5. Click **Apply** to execute

### Verifying

1. Click **"Verify broken links and redirections"** at the bottom of the popup
2. A new tab opens with the verification tool
3. Select a folder and check which types to scan (404, redirections, or both)
4. Click **Scan** and wait for results
5. Review, click URLs to verify manually, then select and delete the ones you want to remove

## Permissions

- `bookmarks` — Read, move, and delete bookmarks
- `storage` — Save category configuration and preferences
- `host_permissions: <all_urls>` — Required to check bookmark URLs for broken links and redirections

## Tech

- Chrome Extension Manifest V3
- Vanilla JavaScript, no dependencies
- All data stored locally via `chrome.storage.local`
