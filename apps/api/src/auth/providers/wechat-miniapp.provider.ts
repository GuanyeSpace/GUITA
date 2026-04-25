import { Injectable, NotImplementedException } from '@nestjs/common'
import { createHash } from 'node:crypto'

export type WechatMiniappSession = {
  openid: string
  unionid?: string
  sessionKey: string
}

export interface WechatMiniappProvider {
  code2Session(code: string): Promise<WechatMiniappSession>
}

export const WECHAT_MINIAPP_PROVIDER = Symbol('WECHAT_MINIAPP_PROVIDER')

function createSuffix(code: string) {
  return createHash('sha1').update(code).digest('hex').slice(0, 16)
}

@Injectable()
export class MockWechatMiniappProvider implements WechatMiniappProvider {
  async code2Session(code: string) {
    const suffix = createSuffix(code)

    return {
      openid: `mock_openid_${suffix}`,
      unionid: `mock_unionid_${suffix}`,
      sessionKey: createHash('sha1').update(`session:${code}`).digest('hex'),
    }
  }
}

@Injectable()
export class RealWechatMiniappProvider implements WechatMiniappProvider {
  async code2Session(_code: string): Promise<WechatMiniappSession> {
    throw new NotImplementedException('WECHAT_PROVIDER=real is not implemented in Step 2a')
  }
}
