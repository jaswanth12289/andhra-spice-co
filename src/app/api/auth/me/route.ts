import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function GET(req: Request) {
  const token = req.headers.get('cookie')?.split('token=')[1]?.split(';')[0];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  await dbConnect();
  const dbUser = await User.findById(payload.userId);
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ 
    user: { 
      id: dbUser._id, 
      name: dbUser.name, 
      role: dbUser.role, 
      email: dbUser.email 
    } 
  });
}
