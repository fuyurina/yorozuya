import { NextResponse } from 'next/server'

const API_URL = 'https://virtusim.com/api/json.php'
const API_KEY = 'p24hcsn3YeujU7DHSiIvZlByaGTdPo'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  let apiUrl = `${API_URL}?api_key=${API_KEY}`
  
  switch (action) {
    case 'order':
      apiUrl += `&action=order&service=722&operator=any`
      try {
        const orderResponse = await fetch(apiUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        const orderData = await orderResponse.json()
        
        if (orderData.status && orderData.data?.id) {
          const setStatusUrl = `${API_URL}?api_key=${API_KEY}&action=set_status&id=${orderData.data.id}&status=1`
          await fetch(setStatusUrl, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
        }
        
        return NextResponse.json(orderData)
      } catch (error) {
        return NextResponse.json(
          { status: false, message: 'Server error' },
          { status: 500 }
        )
      }
      break
    case 'set_status':
      const id = searchParams.get('id')
      const status = searchParams.get('status')
      apiUrl += `&action=set_status&id=${id}&status=${status}`
      break
    case 'active_order':
      apiUrl += `&action=active_order`
      break
    default:
      return NextResponse.json({ status: false, message: 'Invalid action' }, { status: 400 })
  }

  try {
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { status: false, message: 'Server error' },
      { status: 500 }
    )
  }
} 