import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { collection, query, where, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';

const FIREBASE_API_KEY = 'AIzaSyDPqnVzbrdcx-ISu0mWcyLNkq5FvbW8sCQ';

// Admin email - first login from this email gets admin role
const ADMIN_EMAILS = ['2300031385ird@gmail.com', 'jaswanthsatuluri@gmail.com'];

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

    const { firebaseToken, name } = await req.json();

    if (!firebaseToken) {
      return NextResponse.json({ error: 'Missing authentication token' }, { status: 400 });
    }

    // Securely verify the Firebase token against Google's servers
    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: firebaseToken })
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.users || verifyData.users.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired Firebase authentication' }, { status: 401 });
    }

    const authUser = verifyData.users[0];
    const email = authUser.email;
    const displayName = authUser.displayName || name || 'Spice Enthusiast';

    // Check if user exists in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    let userId: string;
    let userData: any;

    if (snapshot.empty) {
      // Auto-assign admin role if the email matches
      const role = ADMIN_EMAILS.includes(email) ? 'admin' : 'user';
      
      const newUser = {
        name: displayName,
        email,
        role,
        phoneNumber: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(usersRef, newUser);
      userId = docRef.id;
      userData = { id: userId, ...newUser };
    } else {
      const userDoc = snapshot.docs[0];
      userId = userDoc.id;
      userData = { id: userId, ...userDoc.data() };
    }

    // Issue our secure local JWT
    const token = await signToken({ userId, role: userData.role, email: userData.email });

    const response = NextResponse.json({ 
      message: 'Logged in', 
      user: { id: userId, name: userData.name, role: userData.role, email: userData.email } 
    }, { status: 200 });
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
