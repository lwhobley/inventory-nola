import { NextRequest, NextResponse } from 'next/server'
import { cache, cacheKeys, rateLimit } from '@/lib/redis'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cloudflareAnalytics } from '@/lib/cloudflare'
import crypto from 'crypto'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyD20AFym1g5t0EL3TGu_Npxjy8SR9kCNKI'
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'

interface NormalizedAgentResponse {
  status: 'success' | 'error'
  result: Record<string, any>
  message?: string
  metadata?: {
    agent_name?: string
    timestamp?: string
    [key: string]: any
  }
}

// Agent configurations with specific prompts
const AGENT_CONFIGS: Record<string, { name: string; systemPrompt: string }> = {
  '69a5b1a3f2d0d9c8063d1a47': {
    name: 'Financial Insights Agent',
    systemPrompt: `You are a financial analysis expert for restaurant/hospitality operations. 
Analyze the provided financial data and return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "summary": "string - brief overview",
  "overall_cogs_percentage": "string",
  "cost_of_goods_sold": [{"category": "string", "amount": "string", "percentage": "string"}],
  "revenue_breakdown": [{"location": "string", "amount": "string", "percentage": "string"}],
  "margin_trends": [{"period": "string", "cogs_percent": "string", "margin_percent": "string"}],
  "cost_saving_opportunities": [{"opportunity": "string", "potential_savings": "string", "effort": "string"}]
}`,
  },
  '69a5b1a33fe08f1e2b19b91e': {
    name: 'Inventory Intelligence Agent',
    systemPrompt: `You are an inventory management expert for hospitality/food service operations.
Analyze the provided inventory data and return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "summary": "string - brief overview",
  "overall_health_score": "string",
  "critical_items": [{"item_name": "string", "current_stock": "string", "daily_usage": "string", "days_remaining": "string", "risk_level": "string"}],
  "reorder_suggestions": [{"item_name": "string", "current_stock": "string", "daily_usage": "string", "days_remaining": "string", "suggested_order_qty": "string", "urgency": "string"}],
  "consumption_anomalies": [{"item_name": "string", "expected_usage": "string", "actual_usage": "string", "deviation_percentage": "string", "possible_cause": "string"}],
  "excess_stock_alerts": [{"item_name": "string", "current_stock": "string", "days_until_expiry": "string", "recommended_action": "string"}]
}`,
  },
  '69a5b1a38413529629dda599': {
    name: 'Variance Analyst Agent',
    systemPrompt: `You are a variance analysis expert for hospitality operations.
Analyze the provided variance data and return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "summary": "string - brief overview",
  "variance_metrics": [{"metric": "string", "theoretical": "string", "actual": "string", "variance": "string", "percentage": "string"}],
  "significant_variances": [{"category": "string", "description": "string", "amount": "string", "impact": "string"}],
  "root_cause_analysis": [{"issue": "string", "potential_causes": ["string"], "evidence": "string"}],
  "recommendations": [{"issue": "string", "action": "string", "expected_impact": "string", "priority": "string"}]
}`,
  },
}

function normalizeResponse(parsed: any): NormalizedAgentResponse {
  if (!parsed) {
    return {
      status: 'error',
      result: {},
      message: 'Empty response from agent',
    }
  }

  if (typeof parsed === 'string') {
    return {
      status: 'success',
      result: { text: parsed },
      message: parsed,
    }
  }

  if (typeof parsed !== 'object') {
    return {
      status: 'success',
      result: { value: parsed },
      message: String(parsed),
    }
  }

  if ('status' in parsed && 'result' in parsed) {
    return {
      status: parsed.status === 'error' ? 'error' : 'success',
      result: parsed.result || {},
      message: parsed.message,
      metadata: parsed.metadata,
    }
  }

  return {
    status: 'success',
    result: parsed,
    message: undefined,
    metadata: undefined,
  }
}

