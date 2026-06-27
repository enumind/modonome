/**
 * Security tests for Vitest path traversal vulnerability fixes
 *
 * These tests verify:
 * 1. The vulnerability can be detected
 * 2. The fix prevents the attacks
 * 3. Legitimate paths still work
 * 4. Edge cases are handled
 */

import { describe, it, expect } from 'vitest'
import {
  validateFilePath,
  isLocalhost,
  sanitizePathForLog,
  getFileExtension,
  isTestFile,
  isSnapshotFile,
  validateFilePaths,
} from './vitest-path-validation-utils'

// ============================================================================
// Basic Path Validation Tests
// ============================================================================

describe('Path Validation - Basic', () => {
  const baseDir = '/home/user/project'

  it('should accept valid relative paths', () => {
    const path = validateFilePath('src/test.ts', baseDir)
    expect(path).toBe('/home/user/project/src/test.ts')
  })

  it('should accept nested relative paths', () => {
    const path = validateFilePath('src/components/test.ts', baseDir)
    expect(path).toBe('/home/user/project/src/components/test.ts')
  })

  it('should accept paths with current directory notation', () => {
    const path = validateFilePath('./src/test.ts', baseDir)
    expect(path).toBe('/home/user/project/src/test.ts')
  })

  it('should reject empty paths', () => {
    expect(() => validateFilePath('', baseDir)).toThrow('empty')
  })

  it('should reject null/undefined paths', () => {
    expect(() => validateFilePath(null as any, baseDir)).toThrow('non-empty string')
    expect(() => validateFilePath(undefined as any, baseDir)).toThrow('non-empty string')
  })

  it('should reject paths with null bytes', () => {
    expect(() => validateFilePath('test.ts\0.js', baseDir)).toThrow('null bytes')
  })

  it('should reject paths with control characters', () => {
    expect(() => validateFilePath('test.ts\n.js', baseDir)).toThrow('control characters')
    expect(() => validateFilePath('test.ts\r.js', baseDir)).toThrow('control characters')
  })
})

// ============================================================================
// Directory Traversal Attack Tests
// ============================================================================

describe('Path Validation - Directory Traversal Prevention', () => {
  const baseDir = '/home/user/project'

  describe('Basic traversal attacks', () => {
    it('should reject simple parent directory traversal (..)', () => {
      expect(() => validateFilePath('..', baseDir)).toThrow('outside')
    })

    it('should reject parent directory traversal (./../)', () => {
      expect(() => validateFilePath('../secret.txt', baseDir)).toThrow('outside')
    })

    it('should reject multiple parent directory traversal (../../)', () => {
      expect(() => validateFilePath('../../etc/passwd', baseDir)).toThrow('outside')
    })

    it('should reject traversal with dots in middle', () => {
      expect(() => validateFilePath('src/../../secret.txt', baseDir)).toThrow('outside')
    })

    it('should reject traversal with many dots', () => {
      expect(() => validateFilePath('.../../.../../secret.txt', baseDir)).toThrow('outside')
    })
  })

  describe('Encoded traversal attacks', () => {
    it('should reject URL-encoded parent directory', () => {
      // Note: input should be decoded before validation
      const decoded = decodeURIComponent('%2e%2e%2fsecret')
      expect(() => validateFilePath(decoded, baseDir)).toThrow('outside')
    })

    it('should reject double URL-encoded parent directory', () => {
      const decoded = decodeURIComponent('%252e%252e%252fsecret')
      expect(() => validateFilePath(decoded, baseDir)).toThrow('outside')
    })
  })

  describe('Case variation attacks', () => {
    it('should preserve case on case-sensitive filesystems (Unix)', () => {
      // On Linux path.normalize does not lowercase: the resolved path keeps the original case
      const result = validateFilePath('SRC/TEST.TS', baseDir)
      expect(result).toBe('/home/user/project/SRC/TEST.TS')
    })
  })

  describe('Backslash attacks (Windows)', () => {
    it('should reject absolute paths from Windows', () => {
      expect(() =>
        validateFilePath('C:\\Windows\\System32', baseDir, { platform: 'win32' })
      ).toThrow('Absolute paths')
    })

    it('should normalize Windows backslashes', () => {
      const path = validateFilePath('src\\test.ts', baseDir, { platform: 'win32' })
      expect(path).toContain('src')
      expect(path).toContain('test.ts')
    })

    it('should reject Windows parent traversal', () => {
      expect(() =>
        validateFilePath('..\\..\\secret.txt', baseDir, { platform: 'win32' })
      ).toThrow('outside')
    })
  })
})

// ============================================================================
// Windows-Specific Attacks
// ============================================================================

