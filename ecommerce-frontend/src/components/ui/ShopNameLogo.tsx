import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface ShopNameProps {
  firstName?: string
  secondName?: string
  to?: string
  className?: string
}

export function ShopNameLogo({
  firstName: customFirst,
  secondName: customSecond,
  to,
  className = 'text-xl font-extrabold',
}: ShopNameProps) {
  const [shopName, setShopName] = useState(() => {
    const savedFirst = localStorage.getItem('shop_first_name') || 'Fresh'
    const savedSecond = localStorage.getItem('shop_second_name') || 'Mart'
    return { firstName: savedFirst, secondName: savedSecond }
  })

  useEffect(() => {
    const loadSettings = () => {
      fetch('/api/admin/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            const first = data.data.shopFirstName || 'Fresh'
            const second = data.data.shopSecondName || 'Mart'
            localStorage.setItem('shop_first_name', first)
            localStorage.setItem('shop_second_name', second)
            setShopName({ firstName: first, secondName: second })
          }
        })
        .catch(() => {})
    }

    loadSettings()

    const handleUpdate = () => loadSettings()
    window.addEventListener('shop-name-updated', handleUpdate)
    return () => window.removeEventListener('shop-name-updated', handleUpdate)
  }, [])

  const first = customFirst !== undefined ? customFirst : shopName.firstName
  const second = customSecond !== undefined ? customSecond : shopName.secondName

  const content = (
    <div className={`flex items-center gap-1 font-extrabold tracking-tight ${className}`}>
      <span className="text-orange-600">{first}</span>
      <span className="text-zinc-900">{second}</span>
    </div>
  )

  if (to) {
    return <Link to={to}>{content}</Link>
  }

  return content
}
