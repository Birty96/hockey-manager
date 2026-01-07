import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`);
  }
}

/**
 * Validation error
 */
export class ValidationError extends ApiError {
  constructor(message: string) {
    super(400, message);
  }
}

/**
 * Conflict error (e.g., duplicate entry, scheduling conflict)
 */
export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message);
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error in development
  if (config.isDev) {
    console.error('Error:', err);
  }
  
  // Handle known API errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }
  
  // Handle Prisma known errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        error: 'A record with this value already exists',
      });
      return;
    }
    
    // Foreign key constraint violation
    if (prismaError.code === 'P2003') {
      res.status(400).json({
        error: 'Referenced record does not exist',
      });
      return;
    }
    
    // Record not found
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        error: 'Record not found',
      });
      return;
    }
  }
  
  // Unknown error - don't leak details in production
  res.status(500).json({
    error: config.isDev ? err.message : 'Internal server error',
  });
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
}
