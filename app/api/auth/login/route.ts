import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cache, cacheKeys, rateLimit } from '@/lib/redis'

/**
 * POST /api/auth/login
 * Authenticate user with PIN
 */
export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    if (!pin || pin.length !== 4) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid PIN format',
        },
        { status: 400 }
      )
    }

    // Check rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const allowed = await rateLimit.checkLimit(ip, '/auth/login', 5, 300) // 5 attempts per 5 minutes

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts. Try again later.',
        },
        { status: 429 }
      )
    }

    // Try cache first
    const cachedUser = await cache.get(cacheKeys.userByPin(pin))
    if (cachedUser) {
      return NextResponse.json({
        success: true,
        user: cachedUser,
        cached: true,
      })
    }

    // Query Supabase
    const supabase = getSupabaseAdmin()
    const { data: users, error } = await supabase
      .from('staff_users')
      .select('*')
      .eq('pin', pin)
      .eq('active', true)
      .single()

    if (error || !users) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid PIN or account inactive',
        },
        { status: 401 }
      )
    }

    // Cache the user
    await cache.set(cacheKeys.userByPin(pin), users, 3600)
    await cache.set(cacheKeys.user(users.id), users, 3600)

    return NextResponse.json({
      success: true,
      user: users,
      cached: false,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Server error'
    console.error('Auth login error:', error)
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/logout
 * Clear user session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    // Clear cache
    await cache.delete(cacheKeys.session(userId))
    await cache.delete(cacheKeys.user(userId))

    // Log logout event
    const supabase = getSupabaseAdmin()
    await supabase.from('session_logs').insert({
      user_id: userId,
      logout_time: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    )
  }
}