describe('Windows Path Traversal Attacks', () => {
  const baseDir = 'C:\\Users\\user\\project'

  it('should reject UNC path with wildcard (\\\\?\\)', () => {
    expect(() =>
      validateFilePath('\\\\?\\C:\\Windows\\secret.txt', baseDir, { platform: 'win32' })
    ).toThrow()
  })

  it('should reject local device path (\\\\.\\ )', () => {
    expect(() =>
      validateFilePath('\\\\.\\C:\\Windows\\secret.txt', baseDir, { platform: 'win32' })
    ).toThrow()
  })

  it('should reject reserved device names (CON)', () => {
    expect(() =>
      validateFilePath('CON', baseDir, { platform: 'win32' })
    ).toThrow('reserved device')
  })

  it('should reject reserved device names (LPT1)', () => {
    expect(() =>
      validateFilePath('LPT1', baseDir, { platform: 'win32' })
    ).toThrow('reserved device')
  })

  it('should reject cross-drive access on Windows', () => {
    expect(() =>
      validateFilePath('test.ts', 'C:\\project', { platform: 'win32', allowAbsolute: true })
    ).not.toThrow()

    // But this should fail
    const baseDrive = 'C:\\project'
    const crossDrive = 'D:\\secret.txt'
    expect(() => {
      validateFilePath(crossDrive, baseDrive, {
        platform: 'win32',
        allowAbsolute: true
      })
    }).toThrow('Cross-drive')
  })

  it('should handle Windows long path names', () => {
    // Windows allows paths up to 260 chars (or longer with special prefix)
    const longPath = 'a'.repeat(100) + '.ts'
    const path = validateFilePath(longPath, baseDir, { platform: 'win32' })
    expect(path).toContain('a'.repeat(100))
  })
})

// ============================================================================
// Absolute Path Tests
// ============================================================================

describe('Absolute Path Handling', () => {
  const baseDir = '/home/user/project'

  it('should reject absolute paths by default', () => {
    expect(() => validateFilePath('/etc/passwd', baseDir)).toThrow('Absolute paths')
  })

  it('should accept absolute paths when allowed', () => {
    const path = validateFilePath('/home/user/project/test.ts', baseDir, {
      allowAbsolute: true
    })
    expect(path).toBe('/home/user/project/test.ts')
  })

  it('should reject absolute paths outside base when allowAbsolute=true', () => {
    // When allowAbsolute is true, still need to validate it's in allowed dirs
    expect(() =>
      validateFilePath('/etc/passwd', baseDir, {
        allowAbsolute: true,
        allowedDirs: [baseDir]
      })
    ).toThrow('outside')
  })
})

// ============================================================================
// Allowed Directories Tests
// ============================================================================

describe('Allowed Directories Validation', () => {
  const baseDir = '/home/user/project'

  it('should validate against allowed directories list', () => {
    const allowedDirs = [
      '/home/user/project',
      '/tmp/test-files'
    ]

    // Should accept paths in allowed dirs
    const path1 = validateFilePath('src/test.ts', baseDir, { allowedDirs })
    expect(path1).toContain('project')

    // Should still reject paths outside allowed dirs
    expect(() => {
      validateFilePath('../../../etc/passwd', baseDir, { allowedDirs })
    }).toThrow('outside')
  })

  it('should normalize allowed directories before checking', () => {
    const allowedDirs = [
      '/home/user/project/',
      '/home/user/./project'
    ]

    const path = validateFilePath('test.ts', baseDir, { allowedDirs })
    expect(path).toContain('project')
  })
})

// ============================================================================
// Path Length Validation
// ============================================================================

