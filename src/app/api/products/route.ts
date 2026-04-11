import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Product from '@/models/Product';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const category = req.nextUrl.searchParams.get('category');
    const search = req.nextUrl.searchParams.get('search');

    const query: any = {};
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };

    const products = await Product.find(query).sort({ createdAt: -1 });
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

    await dbConnect();
    const data = await req.json();
    const product = await Product.create(data);
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
