import fs from 'fs/promises';
import path from 'path';
import { Storage } from './interface.js';

/**
 * Filesystem Storage Adapter
 * 
 * For local development and simple deployments.
 * Stores encrypted blobs as files in a directory.
 */
export class FilesystemStorage implements Storage {
  private basePath: string;
  
  constructor(basePath?: string) {
    this.basePath = basePath || process.env.FS_STORAGE_PATH || './data/notes';
    this.ensureDirectory();
  }
  
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directory:', error);
      throw error;
    }
  }
  
  private getFilePath(id: string): string {
    // Sanitize ID to prevent directory traversal
    const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(this.basePath, `${sanitizedId}.enc`);
  }
  
  async get(id: string): Promise<Buffer | null> {
    try {
      // Check if note has expired
      const expired = await this.hasExpired(id);
      if (expired) {
        // Delete the expired note
        await this.delete(id);
        return null;
      }

      const filePath = this.getFilePath(id);
      const data = await fs.readFile(filePath);
      return data;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  async set(id: string, blob: Buffer, ttlSeconds?: number): Promise<void> {
    const filePath = this.getFilePath(id);
    await fs.writeFile(filePath, blob);
    
    // For filesystem, TTL is handled by a separate cleanup job
    // In production, use Redis for proper TTL support
    if (ttlSeconds) {
      // Store expiration time in a metadata file
      const metaPath = `${filePath}.meta`;
      const expiration = Date.now() + (ttlSeconds * 1000);
      await fs.writeFile(metaPath, JSON.stringify({ expires: expiration }));
    }
  }
  
  async delete(id: string): Promise<void> {
    try {
      const filePath = this.getFilePath(id);
      await fs.unlink(filePath);
      
      // Also delete metadata if exists
      try {
        await fs.unlink(`${filePath}.meta`);
      } catch {
        // Ignore if no metadata file
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  async exists(id: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(id);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a stored note has expired
   */
  async hasExpired(id: string): Promise<boolean> {
    const metaPath = `${this.getFilePath(id)}.meta`;
    try {
      const metaData = await fs.readFile(metaPath, 'utf-8');
      const { expires } = JSON.parse(metaData);
      return Date.now() > expires;
    } catch {
      // If no metadata file, assume not expired
      return false;
    }
  }

  /**
   * Clean up expired notes from filesystem
   * @returns Number of deleted notes
   */
  async cleanupExpired(): Promise<number> {
    try {
      const files = await fs.readdir(this.basePath);
      const noteFiles = files.filter(f => f.endsWith('.enc') && !f.endsWith('.meta'));

      let deletedCount = 0;
      for (const file of noteFiles) {
        const id = file.replace('.enc', '');
        const hasExpired = await this.hasExpired(id);

        if (hasExpired) {
          await this.delete(id);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error during cleanup:', error);
      return 0;
    }
  }
}