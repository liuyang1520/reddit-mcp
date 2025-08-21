# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript in dist/
- `npm run dev` - Run server in development mode with tsx
- `npm start` - Run the compiled server from dist/
- `npm run clean` - Remove build artifacts

## Project Architecture

This is a Model Context Protocol (MCP) server that provides Reddit API access to Claude Code via standardized tools. The architecture follows a three-layer pattern:

### Core Components

- **`src/index.ts`** - MCP server entry point using stdio transport, defines 9 Reddit API tools with Zod validation schemas
- **`src/reddit-client.ts`** - Reddit API client with OAuth2 authentication, handles token management and rate limiting
- **`src/config.ts`** - Environment-based configuration with Zod validation for Reddit API credentials

### Authentication Flow

The Reddit client supports multiple authentication methods with automatic token refresh:
1. Username/password (script apps)
2. Refresh token (production apps) 
3. Access token (testing - 1hr expiry)
4. Client credentials (read-only access)

### Tool Implementation Pattern

Each MCP tool follows this pattern:
1. Zod schema validation for input parameters
2. RedditClient method call with typed parameters  
3. JSON response formatting for MCP protocol
4. Consistent error handling with McpError types

### Environment Configuration

Required environment variables are loaded via dotenv and validated through ConfigSchema. The server fails fast on missing required credentials (client ID, secret, user agent).

## Reddit API Integration

The client implements Reddit's OAuth2 flow with automatic token management. All API calls go through `makeRequest()` which handles authentication, rate limiting, and error responses. The client maps Reddit's JSON responses to typed interfaces (RedditPost, RedditComment, etc.) and handles nested comment threading recursively.

### Search Functionality

The `search_posts` tool supports time-based filtering for more precise results:
- **Time periods**: `hour`, `day`, `week`, `month`, `year`, `all`
- **Best practice**: Use `sort: "top"` with time filtering for optimal results
- **Example**: Search for posts from the last 24 hours using `time: "day"`

Time filtering leverages Reddit's `t` parameter in the search API to constrain results to specific time windows, enabling discovery of recent content without client-side filtering.

## MCP Protocol Compliance  

The server implements the standard MCP protocol with:
- ListToolsRequestSchema handler returning tool definitions
- CallToolRequestSchema handler with parameter validation
- Proper error codes (InvalidParams, MethodNotFound, InternalError)
- Text content responses in MCP format