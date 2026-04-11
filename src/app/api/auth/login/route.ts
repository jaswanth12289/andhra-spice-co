import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

function isRateLimited(ip: string): boolean {
  const limit = 5;
  const windowMs = 60 * 1000;
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (record) {
    if (now - record.timestamp < windowMs) {
      if (record.count >= limit) return true;
      record.count += 1;
      return false;
    }
  }
  
  rateLimitMap.set(ip, { count: 1, timestamp: now });
  return false;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    await dbConnect();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signToken({ userId: user._id.toString(), role: user.role, email: user.email });

    const response = NextResponse.json({ message: 'Logged in', user: { id: user._id, name: user.name, role: user.role, email: user.email } }, { status: 200 });
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
