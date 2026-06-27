/**
 * Vitest API Path Validation Utilities
 *
 * Provides secure path validation to prevent directory traversal attacks
 * on all platforms, especially Windows UNC path exploits.
 */

import path from 'path'
const { resolve, normalize, relative, isAbsolute } = path

/**
 * Options for path validation
 */
export interface PathValidationOptions {
  /**
   * Allow absolute paths (risky, usually false)
   */
  allowAbsolute?: boolean

  /**
   * Allowed directories - path must be within one of these
   */
  allowedDirs?: string[]

  /**
   * Maximum path length (prevent ReDoS)
   */
  maxLength?: number

  /**
   * Platform override for testing
   */
  platform?: 'win32' | 'linux' | 'darwin'
}

/**
 * Safely normalize and validate a file path
 *
 * This function:
 * 1. Removes null bytes and dangerous characters
 * 2. Normalizes the path (handles .., ., //, \\)
 * 3. Resolves to absolute path
 * 4. Verifies it doesn't escape the base directory
 * 5. Checks platform-specific attacks (Windows UNC)
 *
 * @throws Error if path is invalid or outside allowed directory
 */
export function validateFilePath(
  inputPath: string | undefined | null,
  baseDir: string,
  options: PathValidationOptions = {}
): string {
  // =========================================================================
  // Input Validation
  // =========================================================================

  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Path must be a non-empty string')
  }

  if (inputPath.length === 0) {
    throw new Error('Path cannot be empty')
  }

  // Check maximum length (prevent ReDoS and resource exhaustion)
  const maxLength = options.maxLength ?? 4096
  if (inputPath.length > maxLength) {
    throw new Error(`Path exceeds maximum length of ${maxLength}`)
  }

  // =========================================================================
  // Remove Dangerous Characters
  // =========================================================================

  // Null bytes - used to bypass checks in C-based file operations
  if (inputPath.includes('\0')) {
    throw new Error('Path contains null bytes')
  }

  // Control characters
  if (inputPath.includes('\r') || inputPath.includes('\n')) {
    throw new Error('Path contains control characters')
  }

  // =========================================================================
  // Normalize the Path
  // =========================================================================

  const platform = options.platform || process.platform

  // Select the correct path module for the target platform so that unit tests
  // running on Linux with platform:'win32' exercise Windows path semantics.
  const pathMod = platform === 'win32' ? path.win32 : path.posix

  // First normalize separators and remove redundant slashes
  let normalizedPath = pathMod.normalize(inputPath)

  // On Windows, handle drive letters and UNC paths
  if (platform === 'win32') {
    // Remove Windows extended-length and device path prefixes BEFORE any
    // further processing (these bypass most kernel-level path checks).
    // \\?\ = extended-length path (skips MAX_PATH limit and most validation)
    // \\.\ = local device namespace (e.g. \\.\PhysicalDrive0)
    if (normalizedPath.startsWith('\\\\?\\') || normalizedPath.startsWith('\\\\?/')) {
      normalizedPath = normalizedPath.slice(4)
    }
    if (normalizedPath.startsWith('\\\\.\\') || normalizedPath.startsWith('\\\\./')) {
      normalizedPath = normalizedPath.slice(4)
    }

    // Detect Windows reserved device names.  Windows ignores extensions, so
    // NUL.txt and COM1.ts open the device, not a file.  Strip extension before
    // checking.
    const reservedNames = new Set([
      'CON', 'PRN', 'AUX', 'NUL',
      'COM0', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT0', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
    ])
    const rawFilename = normalizedPath.split(/[/\\]/).pop() || ''
    // Strip extension and any trailing dot (Windows ignores both)
    const stemOnly = rawFilename.split('.')[0].replace(/\.$/, '').toUpperCase()
    if (reservedNames.has(stemOnly)) {
      throw new Error(`Cannot access reserved device name: ${rawFilename}`)
    }

    // Detect Alternate Data Streams (file.txt:Zone.Identifier).
    // A colon that is NOT the drive-letter separator is an ADS indicator.
    const colonIdx = normalizedPath.indexOf(':')
    const isDriveLetter = colonIdx === 1 && /^[a-zA-Z]/.test(normalizedPath)
    if (colonIdx !== -1 && !isDriveLetter) {
      throw new Error('Alternate data stream access is not allowed')
    }
  }

  // =========================================================================
  // Resolve to Absolute Path
  // =========================================================================

  // Normalize base directory using the same platform-specific module
  const normalizedBase = pathMod.normalize(baseDir)
  const basePath = pathMod.resolve(normalizedBase)

  let resolvedPath: string

  // Determine if the input is absolute or relative
  if (pathMod.isAbsolute(normalizedPath)) {
    // Absolute path provided
    if (!options.allowAbsolute) {
      throw new Error('Absolute paths are not allowed for security reasons')
    }

    resolvedPath = pathMod.resolve(normalizedPath)
  } else {
    // Relative path - resolve relative to base
    resolvedPath = pathMod.resolve(basePath, normalizedPath)
  }

  // =========================================================================
  // Verify Path is Within Base Directory
  // =========================================================================

  // Get the relative path from base to resolved
  const relativePath = pathMod.relative(basePath, resolvedPath)

  // If relative path starts with .., it's outside the base directory
  if (relativePath.startsWith('..')) {
    throw new Error('Path traversal detected: resolved path is outside base directory')
  }

  // Additional security check: on Windows, verify no drive change
  if (platform === 'win32') {
    const baseDrive = basePath.charAt(1) === ':' ? basePath.charAt(0).toUpperCase() : null
    const resolvedDrive = resolvedPath.charAt(1) === ':' ? resolvedPath.charAt(0).toUpperCase() : null

    if (baseDrive && resolvedDrive && baseDrive !== resolvedDrive) {
      throw new Error('Cross-drive access is not allowed')
    }

    // Verify still on same drive after normalization
    if (baseDrive && !resolvedDrive) {
      throw new Error('Invalid path: missing drive letter')
    }
  }

  // =========================================================================
  // Validate Against Allowed Directories
  // =========================================================================

  if (options.allowedDirs && options.allowedDirs.length > 0) {
    const isAllowed = options.allowedDirs.some((allowedDir) => {
      const normalizedAllowed = normalize(allowedDir)
      const allowedPath = resolve(normalizedAllowed)

      // Check if resolved path is within allowed directory
      const rel = relative(allowedPath, resolvedPath)

      // Path is within allowed dir if relative path doesn't start with ..
      return !rel.startsWith('..')
    })

    if (!isAllowed) {
      throw new Error(
        `Path is not within allowed directories: ${options.allowedDirs.join(', ')}`
      )
    }
  }

  return resolvedPath
}

