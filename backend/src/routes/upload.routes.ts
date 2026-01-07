import { Router, Response, Request } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/authorize';
import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/error';
import fs from 'fs';
import path from 'path';

const router = Router();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'logos');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/uploads/logo/:teamId
 * Upload a team logo
 */
router.post(
  '/logo/:teamId',
  authenticate,
  adminOnly,
  async (req: AuthenticatedRequest, res: Response) => {
    const { teamId } = req.params;
    
    // Verify team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    // Check content type
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data
      await handleMultipartUpload(req, res, teamId, team.shortName);
    } else if (ALLOWED_TYPES.includes(contentType)) {
      // Handle raw binary upload
      await handleRawUpload(req, res, teamId, team.shortName, contentType);
    } else {
      throw new ApiError(400, 'Invalid content type. Use multipart/form-data or send image directly.');
    }
  }
);

/**
 * Handle raw binary image upload
 */
async function handleRawUpload(
  req: Request,
  res: Response,
  teamId: string,
  teamShortName: string,
  contentType: string
) {
  const chunks: Buffer[] = [];
  let totalSize = 0;

  req.on('data', (chunk: Buffer) => {
    totalSize += chunk.length;
    if (totalSize > MAX_FILE_SIZE) {
      throw new ApiError(400, 'File too large. Maximum size is 5MB.');
    }
    chunks.push(chunk);
  });

  req.on('end', async () => {
    const buffer = Buffer.concat(chunks);
    
    if (buffer.length === 0) {
      res.status(400).json({ error: 'No file data received' });
      return;
    }

    // Determine file extension
    const ext = getExtensionFromMime(contentType);
    const filename = `${teamShortName.toLowerCase()}-${Date.now()}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    // Save file
    fs.writeFileSync(filepath, buffer);

    // Update team with logo URL
    const logoUrl = `/uploads/logos/${filename}`;
    await prisma.team.update({
      where: { id: teamId },
      data: { logoUrl },
    });

    res.json({ logoUrl, message: 'Logo uploaded successfully' });
  });

  req.on('error', () => {
    res.status(500).json({ error: 'Upload failed' });
  });
}

/**
 * Handle multipart form data upload (simplified - for production use multer)
 */
async function handleMultipartUpload(
  req: Request,
  res: Response,
  teamId: string,
  teamShortName: string
) {
  const chunks: Buffer[] = [];
  let totalSize = 0;

  req.on('data', (chunk: Buffer) => {
    totalSize += chunk.length;
    if (totalSize > MAX_FILE_SIZE) {
      throw new ApiError(400, 'File too large. Maximum size is 5MB.');
    }
    chunks.push(chunk);
  });

  req.on('end', async () => {
    const buffer = Buffer.concat(chunks);
    const boundary = getBoundary(req.headers['content-type'] || '');
    
    if (!boundary) {
      res.status(400).json({ error: 'Invalid multipart boundary' });
      return;
    }

    // Parse multipart data (simplified)
    const { fileBuffer, mimeType, originalName } = parseMultipart(buffer, boundary);
    
    if (!fileBuffer || fileBuffer.length === 0) {
      res.status(400).json({ error: 'No file found in upload' });
      return;
    }

    if (!ALLOWED_TYPES.includes(mimeType)) {
      res.status(400).json({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG' });
      return;
    }

    // Determine file extension
    const ext = getExtensionFromMime(mimeType) || path.extname(originalName);
    const filename = `${teamShortName.toLowerCase()}-${Date.now()}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    // Save file
    fs.writeFileSync(filepath, fileBuffer);

    // Update team with logo URL
    const logoUrl = `/uploads/logos/${filename}`;
    await prisma.team.update({
      where: { id: teamId },
      data: { logoUrl },
    });

    res.json({ logoUrl, message: 'Logo uploaded successfully' });
  });
}

/**
 * DELETE /api/uploads/logo/:teamId
 * Remove a team logo
 */
router.delete(
  '/logo/:teamId',
  authenticate,
  adminOnly,
  async (req: AuthenticatedRequest, res: Response) => {
    const { teamId } = req.params;
    
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    // Delete file if exists
    if (team.logoUrl) {
      const filename = path.basename(team.logoUrl);
      const filepath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }

    // Update team
    await prisma.team.update({
      where: { id: teamId },
      data: { logoUrl: null },
    });

    res.json({ message: 'Logo removed successfully' });
  }
);

// Helper functions
function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  };
  return mimeToExt[mimeType] || '.png';
}

function getBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  return match ? (match[1] || match[2]) : null;
}

function parseMultipart(buffer: Buffer, boundary: string): { fileBuffer: Buffer; mimeType: string; originalName: string } {
  const content = buffer.toString('binary');
  const parts = content.split(`--${boundary}`);
  
  for (const part of parts) {
    if (part.includes('Content-Disposition') && part.includes('filename=')) {
      // Extract filename
      const filenameMatch = part.match(/filename="([^"]+)"/);
      const originalName = filenameMatch ? filenameMatch[1] : 'upload';
      
      // Extract content type
      const typeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
      const mimeType = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';
      
      // Extract file content (after double CRLF)
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const fileContent = part.slice(headerEnd + 4).replace(/\r\n--$/, '').replace(/--$/, '');
        const fileBuffer = Buffer.from(fileContent, 'binary');
        return { fileBuffer, mimeType, originalName };
      }
    }
  }
  
  return { fileBuffer: Buffer.alloc(0), mimeType: '', originalName: '' };
}

export default router;
