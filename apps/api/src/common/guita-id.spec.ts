import assert from 'node:assert/strict'
import test from 'node:test'

import { generateGuitaId, isValidGuitaId } from './guita-id'

test('generateGuitaId creates valid and unique guita ids', () => {
  const generatedIds = new Set<string>()

  for (let index = 0; index < 10_000; index += 1) {
    const guitaId = generateGuitaId()

    assert.equal(guitaId.length, 14)
    assert.ok(guitaId.startsWith('GT'))
    assert.ok(isValidGuitaId(guitaId))
    assert.ok(!generatedIds.has(guitaId))

    generatedIds.add(guitaId)
  }

  assert.equal(generatedIds.size, 10_000)
})
