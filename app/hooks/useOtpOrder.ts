import { useState, useEffect } from 'react'
import axios from 'axios'
import { useToast } from "@/components/ui/use-toast"

interface ActiveOrderItem {
  id: string
  status: string
  number: string
  otp: string
  sms: string
  service_name: string
  remain_time: string
}

interface ActiveOrderResponse {
  status: boolean
  data: ActiveOrderItem[]
}

interface CopiedState {
  id: string;
  type: 'nomor' | 'otp';
}

export default function useOtpOrder() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [activeOrders, setActiveOrders] = useState<ActiveOrderItem[]>([])
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null)
  const [copiedState, setCopiedState] = useState<CopiedState | null>(null)
  const { toast } = useToast()

  const startChecking = () => {
    if (!checkInterval) {
      const interval = setInterval(checkActiveOrders, 5000)
      setCheckInterval(interval)
    }
  }

  const stopChecking = () => {
    if (checkInterval) {
      clearInterval(checkInterval)
      setCheckInterval(null)
    }
  }

  const processActiveOrders = async () => {
    const { data } = await axios.get('/api/otp?action=active_order')
    if (data.status === "false") {
      setActiveOrders([])
      stopChecking()
      console.log('Tidak ada orderan aktif')
      return false
    }

    const modifiedData = data.data.map((order: ActiveOrderItem) => ({
      ...order,
      remain_time: order.remain_time || "20"
    }))
    
    setActiveOrders(modifiedData)
    
    const hasPendingOrder = modifiedData.some((order: ActiveOrderItem) => 
      order.status.toLowerCase() === "ready"
    )
    
    if (!hasPendingOrder) {
      stopChecking()
    }
    
    return hasPendingOrder
  }

  const checkActiveOrders = async () => {
    try {
      await processActiveOrders()
    } catch (err) {
      console.error('Error checking active orders:', err)
      setActiveOrders([])
    }
  }

  const formatExpiredTime = (remainTime: string) => {
    const minutes = parseInt(remainTime)
    if (minutes <= 0) {
      return 'Kadaluarsa'
    }
    return `${minutes} menit`
  }

  const orderOtp = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/otp?action=order')
      const data = await response.json()
      
      if (data.status) {
        startChecking() // Mulai pengecekan ketika order baru berhasil
        await checkActiveOrders()
      } else {
        setError(data.msg || 'Terjadi kesalahan saat memesan nomor')
      }
    } catch (err) {
      setError('Terjadi kesalahan pada jaringan')
    } finally {
      setLoading(false)
    }
  }

  const cancelOrder = async (id: string, status: number = 2) => {
    try {
      const response = await axios.get(`/api/otp?action=set_status&id=${id}&status=${status}`)
      if (response.data.status) {
        toast({
          description: "Pesanan berhasil dibatalkan",
        })
        await checkActiveOrders()
      } else {
        toast({
          variant: "destructive",
          description: response.data.msg || "Gagal membatalkan pesanan",
        })
      }
    } catch (err) {
      console.error('Error setting status:', err)
      toast({
        variant: "destructive",
        description: "Terjadi kesalahan saat membatalkan pesanan",
      })
    }
  }

  const copyToClipboard = async (text: string, id: string, type: 'nomor' | 'otp' = 'nomor') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedState({ id, type })
      
      setTimeout(() => {
        setCopiedState(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const canCancelOrder = (order: ActiveOrderItem) => {
    return order.remain_time && order.remain_time !== ""
  }

  useEffect(() => {
    const initialCheck = async () => {
      try {
        const hasPendingOrder = await processActiveOrders()
        if (hasPendingOrder) {
          startChecking()
        }
      } catch (err) {
        console.error('Error in initial check:', err)
        setActiveOrders([])
      }
    }
    
    initialCheck()
    return () => stopChecking()
  }, [])

  return {
    loading,
    error,
    orderOtp,
    activeOrders,
    cancelOrder,
    copyToClipboard,
    copiedState,
    canCancelOrder
  }
} 