import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { IconFile, IconFolderPlus, IconFolderUp, IconPlus } from '@tabler/icons-react'
import { useParams } from '@tanstack/react-router'
import {  useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'
import { Id } from 'convex/_generated/dataModel'

export function SidebarNewButton() {
  const { folderid } = useParams({ strict: false })

  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [folderName, setFolderName] = useState('')

  const createFolder = useMutation(api.drive.createFolder)

  const handleNewFolder = () => {
    setShowFolderDialog(true)
  }

  const handleCreateFolder = async () => {
    if (folderName.trim()) {
      try {
        // 2. Execute the mutation
        await createFolder({
          name: folderName.trim(),
          // If folderid exists in URL, cast it to the correct Convex ID type
          parentId: folderid ? (folderid as Id<'driveItems'>) : undefined,
          color: 'current', // You can later add a color picker
        })

        // 3. Cleanup UI
        toast.success('Folder created successfully')
        setFolderName('')
        setShowFolderDialog(false)
      } catch (error) {
        console.error(error)
        toast.error('Failed to create folder')
      } finally {
        setFolderName('')
        setShowFolderDialog(false)
      }
    }
  }

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          <DropdownMenu>
            <SidebarMenuItem key="new">
              <SidebarMenuButton asChild tooltip="New">
                <DropdownMenuTrigger
                  render={
                    <div className="cursor-pointer py-6 bg-primary-foreground text-primary shadow">
                      <IconPlus />
                      <span>New</span>
                    </div>
                  }
                ></DropdownMenuTrigger>
              </SidebarMenuButton>
              <DropdownMenuContent className="w-62.5 shadow-xs fill-primary flex flex-col gap-2">
                <DropdownMenuItem
                  className="bg-muted cursor-pointer"
                  onClick={handleNewFolder}
                >
                  <IconFolderPlus />
                  <span>New Folder</span>
                </DropdownMenuItem>
                <Separator orientation="horizontal" />
                <DropdownMenuItem className="bg-muted cursor-pointer">
                  <IconFile />
                  <span>File Upload</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="bg-muted cursor-pointer">
                  <IconFolderUp />
                  <span>Folder Upload</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </SidebarMenuItem>
          </DropdownMenu>
        </SidebarMenu>
      </SidebarGroup>

      <input type="file" className="hidden" />
      <input type="file" className="hidden" multiple />

      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="folder-name" className="text-right">
                Name
              </Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="col-span-3"
                placeholder="Enter folder name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFolderDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateFolder}
              disabled={!folderName.trim()}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
