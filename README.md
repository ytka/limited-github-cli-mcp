# limited-github-cli-mcp

An MCP server that uses GitHub CLI to perform pull request (PR) operations on GitHub. It leverages the local `gh` command without requiring a GitHub Access Token.

## Features

This MCP server provides the following features:

1. **Create PR** (`create_pr`)
   - Specify title, body, base branch, head branch, and draft option

2. **List PRs** (`list_prs`)
   - Filter by state (open, closed, merged, all), base branch, and limit the number of results

3. **View PR** (`view_pr`)
   - Get detailed information about a specific PR by number

4. **Comment on PR** (`comment_pr`)
   - Add a comment to a PR by specifying PR number and comment body

## Prerequisites

- GitHub CLI (`gh`) installed
- Logged in to GitHub account using `gh auth login`
- Local clone of the GitHub repository you want to work with

## Usage Examples

### Create a PR

```
use_mcp_tool({
  server_name: "limited-github-cli",
  tool_name: "create_pr",
  arguments: {
    title: "Add new feature",
    body: "This PR adds feature X",
    base: "main",
    head: "feature/x",
    draft: true
  }
})
```

### List PRs

```
use_mcp_tool({
  server_name: "limited-github-cli",
  tool_name: "list_prs",
  arguments: {
    state: "open",
    limit: 5
  }
})
```

### View PR Details

```
use_mcp_tool({
  server_name: "limited-github-cli",
  tool_name: "view_pr",
  arguments: {
    number: 123
  }
})
```

### Comment on PR

```
use_mcp_tool({
  server_name: "limited-github-cli",
  tool_name: "comment_pr",
  arguments: {
    number: 123,
    body: "I've reviewed this. LGTM!"
  }
})
```

## Security

This MCP server uses the local GitHub CLI, so it doesn't directly handle GitHub Access Tokens. It leverages the authentication credentials of the GitHub CLI, making it a secure way to perform GitHub operations.
