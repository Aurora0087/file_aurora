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
import { IconFile, IconFolderPlus, IconFolderUp, IconLoader2, IconPlus } from '@tabler/icons-react'
import { useParams } from '@tanstack/react-router'
import {  useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'
import { Id } from 'convex/_generated/dataModel'
import axios from 'axios'

export function SidebarNewButton() {
  const { folderid } = useParams({ strict: false })

  const fileInputRef = useRef<HTMLInputElement>(null)
    const folderInputRef = useRef<HTMLInputElement>(null)
  
    const [showFolderDialog, setShowFolderDialog] = useState(false)
    const [folderName, setFolderName] = useState('')

    const [uploadingFile, setUploadingFile] = useState<
        { fileName: string; progress: number }[]
      >([])

    const createFolder = useMutation(api.drive.createFolder)

  const [isChordActive, setIsChordActive] = useState(false)
  const chordTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // single file upload
  const processSingleFileUpload = async (
    file: File,
    targetFolderId?: string,
  ) => {
    setUploadingFile((prev) => [...prev, { fileName: file.name, progress: 0 }])

    try {
      // 1. Get Pre-signed URL
      const { data } = await axios.post(
        `${process.env.BUN_SERVER_URL || 'http://localhost:8888/api/v1'}/file/presign-url`,
        {
          fileName: file.name,
          fileType: file.type,
          parentId: targetFolderId, // Use the specific folder ID created during recursion
          fileSize: file.size || 0,
        },
        { withCredentials: true },
      )

      const { uploadUrl, storageKey } = data

      // 2. S3 Put
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (p) => {
          const progress = Math.round((p.loaded * 100) / (p.total || file.size))
          setUploadingFile((prev) =>
            prev.map((f) =>
              f.fileName === file.name ? { ...f, progress } : f,
            ),
          )
        },
      })

      // 3. Finish Upload
      await axios.post(
        `${process.env.BUN_SERVER_URL || 'http://localhost:8888/api/v1'}/file/finish-upload`,
        {
          name: file.name,
          parentId: targetFolderId as Id<'driveItems'>,
          storageKey,
          size: file.size,
          mimeType: file.type,
        },
        { withCredentials: true },
      )
      toast.success(`${file.name} uploaded`)
    } catch (error) {
      toast.error(`Failed: ${file.name}`)
    } finally {
      setTimeout(() => {
        setUploadingFile((prev) => prev.filter((f) => f.fileName !== file.name))
      }, 2000)
    }
  }

  // upload folder upload
  const handleFolderUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)

    // Map to keep track of folder paths to Convex IDs
    // e.g., {"folder1": "id123", "folder1/sub": "id456"}
    const folderCache: Record<string, string> = {}

    for (const file of fileArray) {
      // webkitRelativePath looks like: "MyDocuments/Images/photo.jpg"
      const pathParts = file.webkitRelativePath.split('/')
      const fileName = pathParts.pop() // Remove the file name
      const folders = pathParts // These are the directory names

      let currentParentId = folderid // Start at the current folder view

      // Traverse/Create the folder structure
      let pathKey = ''
      for (const folderName of folders) {
        pathKey = pathKey ? `${pathKey}/${folderName}` : folderName

        if (!folderCache[pathKey]) {
          // Create folder in Convex
          const newFolderId = await createFolder({
            name: folderName,
            parentId: currentParentId as Id<'driveItems'>,
            color: 'current',
          })
          folderCache[pathKey] = newFolderId
        }
        currentParentId = folderCache[pathKey]
      }

      // Now upload the file into the deepest folder created
      await processSingleFileUpload(file, currentParentId)
    }

    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  // 1. Mock Upload Function
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      await processSingleFileUpload(file, folderid)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleNewFolder = () => {
    setShowFolderDialog(true)
  }

  const handleCreateFolder = async () => {
    if (folderName.trim()) {
      try {
        await createFolder({
          name: folderName.trim(),
          parentId: folderid ? (folderid as Id<'driveItems'>) : undefined,
          color: 'current',
        })
        toast.success('Folder created successfully')
      } catch (error: any) {
        toast.error(error.data?.message || 'Failed to create folder')
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
                  onClick={() => setShowFolderDialog(true)}
                >
                  <IconFolderPlus />
                  <span>New Folder</span>
                </DropdownMenuItem>
                <Separator orientation="horizontal" />
                <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="bg-muted cursor-pointer">
                  <IconFile />
                  <span>File Upload</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                onClick={() => folderInputRef.current?.click()}
                className="bg-muted cursor-pointer">
                  <IconFolderUp />
                  <span>Folder Upload</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </SidebarMenuItem>
          </DropdownMenu>
        </SidebarMenu>
      </SidebarGroup>

            {/* Hidden Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      <input
        type="file"
        ref={folderInputRef}
        className="hidden"
        // @ts-ignore - webkitdirectory is a non-standard attribute but widely supported
        webkitdirectory=""
        directory=""
        multiple
        onChange={(e) => handleFolderUpload(e.target.files)}
      />

      {/* Uploading Status Bar (Bottom of screen) */}
      {uploadingFile.length > 0 && (
        <div className="fixed bottom-4 right-4 z-100 space-y-2">
          {uploadingFile.map((file, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 rounded border bg-background p-4 shadow-xl ring-1 ring-border animate-in fade-in slide-in-from-right-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-hidden">
                  {file.progress < 100 ? (
                    <IconLoader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                  <p className="truncate text-xs font-medium">
                    {file.fileName}
                  </p>
                </div>
                <p className="text-[10px] font-bold tabular-nums">
                  {file.progress}%
                </p>
              </div>

              {/* Progress Bar */}
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Folder Dialog */}
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
                placeholder="New Folder"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFolderDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!folderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