describe('Path Length Validation', () => {
  const baseDir = '/home/user/project'

  it('should reject paths exceeding maximum length', () => {
    const longPath = 'a'.repeat(5000)
    expect(() =>
      validateFilePath(longPath, baseDir, { maxLength: 4096 })
    ).toThrow('exceeds maximum')
  })

  it('should accept paths within maximum length', () => {
    const path = 'a'.repeat(100) + '.ts'
    const result = validateFilePath(path, baseDir, { maxLength: 4096 })
    expect(result).toBeDefined()
  })
})

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('isLocalhost', () => {
    it('should recognize localhost', () => {
      expect(isLocalhost('localhost')).toBe(true)
      expect(isLocalhost('localhost:3000')).toBe(true)
    })

    it('should recognize 127.0.0.1', () => {
      expect(isLocalhost('127.0.0.1')).toBe(true)
      expect(isLocalhost('127.0.0.1:8080')).toBe(true)
    })

    it('should recognize IPv6 loopback', () => {
      expect(isLocalhost('::1')).toBe(true)
      expect(isLocalhost('[::1]')).toBe(true)
      expect(isLocalhost('[::1]:3000')).toBe(true)
    })

    it('should reject remote addresses', () => {
      expect(isLocalhost('192.168.1.1')).toBe(false)
      expect(isLocalhost('example.com')).toBe(false)
      expect(isLocalhost('attacker.com')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isLocalhost('')).toBe(false)
      expect(isLocalhost(null as any)).toBe(false)
      expect(isLocalhost(undefined as any)).toBe(false)
    })
  })

  describe('sanitizePathForLog', () => {
    it('should mask middle of long paths', () => {
      const original = '/very/long/path/to/some/file/test.ts'
      const sanitized = sanitizePathForLog(original)
      expect(sanitized).toContain('...')
      expect(sanitized).not.toContain('some')
    })

    it('should preserve short paths', () => {
      const original = '/home/test.ts'
      const sanitized = sanitizePathForLog(original)
      expect(sanitized).toBe(original)
    })
  })

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('test.ts')).toBe('ts')
      expect(getFileExtension('test.js')).toBe('js')
      expect(getFileExtension('test.test.ts')).toBe('ts')
    })

    it('should handle no extension', () => {
      expect(getFileExtension('Dockerfile')).toBe('')
    })

    it('should be case-insensitive', () => {
      expect(getFileExtension('test.TS')).toBe('ts')
      expect(getFileExtension('test.TsX')).toBe('tsx')
    })
  })

  describe('isTestFile', () => {
    it('should recognize test files', () => {
      expect(isTestFile('test.ts')).toBe(false)   // plain .ts without .test/.spec is not a test file
      expect(isTestFile('test.test.ts')).toBe(true)
      expect(isTestFile('test.spec.ts')).toBe(true)
      expect(isTestFile('foo.test.js')).toBe(true)
    })

    it('should reject non-test files', () => {
      expect(isTestFile('index.ts')).toBe(false)
      expect(isTestFile('helper.js')).toBe(false)
      expect(isTestFile('test.txt')).toBe(false)
    })
  })

  describe('isSnapshotFile', () => {
    it('should recognize snapshot files', () => {
      expect(isSnapshotFile('src/__snapshots__/test.snap')).toBe(true)
      expect(isSnapshotFile('src/__snapshots__/test.snap.js')).toBe(true)
    })

    it('should reject non-snapshot files', () => {
      expect(isSnapshotFile('src/test.ts')).toBe(false)
      expect(isSnapshotFile('snapshots/test.snap')).toBe(false)
    })
  })
})

// ============================================================================
// Batch Validation Tests
// ============================================================================

describe('Batch Path Validation', () => {
  const baseDir = '/home/user/project'

  it('should validate multiple paths', () => {
    const paths = ['src/test1.ts', 'src/test2.ts', 'test.ts']
    const result = validateFilePaths(paths, baseDir)

    expect(result).toHaveLength(3)
    expect(result[0]).toContain('test1.ts')
  })

  it('should throw on first invalid path in batch', () => {
    const paths = ['src/test.ts', '../secret.txt']
    expect(() => validateFilePaths(paths, baseDir)).toThrow('outside')
  })
})

// ============================================================================
// Real-World Attack Scenarios
// ============================================================================

describe('Real-World Attack Scenarios', () => {
  const projectRoot = '/var/www/app'

  it('should prevent reading /etc/passwd on Unix', () => {
    expect(() =>
      validateFilePath('../../../../etc/passwd', projectRoot)
    ).toThrow('outside')
  })

  it('should prevent reading Windows system files', () => {
    const winProjectRoot = 'C:\\app'
    expect(() =>
      validateFilePath('..\\..\\Windows\\System32\\config\\SAM', winProjectRoot, {
        platform: 'win32'
      })
    ).toThrow('outside')
  })

  it('should prevent reading .env files outside project', () => {
    expect(() =>
      validateFilePath('../../../.env', projectRoot)
    ).toThrow('outside')
  })

  it('should prevent reading node_modules outside project', () => {
    expect(() =>
      validateFilePath('../../../node_modules/malicious/index.js', projectRoot)
    ).toThrow('outside')
  })

  it('should prevent reading source control files', () => {
    expect(() =>
      validateFilePath('../../.git/config', projectRoot)
    ).toThrow('outside')
  })

  it('should prevent the PoC path traversal attack', () => {
    // From the security advisory
    const pocPath = 'C:\\project\\?\\..\\..\\secret.txt'
    expect(() =>
      validateFilePath(pocPath, 'C:\\project', { platform: 'win32' })
    ).toThrow()
  })
})
