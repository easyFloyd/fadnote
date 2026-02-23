/**
 * Validation utilities
 */
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

/**
 * Validate note ID format (must be UUID v4)
 * @param id - The ID to validate
 * @returns true if valid UUID v4, false otherwise
 */
export function isValidId(id: string): boolean {
  return uuidValidate(id) && uuidVersion(id) === 4;
}
