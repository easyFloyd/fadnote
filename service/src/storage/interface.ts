/**
 * Storage Interface
 *
 * Abstracts the underlying storage mechanism (Redis, Filesystem, KV, etc.)
 * Allows the same business logic to run on different platforms.
 */

export interface Storage {
  /**
   * Retrieve an encrypted blob by ID
   * @param id - The unique identifier for the stored blob
   * @returns The blob if found, null if not found or already deleted
   */
  get(id: string): Promise<Buffer | null>;

  /**
   * Store an encrypted blob
   * @param id - The unique identifier
   * @param blob - The encrypted data
   * @param ttlSeconds - Time-to-live in seconds (optional)
   */
  set(id: string, blob: Buffer, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a blob by ID
   * @param id - The unique identifier
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a blob exists
   * @param id - The unique identifier
   */
  exists(id: string): Promise<boolean>;

  /**
   * Health check - verify storage connectivity
   * @throws Error if storage is not accessible
   */
  ping(): Promise<void>;
}