import { useState } from 'react'
import {
  IconPhoto,
  IconFileZip,
  IconFileText,
  IconPlayerPlayFilled,
  IconMusic,
  IconFileFilled,
  IconLoader2,
  IconBrandBlender,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'

interface SmartFilePreviewProps {
  src?: string | null
  mimeType: string
  className?: string
}

const getMimeConfig = (mime: string,size:number=32) => {
    if (mime.startsWith('image/'))
      return {
        icon: <IconPhoto size={size} />,
        color: 'bg-blue-500/10 text-blue-500',
      }
    if (mime.startsWith('video/'))
      return {
        icon: <IconPlayerPlayFilled size={size} />,
        color: 'bg-purple-500/10 text-purple-500',
      }
    if (mime.startsWith('audio/'))
      return {
        icon: <IconMusic size={size} />,
        color: 'bg-emerald-500/10 text-emerald-500',
      }
    if (mime === 'application/pdf')
      return {
        icon: <IconFileText size={size} />,
        color: 'bg-red-500/10 text-red-500',
      }
    if (mime === 'application/x-blender')
      return {
        icon: <IconBrandBlender size={size} />,
        color: 'bg-[#DF7202]/10 text-[#DF7202]',
      }
    if (mime.includes('zip') || mime.includes('rar'))
      return {
        icon: <IconFileZip size={32} />,
        color: 'bg-orange-500/10 text-orange-500',
      }
    return {
      icon: <IconFileFilled size={32} />,
      color: 'bg-gray-500/10 text-gray-500',
    }
  }

function SmartFilePreview({
  src,
  mimeType,
  className,
}: SmartFilePreviewProps) {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>(
    src ? 'loading' : 'error',
  )

  const config = getMimeConfig(mimeType)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted/30 flex items-center justify-center',
        className,
      )}
    >
      {/* 1. The Actual Image (Success State) */}
      {src && (
        <img
          src={src}
          alt="File preview"
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            status === 'success' ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setStatus('success')}
          onError={() => setStatus('error')}
        />
      )}

      {/* 2. Loading Overlay (Spinner) */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-[2px]">
          <IconLoader2
            className="animate-spin text-muted-foreground"
            size={24}
          />
        </div>
      )}

      {/* 3. Placeholder / Error State (Icon based on MimeType) */}
      {(status === 'error' || !src) && (
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-2',
            config.color,
          )}
        >
          {config.icon}
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-60">
            {mimeType.split('/')[1] || 'File'}
          </span>
        </div>
      )}
    </div>
  )
}

export {SmartFilePreview, getMimeConfig}