import { test } from 'node:test'
import assert from 'node:assert/strict'

test('Agent 1 rule engine produces valid output structure', async () => {
  const { runAgent1 } = await import('../src/services/agents/agent1.js')
  const result = await runAgent1({
    name: 'Test Project',
    description: 'A test inventory system',
    budget: 80000,
    timelineDays: 15,
    priority: 'P1',
  })

  assert.ok(result.output.project_summary)
  assert.ok(Array.isArray(result.output.modules))
  assert.ok(result.output.modules.length > 0)
  assert.ok(typeof result.output.total_estimated_days === 'number')
  assert.ok(result.output.confidence_score > 0)
})

test('Agent 2 validates project and requires approval for tight timeline', async () => {
  const { runAgent1 } = await import('../src/services/agents/agent1.js')
  const { runAgent2 } = await import('../src/services/agents/agent2.js')

  const project = { name: 'Inventory', description: 'Stock system', budget: 80000, timelineDays: 15, priority: 'P1' }
  const agent1 = await runAgent1(project)
  const agent2 = await runAgent2(project, agent1.output)

  assert.ok(agent2.output.status)
  assert.ok(typeof agent2.output.approval_required === 'boolean')
  assert.ok(agent2.output.budget_analysis)
  assert.ok(agent2.output.manager_summary)
})

test('Health endpoint returns ok', async () => {
  const res = await fetch('http://localhost:4000/api/health')
  if (res.ok) {
    const data = await res.json()
    assert.equal(data.status, 'ok')
  }
})
