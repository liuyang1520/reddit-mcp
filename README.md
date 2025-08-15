# Reddit MCP Server

A Model Context Protocol (MCP) server that provides access to Reddit's API for retrieving posts, comments, user information, and search functionality.

## Features

- **Subreddit Operations**: Get posts from any subreddit with various sorting options
- **Post Operations**: Retrieve specific posts and their comments
- **User Operations**: Get user information, posts, and comments
- **Search**: Search for posts and subreddits
- **Authentication**: Supports multiple Reddit API authentication methods

## Available Tools

### `get_subreddit_posts`
Get posts from a specific subreddit.

**Parameters:**
- `subreddit` (required): Name of the subreddit (without r/ prefix)
- `sort` (optional): Sort order - `hot`, `new`, `top`, `rising` (default: `hot`)
- `limit` (optional): Number of posts to retrieve, 1-100 (default: 25)

### `get_post`
Get details of a specific Reddit post.

**Parameters:**
- `postId` (required): Reddit post ID

### `get_post_comments`
Get comments from a Reddit post.

**Parameters:**
- `postId` (required): Reddit post ID
- `sort` (optional): Sort order - `best`, `top`, `new`, `controversial`, `old` (default: `best`)

### `get_subreddit_info`
Get information about a subreddit.

**Parameters:**
- `subreddit` (required): Name of the subreddit (without r/ prefix)

### `get_user_info`
Get information about a Reddit user.

**Parameters:**
- `username` (required): Reddit username (without u/ prefix)

### `get_user_posts`
Get posts submitted by a user.

**Parameters:**
- `username` (required): Reddit username (without u/ prefix)
- `sort` (optional): Sort order - `hot`, `new`, `top` (default: `new`)
- `limit` (optional): Number of posts to retrieve, 1-100 (default: 25)

### `get_user_comments`
Get comments made by a user.

**Parameters:**
- `username` (required): Reddit username (without u/ prefix)
- `sort` (optional): Sort order - `hot`, `new`, `top` (default: `new`)
- `limit` (optional): Number of comments to retrieve, 1-100 (default: 25)

### `search_posts`
Search for Reddit posts.

**Parameters:**
- `query` (required): Search query
- `subreddit` (optional): Restrict search to specific subreddit
- `sort` (optional): Sort order - `relevance`, `hot`, `top`, `new`, `comments` (default: `relevance`)
- `limit` (optional): Number of results to retrieve, 1-100 (default: 25)

### `search_subreddits`
Search for subreddits.

**Parameters:**
- `query` (required): Search query for subreddit names/descriptions
- `limit` (optional): Number of results to retrieve, 1-100 (default: 25)

## Setup

### 1. Reddit API Application

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Choose application type:
   - **script** for personal use
   - **web app** for server applications
4. Note your **client ID** (under the app name) and **client secret**

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your Reddit API credentials:

```env
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=reddit-mcp-server/1.0.0 by your_username

# Choose one authentication method:
REDDIT_USERNAME=your_username
REDDIT_PASSWORD=your_password
```

### 3. Installation

```bash
npm install
```

### 4. Build

```bash
npm run build
```

### 5. Usage with Claude Code

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "reddit": {
      "command": "node",
      "args": ["/path/to/reddit-mcp/dist/index.js"],
      "env": {
        "REDDIT_CLIENT_ID": "your_client_id",
        "REDDIT_CLIENT_SECRET": "your_client_secret",
        "REDDIT_USER_AGENT": "reddit-mcp-server/1.0.0 by your_username",
        "REDDIT_USERNAME": "your_username",
        "REDDIT_PASSWORD": "your_password"
      }
    }
  }
}
```

## Authentication Methods

### 1. Username/Password (Recommended for personal use)
```env
REDDIT_USERNAME=your_username
REDDIT_PASSWORD=your_password
```

### 2. Refresh Token (Recommended for production)
```env
REDDIT_REFRESH_TOKEN=your_refresh_token
```

### 3. Access Token (For testing only - expires in 1 hour)
```env
REDDIT_ACCESS_TOKEN=your_access_token
```

### 4. Client Credentials (Read-only access)
Leave username/password empty to use client credentials flow.

## Rate Limits

Reddit API has rate limits:
- **Free tier**: 100 requests per minute per OAuth client
- Requests are averaged over a 10-minute window
- Commercial use requires Reddit's permission

## Important Notes

1. **User-Agent**: Must be unique and descriptive
2. **Commercial Use**: Requires Reddit's permission
3. **Data Retention**: Must delete user content that's been deleted from Reddit
4. **Rate Limiting**: Built-in authentication token management

## Development

### Run in development mode:
```bash
npm run dev
```

### Build:
```bash
npm run build
```

### Clean build artifacts:
```bash
npm run clean
```

## Data Types

### RedditPost
```typescript
interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  url: string;
  selftext: string;
  created_utc: number;
  score: number;
  num_comments: number;
  permalink: string;
  is_self: boolean;
  domain: string;
  thumbnail?: string;
}
```

### RedditComment
```typescript
interface RedditComment {
  id: string;
  author: string;
  body: string;
  created_utc: number;
  score: number;
  permalink: string;
  parent_id: string;
  subreddit: string;
}
```

### RedditSubreddit
```typescript
interface RedditSubreddit {
  display_name: string;
  title: string;
  description: string;
  subscribers: number;
  created_utc: number;
  public_description: string;
  url: string;
  over18: boolean;
}
```

### RedditUser
```typescript
interface RedditUser {
  name: string;
  id: string;
  created_utc: number;
  comment_karma: number;
  link_karma: number;
  is_verified: boolean;
  has_verified_email: boolean;
}
```

## License

MIT