/**
 * Security tests for Vitest WebSocket CSWSH vulnerability and fixes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import ws from 'ws'
import { createServer } from 'http'
import {
  setupSecureWebSocket,
  generateAuthToken,
  createTokenEndpoint,
} from './vitest-websocket-setup-fixed'

describe('Vitest WebSocket CSWSH Security', () => {
  let httpServer: any
  let wss: ws.Server
  let serverUrl: string
  let authToken: string
  let port: number

  beforeEach(async () => {
    port = 3000 + Math.floor(Math.random() * 1000)
    httpServer = createServer()
    authToken = generateAuthToken()

    wss = setupSecureWebSocket(httpServer, {
      authToken,
      requireOriginValidation: true,
      enableLogging: false,
    })

    httpServer.on('request', (req: any, res: any) => {
      if (req.url === '/__vitest_api_token__') {
        createTokenEndpoint(authToken)(req, res)
        return
      }
      res.statusCode = 404
      res.end('Not Found')
    })

    await new Promise<void>((resolve) => {
      httpServer.listen(port, 'localhost', () => {
        serverUrl = `ws://localhost:${port}`
        resolve()
      })
    })
  })

  afterEach(async () => {
    wss.close()
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve())
    })
  })

  // Helper: connect with localhost origin, send a message, return the first response.
  async function connectAndSendMessage(message: any, token?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const socket = new ws.WebSocket(serverUrl, {
        headers: { origin: 'http://localhost:3000' },
      })

      const timeout = setTimeout(() => {
        socket.close()
        reject(new Error('No response received within timeout'))
      }, 5000)

      socket.on('open', () => {
        const payload = token ? { ...message, token } : message
        socket.send(JSON.stringify(payload))
      })

      socket.on('message', (data) => {
        clearTimeout(timeout)
        socket.close()
        resolve(JSON.parse(data.toString()))
      })

      socket.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
  }

  // Helper: attempt a WebSocket connection and expect it to be rejected.
  async function expectConnectionRejected(origin: string | undefined): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const opts = origin ? { headers: { origin } } : {}
      const socket = new ws.WebSocket(serverUrl, opts)

      let opened = false
      const timeout = setTimeout(() => {
        if (!opened) resolve()
        else reject(new Error('Connection remained open'))
      }, 2000)

      socket.on('open', () => {
        opened = true
        clearTimeout(timeout)
        socket.close()
        reject(new Error(`Expected rejection but connection opened (origin: ${origin})`))
      })
      socket.on('error', () => { clearTimeout(timeout); resolve() })
      socket.on('close', () => { if (!opened) { clearTimeout(timeout); resolve() } })
    })
  }

  // =========================================================================
  // Origin Header Validation (CSWSH Prevention)
  // =========================================================================

  describe('Origin Header Validation', () => {
    it('should accept connections from http://localhost', async () => {
      const socket = new ws.WebSocket(serverUrl, {
        headers: { origin: 'http://localhost:3000' },
      })
      await new Promise<void>((resolve, reject) => {
        socket.on('open', () => { socket.close(); resolve() })
        socket.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })
    })

    it('should accept connections from http://127.0.0.1', async () => {
      const socket = new ws.WebSocket(serverUrl, {
        headers: { origin: 'http://127.0.0.1:3000' },
      })
      await new Promise<void>((resolve, reject) => {
        socket.on('open', () => { socket.close(); resolve() })
        socket.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })
    })

    it('should reject connections from an external domain', async () => {
      await expectConnectionRejected('https://malicious.com')
    })

    it('should reject connections from attacker subdomain', async () => {
      await expectConnectionRejected('https://attacker.github.io')
    })

    it('should reject connections with no Origin header', async () => {
      await expectConnectionRejected(undefined)
    })

    it('should reject localhost.attacker.com (hostname is not exactly localhost)', async () => {
      await expectConnectionRejected('http://localhost.attacker.com')
    })
  })

  // =========================================================================
  // Authentication Token Validation
  // =========================================================================

  describe('Authentication Token Validation', () => {
    it('should allow saveTestFile with valid token', async () => {
      const res = await connectAndSendMessage(
        { t: 'q', i: 'msg-1', m: 'saveTestFile', a: ['test.ts', 'code'] },
        authToken
      )
      expect(res.t).toBe('r')
      expect(res.e).toBeUndefined()
    })

    it('should reject saveTestFile with no token', async () => {
      const res = await connectAndSendMessage(
        { t: 'q', i: 'msg-2', m: 'saveTestFile', a: ['test.ts', 'hacked'] }
      )
      expect(res.t).toBe('e')
      expect(res.e).toContain('Unauthorized')
    })

    it('should reject saveTestFile with wrong token', async () => {
      const res = await connectAndSendMessage(
        { t: 'q', i: 'msg-3', m: 'saveTestFile', a: ['test.ts', 'code'] },
        'invalid-token-12345'
      )
      expect(res.t).toBe('e')
      expect(res.e).toContain('Unauthorized')
    })

    it('should allow rerun with valid token', async () => {
      const res = await connectAndSendMessage(
        { t: 'q', i: 'msg-4', m: 'rerun', a: ['test.ts'] },
        authToken
      )
      expect(res.t).toBe('r')
      expect(res.e).toBeUndefined()
    })

    it('should reject rerun with no token', async () => {
      const res = await connectAndSendMessage(
        { t: 'q', i: 'msg-5', m: 'rerun', a: ['test.ts'] }
      )
      expect(res.t).toBe('e')
      expect(res.e).toContain('Unauthorized')
    })

    it('should allow read-only getFiles without token', async () => {
      const res = await connectAndSendMessage(
        { t: 'q', i: 'msg-6', m: 'getFiles', a: [] }
      )
      expect(res.t).toBe('r')
      expect(res.e).toBeUndefined()
    })
  })

  // =========================================================================
  // Attack Scenarios
  // =========================================================================

  describe('Attack Scenarios', () => {
    it('should block CSWSH: external origin cannot reach the socket', async () => {
      await expectConnectionRejected('https://attacker-site.com')
    })

    it('should block PoC RCE: saveTestFile without token is rejected even from localhost', async () => {
      const res = await connectAndSendMessage({
        t: 'q',
        i: 'poc-1',
        m: 'saveTestFile',
        a: [
          'test.ts',
          "import child_process from 'child_process';child_process.execSync('calc')",
        ],
        // token intentionally omitted
      })
      expect(res.t).toBe('e')
      expect(res.e).toContain('Unauthorized')
    })
  })

  // =========================================================================
  // Token Endpoint Security
  // =========================================================================

  describe('Token Endpoint Security', () => {
    it('should serve the token to a request from localhost (socket-level check)', async () => {
      // The server listens on localhost so fetch() always connects from 127.0.0.1/::1.
      // Security is enforced on req.socket.remoteAddress, not the Host header.
      const response = await fetch(`http://localhost:${port}/__vitest_api_token__`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(typeof data.token).toBe('string')
      expect(data.token.length).toBeGreaterThan(0)
    })

    it('should NOT be fooled by a spoofed Host header (socket address decides)', async () => {
      // With the GAP-2 fix, Host: attacker.com from a local socket is still allowed,
      // because the check uses req.socket.remoteAddress (127.0.0.1), not req.hostname.
      // This test documents that the fix is immune to Host-header spoofing.
      const response = await fetch(`http://localhost:${port}/__vitest_api_token__`, {
        headers: { host: 'attacker.com' },
      })
      // Still 200: the Host header is irrelevant; what matters is that the
      // socket came from 127.0.0.1 (a remote attacker on a different machine
      // would get 403).
      expect(response.status).toBe(200)
    })

    it('should set no-store cache header', async () => {
      const response = await fetch(`http://localhost:${port}/__vitest_api_token__`)
      const cc = response.headers.get('cache-control') ?? ''
      expect(cc).toContain('no-store')
      expect(cc).toContain('no-cache')
      expect(cc).toContain('private')
    })

    it('should set security headers', async () => {
      const response = await fetch(`http://localhost:${port}/__vitest_api_token__`)
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      expect(response.headers.get('x-frame-options')).toBe('DENY')
    })
  })

  // =========================================================================
  // Timing Attack Prevention
  // =========================================================================

  describe('Timing Attack Prevention', () => {
    it('should reject any wrong token with the same Unauthorized error', async () => {
      // Verifies that constantTimeCompare (backed by crypto.timingSafeEqual) returns
      // a uniform rejection for all wrong tokens, no early-exit information leak.
      const wrong1 = await connectAndSendMessage(
        { t: 'q', i: 'timing-1', m: 'saveTestFile', a: ['t.ts', ''] },
        'a'.repeat(64)
      )
      const wrong2 = await connectAndSendMessage(
        { t: 'q', i: 'timing-2', m: 'saveTestFile', a: ['t.ts', ''] },
        'b'.repeat(64)
      )
      expect(wrong1.t).toBe('e')
      expect(wrong2.t).toBe('e')
      expect(wrong1.e).toBe(wrong2.e)
    })

    it('should reject tokens of the wrong length with the same error as wrong-content tokens', async () => {
      // A naïve length check before XOR would leak the expected token length.
      // constantTimeCompare hashes both inputs to SHA-256 first, so length differences
      // produce identical timing.
      const shortToken = await connectAndSendMessage(
        { t: 'q', i: 'timing-3', m: 'saveTestFile', a: ['t.ts', ''] },
        'short'
      )
      const longToken = await connectAndSendMessage(
        { t: 'q', i: 'timing-4', m: 'saveTestFile', a: ['t.ts', ''] },
        'a'.repeat(128)
      )
      expect(shortToken.t).toBe('e')
      expect(longToken.t).toBe('e')
      expect(shortToken.e).toBe(longToken.e)
    })
  })
})