/**
 * Check if a host value represents a localhost address.
 *
 * Handles all common forms:
 *   127.0.0.1, 127.0.0.1:3000
 *   ::1, [::1], [::1]:3000
 *   ::ffff:127.0.0.1  (IPv4-mapped on dual-stack Node socket)
 *   localhost, localhost:3000
 */
export function isLocalhost(host: string | undefined): boolean {
  if (!host || typeof host !== 'string') {
    return false
  }

  let hostname = host.toLowerCase().trim()

  if (hostname.startsWith('[')) {
    // Bracketed IPv6 with optional port: [::1] or [::1]:3000
    hostname = hostname.replace(/^\[([^\]]+)\].*$/, '$1')
  } else if (hostname.includes(':') && !hostname.startsWith('::')) {
    // IPv4 with port: 127.0.0.1:3000
    hostname = hostname.split(':')[0]
  }
  // else: bare IPv6 (::1), bare IPv4, or plain hostname. Use as-is.

  const localhostAddresses = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1', // IPv4-mapped loopback on dual-stack Node sockets
  ])

  return localhostAddresses.has(hostname)
}

/**
 * Sanitize file path for logging (mask sensitive parts)
 */
export function sanitizePathForLog(filePath: string): string {
  // Keep only first and last 10 chars, mask the middle
  if (filePath.length <= 20) {
    return filePath
  }

  const start = filePath.substring(0, 10)
  const end = filePath.substring(filePath.length - 10)
  return `${start}...${end}`
}

/**
 * Get file extension safely
 */
export function getFileExtension(filePath: string): string {
  // Validate path first
  try {
    const basename = filePath.split(/[/\\]/).pop() || ''
    const parts = basename.split('.')
    if (parts.length > 1) {
      return parts.pop()!.toLowerCase()
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * Check if a file is a test file
 */
export function isTestFile(filePath: string): boolean {
  const ext = getFileExtension(filePath)
  const basename = filePath.split(/[/\\]/).pop() || ''

  // Test file patterns
  const isTestPattern =
    basename.includes('.test.') ||
    basename.includes('.spec.') ||
    basename.endsWith('.test') ||
    basename.endsWith('.spec')

  const isScriptFile = ['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'].includes(ext)

  return isTestPattern && isScriptFile
}

/**
 * Check if a file is a snapshot file
 */
export function isSnapshotFile(filePath: string): boolean {
  return filePath.includes('__snapshots__') && (filePath.endsWith('.snap') || filePath.endsWith('.snap.js'))
}

/**
 * Validate multiple paths
 */
export function validateFilePaths(
  paths: string[],
  baseDir: string,
  options?: PathValidationOptions
): string[] {
  return paths.map((path) => validateFilePath(path, baseDir, options))
}

/**
 * Create a path validator with preset options
 */
export function createPathValidator(baseDir: string, options?: PathValidationOptions) {
  return (filePath: string) => validateFilePath(filePath, baseDir, options)
}

// ============================================================================
// Export types
// ============================================================================

export type { PathValidationOptions }
