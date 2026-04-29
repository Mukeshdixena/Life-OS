import { Controller, Post, Body, ConflictException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    const { name, email, password } = body;

    if (!name || !email || !password) {
      throw new BadRequestException('name, email and password are required');
    }

    try {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new ConflictException('Email already registered');
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await this.prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
          settings: true,
          createdAt: true,
        }
      });

      const token = this.jwtService.sign({ id: user.id, email: user.email, name: user.name });

      return { token, user };
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      console.error('Register error:', err);
      throw new InternalServerErrorException('Server error during registration');
    }
  }

  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }

    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const valid = await bcrypt.compare(password, user.passwordHash);

      if (!valid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const { passwordHash, ...safeUser } = user;
      const token = this.jwtService.sign({ id: user.id, email: user.email, name: user.name });

      return { token, user: safeUser };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      console.error('Login error:', err);
      throw new InternalServerErrorException('Server error during login');
    }
  }
}
