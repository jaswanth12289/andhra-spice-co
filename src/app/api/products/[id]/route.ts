import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const productRef = doc(db, 'products', id);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id: productSnap.id, ...productSnap.data() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (payload?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const data = await req.json();
    
    const productRef = doc(db, 'products', id);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await updateDoc(productRef, { ...data, updatedAt: new Date().toISOString() });
    
    const updated = await getDoc(productRef);
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (payload?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const productRef = doc(db, 'products', id);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deleteDoc(productRef);
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
