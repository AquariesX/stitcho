import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);
        if (isNaN(id)) {
            return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
        }

        const design = await (prisma as any).design.findUnique({
            where: { id },
            include: { category: true }
        });

        if (!design) {
            return NextResponse.json({ success: false, error: 'Design not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: design });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);
        if (isNaN(id)) {
            return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
        }

        const data = await request.json();
        const { name, description, imageUrl, basePrice, categoryId } = data;

        if (!name || !categoryId) {
            return NextResponse.json({ success: false, error: 'Name and Category are required' }, { status: 400 });
        }

        const updatedDesign = await (prisma as any).design.update({
            where: { id },
            data: {
                name,
                description,
                imageUrl: imageUrl || '',
                basePrice: parseFloat(basePrice) || 0,
                categoryId: parseInt(categoryId)
            },
            include: { category: true }
        });

        return NextResponse.json({ success: true, data: updatedDesign });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ success: false, error: 'Design not found' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);
        if (isNaN(id)) {
            return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
        }

        await (prisma as any).design.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Design deleted successfully' });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ success: false, error: 'Design not found' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
