import { z } from 'zod';

export const ConfigSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client secret is required"),
  userAgent: z.string().min(1, "User agent is required"),
  username: z.string().optional(),
  password: z.string().optional(),
  refreshToken: z.string().optional(),
  accessToken: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function getConfig(): Config {
  const config = {
    clientId: process.env.REDDIT_CLIENT_ID || "",
    clientSecret: process.env.REDDIT_CLIENT_SECRET || "",
    userAgent: process.env.REDDIT_USER_AGENT || "reddit-mcp-server/1.0.0",
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    refreshToken: process.env.REDDIT_REFRESH_TOKEN,
    accessToken: process.env.REDDIT_ACCESS_TOKEN,
  };

  return ConfigSchema.parse(config);
}