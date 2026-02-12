import {
  IconArrowMoveRight,
  IconCheck,
  IconColorSwatch,
  IconDotsVertical,
  IconDownload,
  IconFolderFilled,
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { Input } from '@/components/ui/input'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'
import { toast } from 'sonner'
import axios from 'axios'
import { truncateName } from '@/lib/utils'
import { MoveFolderDialog } from '../move-dialog'
import ShareDialog from './share-dialog'

const folderColors = [
  'current',
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#000000', // Black
  '#706D54', // Muted
]

function FolderCard({
  name,
  color = 'current',
  id,
  isPublic,
  isStarted,
  isTrashed,
}: {
  name: string
  color?: string
  id: string
  isPublic: boolean
  isStarted: boolean
  isTrashed: boolean
}) {
  const navigate = useNavigate()

  // --- Mutations (Updated to match driveItems logic) ---
  const renameFolder = useMutation(api.drive.rename)
  const changeColor = useMutation(api.drive.changeColor)
  const toggleStarred = useMutation(api.drive.toggleStarred)
  const toggleTrash = useMutation(api.drive.toggleTrash)
  const lastOpened = useMutation(api.activity.touchItem)
  const deleteForever = useMutation(api.drive.deletePermanently)

  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [newName, setNewName] = useState(name)

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const [isMoving, setIsMoving] = useState(false)

  async function onDoubleClickHandeler() {
    await lastOpened({ itemId: id as Id<'driveItems'> })
    navigate({
      to: '/drive/folder/$folderid',
      params: { folderid: id },
    })
  }

  const handleRename = async () => {
    if (!newName.trim() || newName === name) {
      setIsRenameOpen(false)
      return
    }
    try {
      await renameFolder({
        id: id as Id<'driveItems'>,
        newName: newName.trim(),
      })
      toast.success('Folder renamed')
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to rename')
    } finally {
      setIsRenameOpen(false)
    }
  }

  const handleColorChange = async (newColor: string) => {
    try {
      await changeColor({ id: id as Id<'driveItems'>, newColor })
      toast.success('Color updated')
    } catch (error) {
      toast.error('Failed to update color')
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

  return (
    <>
      <div
        className="group relative rounded bg-card/70 border border-transparent shadow-sm ring-1 ring-border/50 hover:bg-card hover:ring-primary/50 p-2 flex items-center justify-between w-full h-fit gap-4 transition-all cursor-pointer"
        onDoubleClick={onDoubleClickHandeler}
      >
        <div className="absolute -top-2 -right-2 flex gap-1 items-center">
          {isPublic && <IconWorld className="h-4 w-4 text-primary" />}
          {isStarted && <IconStarFilled className="h-4 w-4 text-yellow-400" />}
        </div>

        <div className="flex items-center gap-3 overflow-hidden">
          <IconFolderFilled
            style={{ color: color === 'current' ? undefined : color }}
            className={`w-6 h-6 shrink-0`}
          />
          <span
            className="truncate font-medium text-sm text-card-foreground"
            title={name}
          >
            {truncateName({ name })}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="More actions"
                onClick={(e) => e.stopPropagation()} // Prevent double click trigger
              >
                <IconDotsVertical size={18} />
              </Button>
            }
          />
          <DropdownMenuContent className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <IconDownload className="mr-2 h-4 w-4" />export 
                Download as zip
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsRenameOpen(true)}>
                <IconPencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>

              {/* COLOR PICKER SUBMENU */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <IconColorSwatch className="mr-2 h-4 w-4" />
                  Change Color
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-2">
                  <div className="grid grid-cols-4 gap-2">
                    {folderColors.map((c) => (
                      <button
                        key={c}
                        onClick={() => handleColorChange(c)}
                        className="h-6 w-6 rounded-full border border-border flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                        style={{
                          backgroundColor: c === 'current' ? 'gray' : c,
                        }}
                      >
                        {color === c && (
                          <IconCheck
                            size={12}
                            className="text-white drop-shadow-md"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {isTrashed ? (
              <DropdownMenuItem className="text-green-400" onClick={onRestore}>
                <IconTrashOff className="mr-2 h-4 w-4" />
                Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={()=>setIsShareDialogOpen(true)}>
                   <IconUserPlus className="mr-2 h-4 w-4" />
                        Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={()=>setIsMoving(true)}>
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
              <DropdownMenuItem onClick={onMoveToTrash} variant="destructive">
                <IconTrash className="mr-2 h-4 w-4" />
                Move to Bin
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* RENAME DIALOG */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for your folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Folder name"
              autoFocus
              min={1}
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
      <MoveFolderDialog isOpen={isMoving} setIsOpen={setIsMoving} folderToMoveId={id} folderToMoveName={name}/>

      {/* share dialog */}
      <ShareDialog isOpen={isShareDialogOpen} setOpen={setIsShareDialogOpen} itemId={id}/>
    </>
  )
}

export default FolderCard
