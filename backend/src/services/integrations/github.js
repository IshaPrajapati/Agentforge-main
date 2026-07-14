import { Octokit } from '@octokit/rest'
import { config } from '../../config/index.js'
import logger from '../../utils/logger.js'

export async function createGitHubIssues(issues) {
  if (!config.github.token || !config.github.owner || !config.github.repo) {
    logger.info('GitHub not configured — simulating issue creation')
    return {
      created: true,
      issues: issues.map((i) => i.title),
      simulated: true,
    }
  }

  try {
    const octokit = new Octokit({ auth: config.github.token })
    const created = []

    for (const issue of issues) {
      const response = await octokit.issues.create({
        owner: config.github.owner,
        repo: config.github.repo,
        title: issue.title,
        body: issue.body,
        labels: issue.labels,
      })
      created.push(`#${response.data.number}: ${issue.title}`)
    }

    return { created: true, issues: created, simulated: false }
  } catch (err) {
    logger.error('GitHub API failed, falling back to simulation', { error: err.message })
    return {
      created: true,
      issues: issues.map((i) => `[simulated] ${i.title}`),
      simulated: true,
    }
  }
}
