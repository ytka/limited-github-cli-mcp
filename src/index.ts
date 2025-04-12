#!/usr/bin/env node
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import {execSync} from 'child_process';

// Utility function for GitHub CLI operations
function executeGhCommand(command: string): string {
  try {
    return execSync(`gh ${command}`, {encoding: 'utf8'});
  } catch (error) {
    if (error instanceof Error) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitHub CLI error: ${error.message}`
      );
    }
    throw error;
  }
}

// Create PR
interface CreatePrArgs {
  title: string;
  body?: string;
  base?: string;
  head?: string;
  draft?: boolean;
}

function isValidCreatePrArgs(args: any): args is CreatePrArgs {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.title === 'string' &&
    (args.body === undefined || typeof args.body === 'string') &&
    (args.base === undefined || typeof args.base === 'string') &&
    (args.head === undefined || typeof args.head === 'string') &&
    (args.draft === undefined || typeof args.draft === 'boolean')
  );
}

// List PRs
interface ListPrArgs {
  state?: 'open' | 'closed' | 'merged' | 'all';
  base?: string;
  limit?: number;
}

function isValidListPrArgs(args: any): args is ListPrArgs {
  return (
    typeof args === 'object' &&
    args !== null &&
    (args.state === undefined ||
      ['open', 'closed', 'merged', 'all'].includes(args.state)) &&
    (args.base === undefined || typeof args.base === 'string') &&
    (args.limit === undefined || typeof args.limit === 'number')
  );
}

// View PR details
interface ViewPrArgs {
  number: number;
}

function isValidViewPrArgs(args: any): args is ViewPrArgs {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.number === 'number' &&
    Number.isInteger(args.number) &&
    args.number > 0
  );
}

// Comment on PR
interface CommentPrArgs {
  number: number;
  body: string;
}

function isValidCommentPrArgs(args: any): args is CommentPrArgs {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.number === 'number' &&
    Number.isInteger(args.number) &&
    args.number > 0 &&
    typeof args.body === 'string'
  );
}

class GithubCliServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'limited-github-cli',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_pr',
          description: 'Create a new pull request',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Title of the pull request',
              },
              body: {
                type: 'string',
                description: 'Body/description of the pull request',
              },
              base: {
                type: 'string',
                description: 'The branch into which you want your code merged',
              },
              head: {
                type: 'string',
                description:
                  'The branch that contains commits for your pull request',
              },
              draft: {
                type: 'boolean',
                description: 'Create the pull request as a draft',
              },
            },
            required: ['title'],
          },
        },
        {
          name: 'list_prs',
          description: 'List pull requests in the current repository',
          inputSchema: {
            type: 'object',
            properties: {
              state: {
                type: 'string',
                enum: ['open', 'closed', 'merged', 'all'],
                description: 'Filter by state',
              },
              base: {
                type: 'string',
                description: 'Filter by base branch',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of pull requests to fetch',
              },
            },
          },
        },
        {
          name: 'view_pr',
          description: 'View a specific pull request',
          inputSchema: {
            type: 'object',
            properties: {
              number: {
                type: 'number',
                description: 'Pull request number',
              },
            },
            required: ['number'],
          },
        },
        {
          name: 'comment_pr',
          description: 'Add a comment to a pull request',
          inputSchema: {
            type: 'object',
            properties: {
              number: {
                type: 'number',
                description: 'Pull request number',
              },
              body: {
                type: 'string',
                description: 'Comment text',
              },
            },
            required: ['number', 'body'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'create_pr': {
          if (!isValidCreatePrArgs(request.params.arguments)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Invalid create_pr arguments'
            );
          }

          const {title, body, base, head, draft} = request.params.arguments;
          let command = `pr create --title "${title}"`;

          if (body) command += ` --body "${body}"`;
          if (base) command += ` --base "${base}"`;
          if (head) command += ` --head "${head}"`;
          if (draft) command += ' --draft';

          try {
            const result = executeGhCommand(command);
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          } catch (error) {
            if (error instanceof McpError) {
              return {
                content: [
                  {
                    type: 'text',
                    text: error.message,
                  },
                ],
                isError: true,
              };
            }
            throw error;
          }
        }

        case 'list_prs': {
          if (!isValidListPrArgs(request.params.arguments)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Invalid list_prs arguments'
            );
          }

          const {state, base, limit} = request.params.arguments;
          let command = 'pr list';

          if (state) command += ` --state ${state}`;
          if (base) command += ` --base ${base}`;
          if (limit) command += ` --limit ${limit}`;

          try {
            const result = executeGhCommand(command);
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          } catch (error) {
            if (error instanceof McpError) {
              return {
                content: [
                  {
                    type: 'text',
                    text: error.message,
                  },
                ],
                isError: true,
              };
            }
            throw error;
          }
        }

        case 'view_pr': {
          if (!isValidViewPrArgs(request.params.arguments)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Invalid view_pr arguments'
            );
          }

          const {number} = request.params.arguments;
          const command = `pr view ${number}`;

          try {
            const result = executeGhCommand(command);
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          } catch (error) {
            if (error instanceof McpError) {
              return {
                content: [
                  {
                    type: 'text',
                    text: error.message,
                  },
                ],
                isError: true,
              };
            }
            throw error;
          }
        }

        case 'comment_pr': {
          if (!isValidCommentPrArgs(request.params.arguments)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Invalid comment_pr arguments'
            );
          }

          const {number, body} = request.params.arguments;
          const command = `pr comment ${number} --body "${body}"`;

          try {
            const result = executeGhCommand(command);
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          } catch (error) {
            if (error instanceof McpError) {
              return {
                content: [
                  {
                    type: 'text',
                    text: error.message,
                  },
                ],
                isError: true,
              };
            }
            throw error;
          }
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub CLI MCP server running on stdio');
  }
}

const server = new GithubCliServer();
server.run().catch(console.error);
