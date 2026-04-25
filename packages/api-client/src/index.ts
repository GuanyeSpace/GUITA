export type ApiClientOptions = {
  baseUrl: string
  defaultHeaders?: HeadersInit
  fetcher?: typeof fetch
}

export class ApiClient {
  private readonly baseUrl: string
  private readonly defaultHeaders?: HeadersInit
  private readonly fetcher: typeof fetch

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.defaultHeaders = options.defaultHeaders
    this.fetcher = options.fetcher ?? fetch
  }

  async request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...init.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as TResponse
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options)
}
