import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.split(' ')[1]
  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const path = req.nextUrl.pathname.replace('/api/proxy', '')
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  const headers = new Headers(response.headers)
  headers.set('Content-Security-Policy', "default-src 'self'")

  return new NextResponse(response.body, {
    status: response.status,
    headers
  })
}
