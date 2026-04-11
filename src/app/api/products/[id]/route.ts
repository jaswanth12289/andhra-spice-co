import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Product from '@/models/Product';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
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

    await dbConnect();
    const { id } = await params;
    const data = await req.json();
    const product = await Product.findByIdAndUpdate(id, data, { new: true });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
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

    await dbConnect();
    const { id } = await params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
