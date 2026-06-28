/**
 * Vitest UI Client - Security-hardened WebSocket implementation
 *
 * This client-side code shows how the Vitest UI should be updated to:
 * 1. Fetch the authentication token from the server
 * 2. Include the token in WebSocket messages for sensitive operations
 * 3. Handle authentication errors appropriately
 */

/**
 * Flatted - lightweight JSON serialization library
 * (simplified version shown for example)
 */
interface Flatted {
  stringify(value: unknown): string
  parse(value: string): unknown
}

interface VitestMessage {
  t: 'q' | 'r' | 'e'
  i: string
  m: string
  a?: unknown[]
  token?: string
}

interface VitestResponse {
  t: 'r' | 'e'
  i: string
  r?: unknown
  e?: string
}

/**
 * Secure Vitest API Client
 *
 * Handles authentication and WebSocket communication with the Vitest API server
 */
export class VitestAPIClient {
  private ws: WebSocket | null = null
  private authToken: string | null = null
  private messageHandlers: Map<string, (response: VitestResponse) => void> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(
    private wsUrl: string,
    private tokenUrl: string = '/__vitest_api_token__',
    private flatted: Flatted,
    private onError?: (error: string) => void
  ) {}

  /**
   * Initialize the client: fetch token and establish WebSocket connection
   */
  async connect(): Promise<void> {
    try {
      // Step 1: Fetch authentication token from secure endpoint
      await this.fetchAuthToken()

      // Step 2: Establish WebSocket connection
      this.connectWebSocket()
    } catch (error) {
      this.handleError(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Fetch the authentication token from the server
   *
   * The token is fetched via a same-origin HTTP request to prevent CSRF attacks
   * and ensure the token is only available to the legitimate Vitest UI.
   */
  private async fetchAuthToken(): Promise<void> {
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'GET',
        credentials: 'include', // Include cookies if needed
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.token) {
        throw new Error('No token in response')
      }

      this.authToken = data.token
      console.log('[VitestAPI] Authentication token acquired')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Token fetch failed: ${message}`)
    }
  }

  /**
   * Establish WebSocket connection
   */
  private connectWebSocket(): void {
    try {
      this.ws = new WebSocket(this.wsUrl)

      this.ws.addEventListener('open', () => this.handleOpen())
      this.ws.addEventListener('message', (event) => this.handleMessage(event))
      this.ws.addEventListener('error', (event) => this.handleWSError(event))
      this.ws.addEventListener('close', () => this.handleClose())
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.handleError(`WebSocket connection failed: ${message}`)
      throw error
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('[VitestAPI] WebSocket connected')
    this.reconnectAttempts = 0
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const response = this.flatted.parse(event.data) as VitestResponse

      if (!response.i) {
        console.warn('[VitestAPI] Received message without ID:', response)
        return
      }

      // Route response to the appropriate handler
      const handler = this.messageHandlers.get(response.i)
      if (handler) {
        handler(response)
        this.messageHandlers.delete(response.i)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[VitestAPI] Failed to parse message:', message)
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleWSError(event: Event): void {
    console.error('[VitestAPI] WebSocket error:', event)
    this.handleError('WebSocket error occurred')
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(): void {
    console.log('[VitestAPI] WebSocket disconnected')

    // Attempt to reconnect with exponential backoff
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(`[VitestAPI] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

      setTimeout(() => {
        this.connectWebSocket()
      }, delay)
    } else {
      this.handleError('Failed to reconnect after maximum attempts')
    }
  }

  /**
   * Send a query message and wait for response
   *
   * Sensitive operations (saveTestFile, rerun) automatically include the auth token.
   */
  async query<T = unknown>(method: string, args: unknown[] = []): Promise<T> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId()
      // Must stay in sync with SENSITIVE_METHODS on the server
      const sensitiveOperations = ['saveTestFile', 'rerun', 'updateConfig', 'updateSettings', 'deleteFile', 'createFile']

      // Build the message
      const message: VitestMessage = {
        t: 'q',
        i: messageId,
        m: method,
        a: args,
      }

      // Include token for sensitive operations
      if (sensitiveOperations.includes(method)) {
        if (!this.authToken) {
          reject(new Error('Authentication token not available'))
          return
        }
        message.token = this.authToken
      }

      // Setup response handler
      this.messageHandlers.set(messageId, (response: VitestResponse) => {
        if (response.t === 'e') {
          // Handle authentication errors specially
          if (response.e?.includes('Unauthorized')) {
            this.handleAuthenticationError(response.e)
          }
          reject(new Error(response.e || 'Unknown error'))
        } else {
          resolve(response.r)
        }
      })

      // Set timeout for response
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(messageId)
        reject(new Error(`Query timeout: ${method}`))
      }, 30000) // 30 second timeout

      // Wrap the timeout cleanup
      const existingHandler = this.messageHandlers.get(messageId)!
      this.messageHandlers.set(messageId, (response: VitestResponse) => {
        clearTimeout(timeout)
        existingHandler(response)
      })

      // Send the message
      try {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          throw new Error('WebSocket is not connected')
        }

        const payload = this.flatted.stringify(message)
        this.ws.send(payload)
      } catch (error) {
        this.messageHandlers.delete(messageId)
        clearTimeout(timeout)
        const message = error instanceof Error ? error.message : String(error)
        reject(new Error(`Failed to send message: ${message}`))
      }
    })
  }

  /**
   * Get list of test files
   */
  async getFiles(): Promise<string[]> {
    return this.query('getFiles', [])
  }

  /**
   * Get test file content
   */
  async getFile(path: string): Promise<string> {
    return this.query('getFile', [path])
  }

  /**
   * Save test file (requires authentication)
   *
   * The authentication token is automatically included by the query method
   */
  async saveTestFile(path: string, content: string): Promise<void> {
    await this.query('saveTestFile', [path, content])
  }

  /**
   * Rerun tests for a file (requires authentication)
   *
   * The authentication token is automatically included by the query method
   */
  async rerun(filePath: string): Promise<void> {
    await this.query('rerun', [filePath])
  }

  /**
   * Get server configuration
   */
  async getConfig(): Promise<unknown> {
    return this.query('getConfig', [])
  }

  /**
   * Update configuration (requires authentication)
   */
  async updateConfig(config: Record<string, unknown>): Promise<void> {
    await this.query('updateConfig', [config])
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return crypto.randomUUID()
  }

  /**
   * Handle authentication errors
   */
  private handleAuthenticationError(error: string): void {
    console.error('[VitestAPI] Authentication error:', error)

    // Could trigger UI to:
    // - Show a message that the token has expired
    // - Reload the page to get a fresh token
    // - Disconnect and reconnect
    this.handleError(`Authentication failed: ${error}`)
  }

  /**
   * Handle errors
   */
  private handleError(message: string): void {
    console.error('[VitestAPI]', message)
    if (this.onError) {
      this.onError(message)
    }
  }

  /**
   * Disconnect the client
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.messageHandlers.clear()
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Wait for connection to be ready
   */
  async waitForReady(timeout = 5000): Promise<void> {
    const startTime = Date.now()

    while (!this.isConnected()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Connection timeout')
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
}

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Example of how to use the secure Vitest API client in the UI
 *
 * In your Vitest UI component:
 *
 * import { VitestAPIClient } from './vitest-ui-client-fixed'
 * import Flatted from 'flatted'
 *
 * // Initialize the client
 * const client = new VitestAPIClient(
 *   'ws://localhost:51204/__vitest_api__',
 *   '/__vitest_api_token__',
 *   Flatted,
 *   (error) => {
 *     console.error('Vitest API error:', error)
 *     // Show error to user
 *   }
 * )
 *
 * // Connect (fetches token and establishes WebSocket)
 * await client.connect()
 *
 * // Use the client
 * const files = await client.getFiles()
 *
 * // Save a test file (automatically includes auth token)
 * await client.saveTestFile('test.ts', 'import { describe, it } from "vitest"\n...')
 *
 * // Rerun tests (automatically includes auth token)
 * await client.rerun('test.ts')
 *
 * // Disconnect when done
 * client.disconnect()
 */

export default VitestAPIClient
