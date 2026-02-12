import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { IconArrowLeft, IconChevronRight, IconLoader2, IconFolderFilled } from "@tabler/icons-react"
import { ScrollArea } from "../ui/scroll-area"

export function MoveFolderDialog({
  isOpen,
  setIsOpen,
  folderToMoveId, // The ID of the folder the user wants to move
  folderToMoveName,
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  folderToMoveId: string
  folderToMoveName: string
}) {
  // 1. Navigation State: Where is the user looking right now?
  // null means they are looking at "My Drive" (Root)
  const [browsingFolderId, setBrowsingFolderId] = useState<string | null>(null)

  // 2. Fetch the folder structure for the current browsing location
  const folderUI = useQuery(api.drive.getDirectoryContents, {
    folderId: browsingFolderId as Id<"driveItems"> | null,
  })

  // 3. Move Mutation
  const moveMutation = useMutation(api.drive.move)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleMove = async () => {
    setIsSubmitting(true)
    try {
      await moveMutation({
        itemId: folderToMoveId as Id<"driveItems">,
        targetFolderId: browsingFolderId? browsingFolderId as Id<"driveItems"> : undefined,
      })
      toast.success(`Moved "${folderToMoveName}" to ${folderUI?.current.name}`)
      setIsOpen(false)
    } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message ||"Failed to move folder"
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move "{folderToMoveName}"</DialogTitle>
          <DialogDescription>
            Select a destination folder.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Breadcrumb / Back Button */}
          <div className="flex items-center gap-2">
            {browsingFolderId !== null && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setBrowsingFolderId(folderUI?.breadcrumbs[-1].id || null)}
              >
                <IconArrowLeft size={16} />
              </Button>
            )}
            <div className="text-sm font-medium">
              {folderUI?.current.name || "Loading..."}
            </div>
          </div>

          {/* Folder List Area */}
          <ScrollArea className="h-64 rounded-md border bg-muted/20 p-2">
            {!folderUI ? (
              <div className="flex h-full items-center justify-center">
                <IconLoader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : folderUI.folders.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No sub-folders here.
              </div>
            ) : (
              <div className="space-y-1">
                {folderUI.folders
                  // Prevent user from moving a folder into itself
                  .filter((f) => f.id !== folderToMoveId)
                  .map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => setBrowsingFolderId(folder.id)}
                      className="flex w-full items-center justify-between rounded-lg p-2 text-sm hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <IconFolderFilled
                          size={18}
                          style={{ color: folder.color !== "current" ? folder.color : undefined }}
                        />
                        <span>{folder.name}</span>
                      </div>
                      <IconChevronRight size={14} className="text-muted-foreground" />
                    </button>
                  ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="text-[10px] text-muted-foreground uppercase flex items-center">
            Target: {folderUI?.current.name}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={isSubmitting || !folderUI}>
              {isSubmitting ? "Moving..." : "Move Here"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}