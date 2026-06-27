/**
 * Vitest WebSocket API Server - Security-hardened implementation
 *
 * This implementation fixes the CSWSH (Cross-site WebSocket hijacking) vulnerability
 * by adding:
 * 1. Origin header validation
 * 2. Token-based authentication
 * 3. Authorization checks on sensitive APIs
 * 4. Constant-time token comparison
 */

import ws from 'ws'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { Socket } from 'net'
import { randomBytes, timingSafeEqual, createHash } from 'crypto'

// ============================================================================
// Types
// ============================================================================

interface VitestMessage {
  t: 'q' | 'r' | 'e' // query, response, error
  i: string // message id
  m: string // method name
  a?: unknown[] // arguments
  token?: string // authentication token
}

interface WebSocketSecurityConfig {
  authToken: string
  allowedOrigins?: string[]
  requireOriginValidation?: boolean
  enableLogging?: boolean
}

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Generate a cryptographically secure authentication token
 */
export function generateAuthToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Validate an origin against allowed origins
 * Only allows localhost/127.0.0.1 for development
 */
function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[]
): boolean {
  if (!origin) {
    return false
  }

  try {
    const url = new URL(origin)
    const hostname = url.hostname

    // Whitelist localhost and IPv6 loopback.
    // WHATWG URL parses http://[::1] with brackets in hostname, so check both forms.
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname === '::ffff:127.0.0.1'

    if (isLocalhost) {
      return true
    }

    // Check against explicitly allowed origins
    return allowedOrigins.includes(origin)
  } catch (error) {
    return false
  }
}

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * Both values are SHA-256 hashed before comparison so timingSafeEqual always
 * receives equal-length buffers, preventing the early-exit length leak that a
 * plain XOR loop would expose.
 */
