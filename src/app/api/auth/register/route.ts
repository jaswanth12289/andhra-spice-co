import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { name, email, password, phoneNumber } = await req.json();

    if (!name || !email || !password || !phoneNumber) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber
    });

    return NextResponse.json({ message: 'User created' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
