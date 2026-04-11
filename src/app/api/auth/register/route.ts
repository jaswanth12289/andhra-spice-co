import { NextResponse } from 'next/server';
import { db } from '@/lib/firestore';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

const FIREBASE_API_KEY = 'AIzaSyDPqnVzbrdcx-ISu0mWcyLNkq5FvbW8sCQ';

export async function POST(req: Request) {
  try {
    const { firebaseToken, name, phoneNumber } = await req.json();

    if (!firebaseToken || !name || !phoneNumber) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Securely verify Firebase token
    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: firebaseToken })
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.users || verifyData.users.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired Firebase authentication' }, { status: 401 });
    }

    const email = verifyData.users[0].email;

    // Check if user already exists in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return NextResponse.json({ error: 'User already exists. Please login.' }, { status: 400 });
    }

    await addDoc(usersRef, {
      name,
      email,
      phoneNumber,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ message: 'User created' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
