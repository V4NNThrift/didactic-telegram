import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkMLAccount, validateMLInput } from '@/lib/ml-checker';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const ip = getClientIP(request);
    const rateLimitResult = await checkRateLimit(`${session.userId}-ml`, 'ml-check');
    
    if (!rateLimitResult.allowed) {
      const waitSeconds = Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Terlalu banyak request. Tunggu ${waitSeconds} detik.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { userId, serverId } = body;

    // Validate input
    const validation = validateMLInput(userId, serverId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check ML account
    const checkResult = await checkMLAccount(
      userId.trim(),
      serverId.trim(),
      `${session.userId}-${ip}`
    );

    // Save to database
    const logEntry = await prisma.mlCheckLog.create({
      data: {
        userId: session.userId,
        mlUserId: userId.trim(),
        mlServerId: serverId.trim(),
        nickname: checkResult.success ? checkResult.data?.nickname || null : null,
        status: checkResult.success ? 'success' : 'not_found',
        responseJson: checkResult.success ? JSON.stringify(checkResult.data) : null,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.userId,
        type: 'ml_check',
        action: `Checked ML account ${userId}(${serverId})`,
        metadata: JSON.stringify({
          mlUserId: userId,
          mlServerId: serverId,
          success: checkResult.success,
        }),
      },
    });

    if (!checkResult.success) {
      return NextResponse.json({
        result: {
          id: logEntry.id,
          mlUserId: logEntry.mlUserId,
          mlServerId: logEntry.mlServerId,
          nickname: null,
          status: 'not_found',
          responseJson: null,
          createdAt: logEntry.createdAt.toISOString(),
        },
        error: checkResult.error,
      });
    }

    return NextResponse.json({
      result: {
        id: logEntry.id,
        mlUserId: logEntry.mlUserId,
        mlServerId: logEntry.mlServerId,
        nickname: checkResult.data?.nickname,
        status: 'success',
        responseJson: JSON.stringify(checkResult.data, null, 2),
        createdAt: logEntry.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('ML check error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
