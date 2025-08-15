#!/usr/bin/env node

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getConfig } from './config.js';
import { RedditClient } from './reddit-client.js';

const server = new Server(
  {
    name: 'reddit-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let redditClient: RedditClient;

try {
  const config = getConfig();
  redditClient = new RedditClient(config);
} catch (error) {
  console.error('Failed to initialize Reddit client:', error);
  process.exit(1);
}

const GetSubredditPostsSchema = z.object({
  subreddit: z.string().min(1, "Subreddit name is required"),
  sort: z.enum(['hot', 'new', 'top', 'rising']).default('hot'),
  limit: z.number().min(1).max(100).default(25),
});

const GetPostSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
});

const GetPostCommentsSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  sort: z.enum(['best', 'top', 'new', 'controversial', 'old']).default('best'),
});

const GetSubredditInfoSchema = z.object({
  subreddit: z.string().min(1, "Subreddit name is required"),
});

const GetUserInfoSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

const GetUserPostsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  sort: z.enum(['hot', 'new', 'top']).default('new'),
  limit: z.number().min(1).max(100).default(25),
});

const GetUserCommentsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  sort: z.enum(['hot', 'new', 'top']).default('new'),
  limit: z.number().min(1).max(100).default(25),
});

const SearchPostsSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  subreddit: z.string().optional(),
  sort: z.enum(['relevance', 'hot', 'top', 'new', 'comments']).default('relevance'),
  limit: z.number().min(1).max(100).default(25),
});

const SearchSubredditsSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  limit: z.number().min(1).max(100).default(25),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_subreddit_posts',
        description: 'Get posts from a specific subreddit',
        inputSchema: {
          type: 'object',
          properties: {
            subreddit: {
              type: 'string',
              description: 'Name of the subreddit (without r/ prefix)',
            },
            sort: {
              type: 'string',
              enum: ['hot', 'new', 'top', 'rising'],
              description: 'Sort order for posts',
              default: 'hot',
            },
            limit: {
              type: 'number',
              description: 'Number of posts to retrieve (1-100)',
              minimum: 1,
              maximum: 100,
              default: 25,
            },
          },
          required: ['subreddit'],
        },
      },
      {
        name: 'get_post',
        description: 'Get details of a specific Reddit post',
        inputSchema: {
          type: 'object',
          properties: {
            postId: {
              type: 'string',
              description: 'Reddit post ID',
            },
          },
          required: ['postId'],
        },
      },
      {
        name: 'get_post_comments',
        description: 'Get comments from a Reddit post',
        inputSchema: {
          type: 'object',
          properties: {
            postId: {
              type: 'string',
              description: 'Reddit post ID',
            },
            sort: {
              type: 'string',
              enum: ['best', 'top', 'new', 'controversial', 'old'],
              description: 'Sort order for comments',
              default: 'best',
            },
          },
          required: ['postId'],
        },
      },
      {
        name: 'get_subreddit_info',
        description: 'Get information about a subreddit',
        inputSchema: {
          type: 'object',
          properties: {
            subreddit: {
              type: 'string',
              description: 'Name of the subreddit (without r/ prefix)',
            },
          },
          required: ['subreddit'],
        },
      },
      {
        name: 'get_user_info',
        description: 'Get information about a Reddit user',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Reddit username (without u/ prefix)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_user_posts',
        description: 'Get posts submitted by a user',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Reddit username (without u/ prefix)',
            },
            sort: {
              type: 'string',
              enum: ['hot', 'new', 'top'],
              description: 'Sort order for posts',
              default: 'new',
            },
            limit: {
              type: 'number',
              description: 'Number of posts to retrieve (1-100)',
              minimum: 1,
              maximum: 100,
              default: 25,
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_user_comments',
        description: 'Get comments made by a user',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Reddit username (without u/ prefix)',
            },
            sort: {
              type: 'string',
              enum: ['hot', 'new', 'top'],
              description: 'Sort order for comments',
              default: 'new',
            },
            limit: {
              type: 'number',
              description: 'Number of comments to retrieve (1-100)',
              minimum: 1,
              maximum: 100,
              default: 25,
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'search_posts',
        description: 'Search for Reddit posts',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            subreddit: {
              type: 'string',
              description: 'Optional: restrict search to specific subreddit',
            },
            sort: {
              type: 'string',
              enum: ['relevance', 'hot', 'top', 'new', 'comments'],
              description: 'Sort order for search results',
              default: 'relevance',
            },
            limit: {
              type: 'number',
              description: 'Number of results to retrieve (1-100)',
              minimum: 1,
              maximum: 100,
              default: 25,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_subreddits',
        description: 'Search for subreddits',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for subreddit names/descriptions',
            },
            limit: {
              type: 'number',
              description: 'Number of results to retrieve (1-100)',
              minimum: 1,
              maximum: 100,
              default: 25,
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'get_subreddit_posts': {
        const args = GetSubredditPostsSchema.parse(request.params.arguments);
        const posts = await redditClient.getSubredditPosts(args.subreddit, args.sort, args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(posts, null, 2),
            },
          ],
        };
      }

      case 'get_post': {
        const args = GetPostSchema.parse(request.params.arguments);
        const post = await redditClient.getPost(args.postId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(post, null, 2),
            },
          ],
        };
      }

      case 'get_post_comments': {
        const args = GetPostCommentsSchema.parse(request.params.arguments);
        const comments = await redditClient.getPostComments(args.postId, args.sort);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(comments, null, 2),
            },
          ],
        };
      }

      case 'get_subreddit_info': {
        const args = GetSubredditInfoSchema.parse(request.params.arguments);
        const subreddit = await redditClient.getSubredditInfo(args.subreddit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(subreddit, null, 2),
            },
          ],
        };
      }

      case 'get_user_info': {
        const args = GetUserInfoSchema.parse(request.params.arguments);
        const user = await redditClient.getUserInfo(args.username);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      }

      case 'get_user_posts': {
        const args = GetUserPostsSchema.parse(request.params.arguments);
        const posts = await redditClient.getUserPosts(args.username, args.sort, args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(posts, null, 2),
            },
          ],
        };
      }

      case 'get_user_comments': {
        const args = GetUserCommentsSchema.parse(request.params.arguments);
        const comments = await redditClient.getUserComments(args.username, args.sort, args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(comments, null, 2),
            },
          ],
        };
      }

      case 'search_posts': {
        const args = SearchPostsSchema.parse(request.params.arguments);
        const posts = await redditClient.searchPosts(args.query, args.subreddit, args.sort, args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(posts, null, 2),
            },
          ],
        };
      }

      case 'search_subreddits': {
        const args = SearchSubredditsSchema.parse(request.params.arguments);
        const subreddits = await redditClient.searchSubreddits(args.query, args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(subreddits, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Tool ${request.params.name} not found`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Reddit MCP Server running on stdio');
}

main().catch(console.error);