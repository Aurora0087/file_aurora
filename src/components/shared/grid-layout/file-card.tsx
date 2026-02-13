import {
  IconDotsVertical,
  IconDownload,
  IconFileFilled,
  IconStarFilled,
  IconWorld,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from '@tanstack/react-router'
import { truncateName } from '@/lib/utils'
import { SmartFilePreview } from "@/components/drive/grid-layout/SmartFilePreview"

function FileCard({
  name,
  id,
  mimeType,
  isPublic,
  isStarted,
  thumbnailUrl,
  token
}: {
  name: string
  id: string
  isPublic: boolean
  isStarted: boolean
  isTrashed: boolean
  mimeType: string
  size: number
  thumbnailUrl: string
  token:string
}) {
  const navigate = useNavigate()

  async function onDoubleClickHandeler() {
    navigate({ to: '/drive/shared/$token/file/$fileId', params: { token:token,fileId: id } })
  }

  return (
    <>
      <div
        onDoubleClick={onDoubleClickHandeler}
        className="group relative rounded bg-card/70 border border-transparent shadow-sm ring-1 ring-border/50 hover:bg-card hover:ring-primary/50 p-2 flex items-center justify-between w-full gap-4 transition-all cursor-pointer"
      >
        <div className="absolute -top-2 -right-2 flex gap-1 items-center">
          {isPublic && <IconWorld className="h-4 w-4 text-primary" />}
          {isStarted && <IconStarFilled className="h-4 w-4 text-yellow-400" />}
        </div>
        <div className="grid grid-cols-1 w-full gap-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <IconFileFilled className="w-6 h-6" />
              <span className=" line-clamp-1 text-card-foreground" title={name}>
                {truncateName({ name })}
              </span>
            </div>

            <div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="More actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconDotsVertical size={18} />
                    </Button>
                  }
                />
                <DropdownMenuContent className="min-w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <IconDownload />
                      Download
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className=" overflow-hidden w-full aspect-square rounded transition-all">
                      <SmartFilePreview
                        mimeType={mimeType}
                        src={thumbnailUrl}
                        className=" w-full h-full object-cover transition-all"
                      />
                    </div>
        </div>
      </div>
    </>
  )
}

export default FileCard
