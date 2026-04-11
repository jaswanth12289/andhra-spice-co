import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get('category');
    const search = req.nextUrl.searchParams.get('search');

    const productsRef = collection(db, 'products');
    let q;
    
    if (category) {
      q = query(productsRef, where('category', '==', category), orderBy('createdAt', 'desc'));
    } else {
      q = query(productsRef, orderBy('createdAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Client-side search filter (Firestore doesn't support regex)
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter((p: any) => p.name?.toLowerCase().includes(searchLower));
    }

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (payload?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const data = await req.json();
    const productsRef = collection(db, 'products');
    
    const productData = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(productsRef, productData);
    return NextResponse.json({ id: docRef.id, ...productData }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
