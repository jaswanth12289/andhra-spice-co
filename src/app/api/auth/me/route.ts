import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(req: Request) {
  const token = req.headers.get('cookie')?.split('token=')[1]?.split(';')[0];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const userRef = doc(db, 'users', payload.userId as string);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const dbUser = userSnap.data();

  return NextResponse.json({ 
    user: { 
      id: userSnap.id, 
      name: dbUser.name, 
      role: dbUser.role, 
      email: dbUser.email,
      phoneNumber: dbUser.phoneNumber
    } 
  });
}
