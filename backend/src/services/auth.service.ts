import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config/env';
import { LoginInput, RegisterInput, ChangePasswordInput } from '../schemas/auth.schema';
import { ApiError } from '../middleware/error';
import { Role } from '@prisma/client';

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Register a new user (admin-created, auto-approved)
   */
  async register(data: RegisterInput, approvedById?: string) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ApiError(409, 'Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user (auto-approved if created by admin)
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role as Role,
        isApproved: !!approvedById,
        approvedAt: approvedById ? new Date() : null,
        approvedById: approvedById || null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isApproved: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Public registration (requires admin approval)
   */
  async publicRegister(data: Omit<RegisterInput, 'role'>) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ApiError(409, 'Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user with pending approval status
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        role: 'PLAYER', // Default role for public registration
        isApproved: false,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isApproved: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Login user and return JWT token
   */
  async login(data: LoginInput): Promise<{ user: any; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        isApproved: true,
        player: { select: { id: true } },
      },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check if user is approved
    if (!user.isApproved) {
      throw new ApiError(403, 'Your account is pending approval. Please wait for an administrator to approve your registration.');
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Return user without password hash
    const { passwordHash, isApproved, ...safeUser } = user;
    return {
      user: {
        ...safeUser,
        playerId: user.player?.id || null,
      },
      token,
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, data: ChangePasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
          },
        },
        coachedTeams: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                shortName: true,
              },
            },
            isHeadCoach: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }

  /**
   * Get all pending (unapproved) users - Admin only
   */
  async getPendingUsers() {
    return prisma.user.findMany({
      where: { isApproved: false },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Approve a user registration - Admin only
   */
  async approveUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.isApproved) {
      throw new ApiError(400, 'User is already approved');
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedById: adminId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isApproved: true,
        approvedAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Reject (delete) a pending user registration - Admin only
   */
  async rejectUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.isApproved) {
      throw new ApiError(400, 'Cannot reject an already approved user');
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User registration rejected' };
  }

  /**
   * Get all users with approval status - Admin only
   */
  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isApproved: true,
        approvedAt: true,
        createdAt: true,
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const authService = new AuthService();
