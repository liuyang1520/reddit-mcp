import fetch, { RequestInit } from 'node-fetch';
import { Config } from './config.js';

export interface RedditPost {
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

export interface RedditComment {
  id: string;
  author: string;
  body: string;
  created_utc: number;
  score: number;
  permalink: string;
  parent_id: string;
  subreddit: string;
}

export interface RedditSubreddit {
  display_name: string;
  title: string;
  description: string;
  subscribers: number;
  created_utc: number;
  public_description: string;
  url: string;
  over18: boolean;
}

export interface RedditUser {
  name: string;
  id: string;
  created_utc: number;
  comment_karma: number;
  link_karma: number;
  is_verified: boolean;
  has_verified_email: boolean;
}

export class RedditClient {
  private config: Config;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl = 'https://oauth.reddit.com';
  private authUrl = 'https://www.reddit.com/api/v1/access_token';

  constructor(config: Config) {
    this.config = config;
    this.accessToken = config.accessToken || null;
  }

  private async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return;
    }

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    let body: string;
    if (this.config.refreshToken) {
      body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken,
      }).toString();
    } else if (this.config.username && this.config.password) {
      body = new URLSearchParams({
        grant_type: 'password',
        username: this.config.username,
        password: this.config.password,
      }).toString();
    } else {
      body = new URLSearchParams({
        grant_type: 'client_credentials',
      }).toString();
    }

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.config.userAgent,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute early
  }

  private async makeRequest(endpoint: string, options: Partial<RequestInit> = {}): Promise<any> {
    await this.authenticate();

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'User-Agent': this.config.userAgent,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getSubredditPosts(subreddit: string, sort: 'hot' | 'new' | 'top' | 'rising' = 'hot', limit: number = 25): Promise<RedditPost[]> {
    const data = await this.makeRequest(`/r/${subreddit}/${sort}?limit=${limit}`);
    return data.data.children.map((child: any) => this.mapPost(child.data));
  }

  async getPost(postId: string): Promise<RedditPost> {
    const data = await this.makeRequest(`/comments/${postId}`);
    return this.mapPost(data[0].data.children[0].data);
  }

  async getPostComments(postId: string, sort: 'best' | 'top' | 'new' | 'controversial' | 'old' = 'best'): Promise<RedditComment[]> {
    const data = await this.makeRequest(`/comments/${postId}?sort=${sort}`);
    const comments: RedditComment[] = [];
    
    if (data[1] && data[1].data && data[1].data.children) {
      this.extractComments(data[1].data.children, comments);
    }
    
    return comments;
  }

  async getSubredditInfo(subreddit: string): Promise<RedditSubreddit> {
    const data = await this.makeRequest(`/r/${subreddit}/about`);
    return this.mapSubreddit(data.data);
  }

  async getUserInfo(username: string): Promise<RedditUser> {
    const data = await this.makeRequest(`/user/${username}/about`);
    return this.mapUser(data.data);
  }

  async getUserPosts(username: string, sort: 'hot' | 'new' | 'top' = 'new', limit: number = 25): Promise<RedditPost[]> {
    const data = await this.makeRequest(`/user/${username}/submitted?sort=${sort}&limit=${limit}`);
    return data.data.children.map((child: any) => this.mapPost(child.data));
  }

  async getUserComments(username: string, sort: 'hot' | 'new' | 'top' = 'new', limit: number = 25): Promise<RedditComment[]> {
    const data = await this.makeRequest(`/user/${username}/comments?sort=${sort}&limit=${limit}`);
    return data.data.children.map((child: any) => this.mapComment(child.data));
  }

  async searchPosts(query: string, subreddit?: string, sort: 'relevance' | 'hot' | 'top' | 'new' | 'comments' = 'relevance', time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all', limit: number = 25): Promise<RedditPost[]> {
    const searchPath = subreddit ? `/r/${subreddit}/search` : '/search';
    const params = new URLSearchParams({
      q: query,
      sort,
      limit: limit.toString(),
      type: 'link',
      ...(subreddit && { restrict_sr: 'true' }),
      ...(time && { t: time })
    });
    
    const data = await this.makeRequest(`${searchPath}?${params}`);
    return data.data.children.map((child: any) => this.mapPost(child.data));
  }

  async searchSubreddits(query: string, limit: number = 25): Promise<RedditSubreddit[]> {
    const data = await this.makeRequest(`/subreddits/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return data.data.children.map((child: any) => this.mapSubreddit(child.data));
  }

  private extractComments(children: any[], comments: RedditComment[]): void {
    for (const child of children) {
      if (child.kind === 't1' && child.data) {
        comments.push(this.mapComment(child.data));
        if (child.data.replies && child.data.replies.data && child.data.replies.data.children) {
          this.extractComments(child.data.replies.data.children, comments);
        }
      }
    }
  }

  private mapPost(data: any): RedditPost {
    return {
      id: data.id,
      title: data.title,
      author: data.author,
      subreddit: data.subreddit,
      url: data.url,
      selftext: data.selftext || '',
      created_utc: data.created_utc,
      score: data.score,
      num_comments: data.num_comments,
      permalink: `https://reddit.com${data.permalink}`,
      is_self: data.is_self,
      domain: data.domain,
      thumbnail: data.thumbnail !== 'self' && data.thumbnail !== 'default' ? data.thumbnail : undefined,
    };
  }

  private mapComment(data: any): RedditComment {
    return {
      id: data.id,
      author: data.author,
      body: data.body,
      created_utc: data.created_utc,
      score: data.score,
      permalink: `https://reddit.com${data.permalink}`,
      parent_id: data.parent_id,
      subreddit: data.subreddit,
    };
  }

  private mapSubreddit(data: any): RedditSubreddit {
    return {
      display_name: data.display_name,
      title: data.title,
      description: data.description,
      subscribers: data.subscribers,
      created_utc: data.created_utc,
      public_description: data.public_description,
      url: `https://reddit.com/r/${data.display_name}`,
      over18: data.over18,
    };
  }

  private mapUser(data: any): RedditUser {
    return {
      name: data.name,
      id: data.id,
      created_utc: data.created_utc,
      comment_karma: data.comment_karma,
      link_karma: data.link_karma,
      is_verified: data.is_verified,
      has_verified_email: data.has_verified_email,
    };
  }
}