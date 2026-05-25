import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: error.message || "Database connection failed",
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}
