import FileCard from '@/components/drive/grid-layout/file-card'
import FolderCard from '@/components/drive/grid-layout/folder-card'
import { FolderSkeleton } from '@/components/drive/grid-layout/folder-skeleton'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IconAlertCircle, IconLoader2, IconTrash } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import axios from 'axios'
import { api } from 'convex/_generated/api'
import { useMutation, usePaginatedQuery } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/drive/__drive/bin')({
  component: RouteComponent,
})

function RouteComponent() {
  const [openEmtyBinDialog, setOpenEmtyBinDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 1. Fetch Binned Items
  const { results, status, loadMore } = usePaginatedQuery(
    api.drive.binnedList,
    {},
    { initialNumItems: 24 },
  )

  // 2. Mutation for emptying the trash
  const emptyTrashMutation = useMutation(api.drive.emtyTrashItems)

  const handleEmptyBin = async () => {
    setIsDeleting(true)
    try {
      // Step A: Delete from Convex (returns S3 keys)
      const s3Keys = await emptyTrashMutation()

      // Step B: Trigger S3 Cleanup on your Express Server
      // This sends the keys to your RabbitMQ worker for physical deletion
      if (s3Keys.length > 0) {
        await axios.post(
          `${process.env.BUN_SERVER_URL || 'http://localhost:8888/api/v1'}/file/bulk-delete`,
          {
            storageKeys: s3Keys,
          },
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      toast.success('Bin emptied successfully')
      setOpenEmtyBinDialog(false)
    } catch (error) {
      console.error(error)
      toast.error('Failed to empty bin')
    } finally {
      setIsDeleting(false)
    }
  }

  // 2. Infinite Scroll Logic
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === 'CanLoadMore') {
          loadMore(15)
        }
      },
      { threshold: 0.1 },
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [status, loadMore])

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <IconTrash className="text-destructive" size={24} />
          <h1 className="text-xl font-bold">Bin</h1>
        </div>
        {results.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setOpenEmtyBinDialog(true)}
          >
            <IconTrash />
            Empty bin
          </Button>
        )}
      </header>

      {/* Warning Banner */}
      {results.length > 0 && (
        <div className=" flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground border border-border/50">
          <IconAlertCircle size={16} />
          <span>Items in the bin will be deleted forever after 30 days.</span>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && status !== 'LoadingFirstPage' && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-20 text-center bg-muted/5">
          <div className="rounded-full bg-muted p-4 mb-4">
            <IconTrash size={40} className="text-muted-foreground/30" />
          </div>
          <p className="text-muted-foreground font-medium">Bin is empty</p>
          <p className="text-xs text-muted-foreground mt-1">
            Items you delete will appear here for 30 days before being
            permanently removed.
          </p>
        </div>
      )}

      {/* The Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {/* Initial Loading Skeletons */}
        {status === 'LoadingFirstPage' && (
          <>
            {Array.from({ length: 12 }).map((_, i) => (
              <FolderSkeleton key={`bin-skeleton-${i}`} />
            ))}
          </>
        )}

        {/* Render Binned Items */}
        {results.map((item) => {
          // Note: In the Bin, we usually pass a special prop or context
          // to the cards to show "Restore" instead of "Open"
          if (item.type === 'folder') {
            return (
              <div
                key={item._id}
                className="opacity-70 grayscale-[0.5] hover:grayscale-0 transition-all"
              >
                <FolderCard
                  id={item._id}
                  color={item.color}
                  name={item.name}
                  isPublic={item.isPublic}
                  isStarted={item.isStarred}
                  isTrashed={item.isDeleted}
                />
              </div>
            )
          }
          return (
            <div
              key={item._id}
              className="opacity-70 grayscale-[0.5] hover:grayscale-0 transition-all"
            >
              <FileCard
                key={item._id}
                id={item._id}
                name={item.name}
                mimeType={item.mimeType || ''}
                size={item.size || 0}
                isPublic={item.isPublic}
                isStarted={item.isStarred}
                thumbnailUrl={item.thumbnailUrl || ''}
                isTrashed={item.isDeleted}
              />
            </div>
          )
        })}
      </div>

      {/* emty bin dialog */}
      <Dialog open={openEmtyBinDialog} onOpenChange={setOpenEmtyBinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete all 
              items in your bin, including all historical file versions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button 
              variant="ghost" 
              onClick={() => setOpenEmtyBinDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleEmptyBin}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <IconLoader2 className="animate-spin mr-2" />
              ) : (
                <IconTrash className="mr-2" size={18} />
              )}
              {isDeleting ? "Emptying..." : "Yes, empty bin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Infinite Scroll Sentinel */}
      <div ref={observerTarget} className="h-20 w-full" />

      {status === 'LoadingMore' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <FolderSkeleton key={`loading-more-bin-${i}`} />
          ))}
        </div>
      )}
    </div>
  )
}
