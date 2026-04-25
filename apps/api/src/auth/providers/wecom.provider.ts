import { Injectable, NotImplementedException } from '@nestjs/common'
import { createHash } from 'node:crypto'

export type WecomIdentity = {
  externalUserId: string
}

export interface WecomProvider {
  resolveExternalUserId(code: string): Promise<WecomIdentity>
}

export const WECOM_PROVIDER = Symbol('WECOM_PROVIDER')

function createSuffix(code: string) {
  return createHash('sha1').update(code).digest('hex').slice(0, 16)
}

@Injectable()
export class MockWecomProvider implements WecomProvider {
  async resolveExternalUserId(code: string) {
    return {
      externalUserId: `mock_wecom_${createSuffix(code)}`,
    }
  }
}

@Injectable()
export class RealWecomProvider implements WecomProvider {
  async resolveExternalUserId(_code: string): Promise<WecomIdentity> {
    throw new NotImplementedException('WECOM_PROVIDER=real is not implemented in Step 2a')
  }
}
