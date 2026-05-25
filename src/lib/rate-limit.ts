import { prisma } from './prisma';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  'otp-request': { windowMs: 60 * 1000, maxRequests: 1 }, // 1 per minute
  'otp-verify': { windowMs: 5 * 60 * 1000, maxRequests: 5 }, // 5 per 5 minutes
  'login': { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 per 15 minutes
  'register': { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  'ml-check': { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  'ai-chat': { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
  'ai-tool': { windowMs: 60 * 1000, maxRequests: 20 }, // 20 per minute
  'api': { windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute
};

export async function checkRateLimit(
  identifier: string,
  endpoint: string
): Promise<{ allowed: boolean; remainingRequests: number; resetAt: Date }> {
  const config = rateLimitConfigs[endpoint] || rateLimitConfigs['api'];
  const now = new Date();
  
  // Clean up expired rate limits
  await prisma.rateLimit.deleteMany({
    where: {
      resetAt: { lt: now },
    },
  });
  
  const existing = await prisma.rateLimit.findUnique({
    where: {
      identifier_endpoint: {
        identifier,
        endpoint,
      },
    },
  });
  
  if (!existing) {
    // Create new rate limit entry
    const resetAt = new Date(now.getTime() + config.windowMs);
    await prisma.rateLimit.create({
      data: {
        identifier,
        endpoint,
        count: 1,
        resetAt,
      },
    });
    
    return {
      allowed: true,
      remainingRequests: config.maxRequests - 1,
      resetAt,
    };
  }
  
  if (existing.resetAt < now) {
    // Reset expired window
    const resetAt = new Date(now.getTime() + config.windowMs);
    await prisma.rateLimit.update({
      where: { id: existing.id },
      data: {
        count: 1,
        resetAt,
      },
    });
    
    return {
      allowed: true,
      remainingRequests: config.maxRequests - 1,
      resetAt,
    };
  }
  
  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetAt: existing.resetAt,
    };
  }
  
  // Increment count
  await prisma.rateLimit.update({
    where: { id: existing.id },
    data: {
      count: existing.count + 1,
    },
  });
  
  return {
    allowed: true,
    remainingRequests: config.maxRequests - existing.count - 1,
    resetAt: existing.resetAt,
  };
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}

export function parseDeviceInfo(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    if (ua.includes('android')) return 'Android Mobile';
    if (ua.includes('iphone')) return 'iPhone';
    return 'Mobile Device';
  }
  
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'Tablet';
  }
  
  if (ua.includes('windows')) return 'Windows PC';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'Mac';
  if (ua.includes('linux')) return 'Linux';
  
  return 'Unknown Device';
}
