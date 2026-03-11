import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../types';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token required' });
        return;
      }

      const result = await authService.refreshToken(refreshToken);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!.userId);
      res.json(user);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
}

export const authController = new AuthController();