function constantTimeCompare(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/**
 * Methods that require authentication
 */
const SENSITIVE_METHODS = new Set([
  'saveTestFile',
  'rerun',
  'updateConfig',
  'updateSettings',
  'deleteFile',
  'createFile',
])

/**
 * Validate authentication token for sensitive operations
 */
function validateAuthToken(message: VitestMessage, validToken: string): boolean {
  // If this is a sensitive operation, require token
  if (SENSITIVE_METHODS.has(message.m)) {
    // Token must be present
    if (!message.token) {
      return false
    }

    // Use constant-time comparison to prevent timing attacks
    return constantTimeCompare(message.token, validToken)
  }

  // Read-only operations don't require token
  // (getFiles, getConfig, etc.)
  return true
}

// ============================================================================
// WebSocket Setup
// ============================================================================

/**
 * Setup secure WebSocket server with CSWSH protection
 *
 * This function:
 * 1. Validates Origin headers on upgrade
 * 2. Establishes WebSocket connection
 * 3. Requires authentication for sensitive operations
 */
export function setupSecureWebSocket(
  httpServer: Server,
  config: WebSocketSecurityConfig
): ws.Server {
  const wss = new ws.Server({ noServer: true })

  // Intercept the upgrade request
  httpServer.on(
    'upgrade',
    (request: IncomingMessage, socket: Socket, head: Buffer) => {
      const origin = request.headers.origin

      // 1. CRITICAL: Validate Origin header to prevent CSWSH
      if (config.requireOriginValidation !== false) {
        const allowedOrigins = config.allowedOrigins || []

        if (!isOriginAllowed(origin, allowedOrigins)) {
          if (config.enableLogging) {
            console.warn(
              `[WebSocket Security] Rejected connection from unauthorized origin: ${origin}`
            )
          }

          // Reject the upgrade
          socket.write('HTTP/1.1 403 Forbidden\r\n')
          socket.write('Content-Type: text/plain\r\n')
          socket.write('Content-Length: 9\r\n')
          socket.write('Connection: close\r\n')
          socket.write('\r\n')
          socket.write('Forbidden')
          socket.destroy()
          return
        }
      }

      // 2. Origin is valid, proceed with WebSocket upgrade
      wss.handleUpgrade(request, socket, head, (websocket) => {
        setupSecureWebSocketHandlers(websocket, config)
      })
    }
  )

  return wss
}

/**
 * Setup message handlers with authentication
 */
function setupSecureWebSocketHandlers(
  websocket: ws.WebSocket,
  config: WebSocketSecurityConfig
): void {
  websocket.on('message', (data: Buffer) => {
    try {
      // Parse the message
      const message = parseMessage(data)

      // 2. CRITICAL: Validate authentication token for sensitive operations
      if (!validateAuthToken(message, config.authToken)) {
        if (config.enableLogging) {
          console.warn(
            `[WebSocket Security] Unauthorized access attempt to method: ${message.m}`
          )
        }

        // Send error response
        websocket.send(
          JSON.stringify({
            t: 'e',
            i: message.i,
            e: 'Unauthorized: Invalid or missing authentication token',
          })
        )
        return
      }

      // Message is authorized, handle it
      handleAuthorizedMessage(message, websocket, config)
    } catch (error) {
      if (config.enableLogging) {
        console.error('[WebSocket Security] Error processing message:', error)
      }

      websocket.send(
        JSON.stringify({
          t: 'e',
          e: 'Invalid message format',
        })
      )
    }
  })

  websocket.on('error', (error) => {
    if (config.enableLogging) {
      console.error('[WebSocket] Error:', error)
    }
  })

  websocket.on('close', () => {
    if (config.enableLogging) {
      console.log('[WebSocket] Connection closed')
    }
  })
}

/**
 * Parse and validate incoming message
 */
function parseMessage(data: Buffer): VitestMessage {
  const text = data.toString('utf-8')
  const message = JSON.parse(text)

  // Validate message structure
  if (!message.t || !message.i || !message.m) {
    throw new Error('Invalid message structure')
  }

  return message
}

/**
 * Handle authorized message (placeholder - would be replaced with actual handler)
 */
function handleAuthorizedMessage(
  message: VitestMessage,
  websocket: ws.WebSocket,
  config: WebSocketSecurityConfig
): void {
  // Dispatch to appropriate handler based on method
  if (message.m === 'saveTestFile') {
    handleSaveTestFile(message, websocket)
  } else if (message.m === 'rerun') {
    handleRerun(message, websocket)
  } else if (message.m === 'getFiles') {
    handleGetFiles(message, websocket)
  } else {
    websocket.send(
      JSON.stringify({
        t: 'r',
        i: message.i,
        e: `Unknown method: ${message.m}`,
      })
    )
  }
}

// Placeholder handlers
function handleSaveTestFile(message: VitestMessage, ws: ws.WebSocket): void {
  // Implementation would save the test file
  // This is now protected by authentication
  ws.send(
    JSON.stringify({
      t: 'r',
      i: message.i,
      r: 'File saved successfully',
    })
  )
}

function handleRerun(message: VitestMessage, ws: ws.WebSocket): void {
  // Implementation would rerun tests
  // This is now protected by authentication
  ws.send(
    JSON.stringify({
      t: 'r',
      i: message.i,
      r: 'Tests rerun started',
    })
  )
}

function handleGetFiles(message: VitestMessage, ws: ws.WebSocket): void {
  // Implementation would return list of files
  // This doesn't require authentication (read-only)
  ws.send(
    JSON.stringify({
      t: 'r',
      i: message.i,
      r: ['test1.ts', 'test2.ts'],
    })
  )
}

// ============================================================================
// Token Delivery to Client
// ============================================================================

/**
 * Create middleware to serve the authentication token to the UI
 *
 * This endpoint:
 * - Only accepts requests from localhost
 * - Returns the auth token that the UI must include in WebSocket messages
 * - Uses same-origin policy to prevent token leakage
 */
export function createTokenEndpoint(token: string) {
  return (req: IncomingMessage, res: ServerResponse) => {
    // Always use the TCP socket's remote address, never the Host header, which
    // can be spoofed by a remote attacker sending `Host: localhost` to a server
    // bound on 0.0.0.0.
    const remoteAddr: string = (req.socket as Socket)?.remoteAddress ?? ''

    const isLocal =
      remoteAddr === '127.0.0.1' ||
      remoteAddr === '::1' ||
      remoteAddr === '::ffff:127.0.0.1' // IPv4-mapped on dual-stack Node socket

    if (!isLocal) {
      res.writeHead(403, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Forbidden: Token endpoint only available on localhost' }))
      return
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    })
    res.end(JSON.stringify({ token }))
  }
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example of how to integrate this into Vitest
 *
 * In your Vitest dev server setup:
 *
 * import { createServer } from 'http'
 * import { setupSecureWebSocket, generateAuthToken, createTokenEndpoint } from './websocket-setup'
 *
 * const httpServer = createServer()
 * const authToken = generateAuthToken()
 *
 * // Setup WebSocket with security
 * setupSecureWebSocket(httpServer, {
 *   authToken,
 *   requireOriginValidation: true,
 *   enableLogging: process.env.DEBUG_WEBSOCKET === 'true'
 * })
 *
 * // Setup token endpoint for UI
 * app.get('/__vitest_api_token__', createTokenEndpoint(authToken))
 *
 * // Start server
 * httpServer.listen(3000)
 */

export type { VitestMessage, WebSocketSecurityConfig }