function extractJsonFromResponse(text: string): Record<string, any> {
  // Try to extract JSON from the response (handles markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1])
    } catch {
      // If markdown extraction fails, try direct parse
    }
  }

  // Try direct JSON parse
  try {
    return JSON.parse(text)
  } catch {
    // If all parsing fails, wrap as plain text
    return { text, message: text }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = body.user_id || 'anonymous'
    const ip = request.headers.get('x-forwarded-for') || 'unknown'

    // Rate limiting: 100 requests per minute per user
    const allowed = await rateLimit.checkLimit(userId, '/api/agent', 100, 60)
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          response: { status: 'error', result: {}, message: 'Rate limit exceeded' },
          error: 'Too many requests',
        },
        { status: 429 }
      )
    }

    const { message, agent_id } = body

    if (!message || !agent_id) {
      return NextResponse.json(
        {
          success: false,
          response: { status: 'error', result: {}, message: 'message and agent_id are required' },
          error: 'message and agent_id are required',
        },
        { status: 400 }
      )
    }

    // Check cache for duplicate requests
    const requestHash = crypto
      .createHash('md5')
      .update(`${message}${agent_id}`)
      .digest('hex')
    const cacheKey = cacheKeys.geminiResult(requestHash)
    
    const cachedResult = await cache.get(cacheKey)
    if (cachedResult) {
      console.log('Cache hit for agent request')
      return NextResponse.json({
        ...cachedResult,
        cached: true,
      })
    }

    // Get agent config
    const agentConfig = AGENT_CONFIGS[agent_id]
    if (!agentConfig) {
      return NextResponse.json(
        {
          success: false,
          response: { status: 'error', result: {}, message: `Unknown agent_id: ${agent_id}` },
          error: `Unknown agent_id: ${agent_id}`,
        },
        { status: 400 }
      )
    }

    // Call Gemini API
    const geminiResponse = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: agentConfig.systemPrompt + '\n\n' + message,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API Error:', errorText)
      return NextResponse.json(
        {
          success: false,
          response: { status: 'error', result: {}, message: `Gemini API Error: ${geminiResponse.status}` },
          error: errorText,
        },
        { status: geminiResponse.status }
      )
    }

    const geminiData = await geminiResponse.json()

    // Extract text from Gemini response
    let responseText = ''
    if (geminiData.candidates && geminiData.candidates[0]?.content?.parts?.[0]?.text) {
      responseText = geminiData.candidates[0].content.parts[0].text
    }

    if (!responseText) {
      return NextResponse.json(
        {
          success: false,
          response: { status: 'error', result: {}, message: 'Empty response from Gemini' },
          error: 'Empty response from Gemini',
        },
        { status: 500 }
      )
    }

    // Parse JSON from response
    const parsedJson = extractJsonFromResponse(responseText)
    const normalized = normalizeResponse(parsedJson)

    const result = {
      success: true,
      response: {
        status: normalized.status,
        result: normalized.result,
        message: normalized.message || responseText,
      },
      agent_id,
      timestamp: new Date().toISOString(),
      cached: false,
    }

    // Cache the result (5 minutes)
    await cache.set(cacheKey, result, 300)

    // Log to Supabase
    try {
      const supabase = getSupabaseAdmin()
      await supabase.from('analysis_results').insert({
        user_id: userId,
        agent_id,
        agent_name: agentConfig.name,
        input_message: message.substring(0, 500), // Truncate for storage
        result: normalized.result,
      })

      // Log security event
      await cloudflareAnalytics.logSecurityEvent('agent_call', userId, {
        agent_id,
        ip,
        timestamp: new Date().toISOString(),
      })
    } catch (logError) {
      console.error('Error logging to Supabase:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json(result)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Server error'
    console.error('Agent API Error:', error)
    return NextResponse.json(
      {
        success: false,
        response: { status: 'error', result: {}, message: errorMsg },
        error: errorMsg,
      },
      { status: 500 }
    )
  }
}
