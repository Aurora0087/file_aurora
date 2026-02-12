import {
  IconArrowMoveRight,
  IconDotsVertical,
  IconDownload,
  IconPencil,
  IconStarFilled,
  IconStarOff,
  IconTrash,
  IconTrashOff,
  IconUserPlus,
  IconWorld,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import axios from 'axios'
import { truncateName } from '@/lib/utils'
import { MoveFolderDialog } from '../move-dialog'
import {getMimeConfig, SmartFilePreview} from './SmartFilePreview'

function FileCard({
  name,
  id,
  isPublic,
  isStarted,
  thumbnailUrl,
  mimeType,
  isTrashed,
}: {
  name: string
  id: string
  isPublic: boolean
  isStarted: boolean
  isTrashed: boolean
  mimeType: string
  size: number
  thumbnailUrl: string
}) {
  const navigate = useNavigate()

  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [newName, setNewName] = useState(name)

  const [isMoving, setIsMoving] = useState(false)

  // --- Mutations (Updated to match driveItems logic) ---
  const renameFile = useMutation(api.drive.rename)
  const toggleStarred = useMutation(api.drive.toggleStarred)
  const toggleTrash = useMutation(api.drive.toggleTrash)
  const deleteForever = useMutation(api.drive.deletePermanently)

  async function onDoubleClickHandeler() {
    navigate({ to: '/drive/file/$fileId', params: { fileId: id } })
  }

  const handleRename = async () => {
    if (!newName.trim() || newName === name) {
      setIsRenameOpen(false)
      return
    }
    try {
      await renameFile({
        id: id as Id<'driveItems'>,
        newName: newName.trim(),
      })
      toast.success('File renamed')
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to rename')
    } finally {
      setIsRenameOpen(false)
    }
  }

  const onToggleStar = async () => {
    const newState = !isStarted
    try {
      await toggleStarred({
        list: [{ id: id as Id<'driveItems'> }],
        state: newState,
      })
      toast.success(newState ? 'Added to starred' : 'Removed from starred')
    } catch (error: any) {
      // This catches the ConvexError and shows the message
      toast.error(error.data?.message || 'Failed to update.')
    }
  }

  const onMoveToTrash = async () => {
    try {
      await toggleTrash({
        list: [{ id: id as Id<'driveItems'> }],
        state: true,
      })
      toast.success('Moved to Bin')
    } catch (error: any) {
      // This will display: "Cannot move 'Work' to the bin because it is starred..."
      toast.error(error.data?.message || 'Failed to Move')
    }
  }

  const onRestore = async () => {
    try {
      await toggleTrash({
        list: [{ id: id as Id<'driveItems'> }],
        state: false,
      })
      toast.success('Restored')
    } catch (error: any) {
      // This will display: "Cannot move 'Work' to the bin because it is starred..."
      toast.error(error.data?.message || 'Failed to Move')
    }
  }

  const onParmanatDelete = async () => {
    try {
      const keysToDelete = await deleteForever({
        list: [{ id: id as Id<'driveItems'> }],
      })

      if (keysToDelete.length > 0) {
        await axios.post(
          `${process.env.BUN_SERVER_URL || 'http://localhost:8888/api/v1'}/file/bulk-delete`,
          {
            storageKeys: keysToDelete,
          },
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      toast.success('Items permanently deleted.')
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to Delete parmanatly.')
    }
  }

  const fileIconConfig = getMimeConfig(mimeType,18)
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
              {fileIconConfig.icon}
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
                    <DropdownMenuItem onClick={() => setIsRenameOpen(true)}>
                      <IconPencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  {isTrashed ? (
                    <DropdownMenuItem
                      className="text-green-400"
                      onClick={onRestore}
                    >
                      <IconTrashOff className="mr-2 h-4 w-4" />
                      Restore
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <IconUserPlus className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsMoving(true)}>
                        <IconArrowMoveRight className="mr-2 h-4 w-4" />
                        Move
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onToggleStar}>
                        {isStarted ? (
                          <>
                            <IconStarOff className="mr-2 h-4 w-4" />
                            Remove from starred
                          </>
                        ) : (
                          <>
                            <IconStarFilled className="mr-2 h-4 w-4" />
                            Add to starred
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  )}

                  <DropdownMenuSeparator />
                  {isTrashed ? (
                    <DropdownMenuItem
                      onClick={onParmanatDelete}
                      variant="destructive"
                    >
                      <IconTrash className="mr-2 h-4 w-4" />
                      Delete parmanently
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={onMoveToTrash}
                      variant="destructive"
                    >
                      <IconTrash className="mr-2 h-4 w-4" />
                      Move to Bin
                    </DropdownMenuItem>
                  )}
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

      {/* RENAME DIALOG */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for your File.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              min={3}
              placeholder="File name"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!newName.trim() || newName === name}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* folder move dialog */}
      <MoveFolderDialog
        isOpen={isMoving}
        setIsOpen={setIsMoving}
        folderToMoveId={id}
        folderToMoveName={name}
      />
    </>
  )
}

export default FileCard
