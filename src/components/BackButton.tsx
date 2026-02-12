import { useRouter } from '@tanstack/react-router'
import { Button } from './ui/button'
import { IconArrowLeft } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

function BackButton({className=''}:{className?:string}) {
  const router = useRouter()
  return (
    <Button variant="outline" className={cn(className)} onClick={() => router.history.back()}>
      <IconArrowLeft /> Back
    </Button>
  )
}

export default BackButton
