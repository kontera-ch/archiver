import { HttpBackend, HttpRequestOptions } from '@taquito/http-utils'

export class KonteraHttpBackend extends HttpBackend {
  constructor(private headers?: { [key: string]: string }) {
    super()
  }

  async createRequest<T>(options: HttpRequestOptions, data?: object | string): Promise<T> {
    options.headers = this.headers
    return super.createRequest(options, data)
  }
}