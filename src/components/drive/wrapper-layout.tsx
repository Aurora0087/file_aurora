import axios from 'axios'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  IconActivity,
  IconCloudUpload,
  IconFile,
  IconFolderPlus,
  IconFolderUp,
  IconLoader2,
} from '@tabler/icons-react'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Kbd, KbdGroup } from '../ui/kbd'
import { useNavigate } from '@tanstack/react-router'

function DriveWrapperLayout({
  children,
  folderid = undefined,
}: {
  children: React.ReactNode
  folderid?: string
}) {
  const navigate = useNavigate()
  // Refs for hidden inputs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [folderName, setFolderName] = useState('')

  // Upload & Drag States
  const [isDragging, setIsDragging] = useState(false)
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
        `${process.env.BUN_SERVER_URL}/file/presign-url`,
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
        `${process.env.BUN_SERVER_URL}/file/finish-upload`,
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

  // 2. Drag and Drop Handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileUpload(e.dataTransfer.files)
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

  const handelFolderFlow = async () => {
    navigate({
      to: `/drive/folder/$folderid/flow`,
      params: { folderid: folderid ? folderid : 'my-drive' },
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // 1. Detect the first part of the sequence: Alt + C
      if (e.altKey && key === 'c') {
        e.preventDefault() // Stop browser menu from focusing
        setIsChordActive(true)

        // Reset the chord if the user doesn't press 'f' within 2 seconds
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current)
        chordTimeoutRef.current = setTimeout(() => {
          setIsChordActive(false)
        }, 2000)

        return
      }

      // 2. Detect the second part: F (only if Alt+C was just pressed)
      if (isChordActive && key === 'f') {
        e.preventDefault()
        setIsChordActive(false) // Reset state
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current)

        setShowFolderDialog(true) // open new folder creat dialog
      } else if (isChordActive && key === 'u') {
        e.preventDefault()
        setIsChordActive(false) // Reset state
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current)

        fileInputRef.current?.click() // tak file from user
      } else if (isChordActive && key === 'i') {
        e.preventDefault()
        setIsChordActive(false) // Reset state
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current)

        folderInputRef.current?.click() // tak folder from user
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current)
    }
  }, [isChordActive])

  return (
    <div
      className="relative h-full w-full"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <ContextMenu>
        <ContextMenuTrigger className="h-full w-full">
          <div
            className={cn(
              'h-full w-full transition-colors duration-200 rounded-xl',
              isDragging && 'bg-primary/20 ring ring-primary/50 ring-inset', // Dragging styles
            )}
          >
            {/* Visual Overlay for dragging */}
            {isDragging && (
              <div className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center pb-4">
                <div className="flex flex-col items-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground shadow-2xl">
                  <IconCloudUpload size={30} className="animate-bounce" />
                  <p className="text-xl font-semibold">Drop to upload items</p>
                </div>
              </div>
            )}

            {children}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="min-w-64 w-full">
          <ContextMenuItem
            onClick={() => setShowFolderDialog(true)}
            className="gap-4 justify-between"
          >
            <div className="flex gap-2 items-center">
              <IconFolderPlus className="mr-2 h-4 w-4" />
              <span>New Folder</span>
            </div>

            <KbdGroup>
              <Kbd>Alt</Kbd>
              <span>+</span>
              <Kbd>c</Kbd>
              <span className=" text-xs">then</span>
              <Kbd>f</Kbd>
            </KbdGroup>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => fileInputRef.current?.click()}
            className="gap-4 justify-between"
          >
            <div className="flex gap-2 items-center">
              <IconFile className="mr-2 h-4 w-4" />
              <span>File Upload</span>
            </div>

            <KbdGroup>
              <Kbd>Alt</Kbd>
              <span>+</span>
              <Kbd>c</Kbd>
              <span className=" text-xs">then</span>
              <Kbd>u</Kbd>
            </KbdGroup>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => folderInputRef.current?.click()}
            className="gap-4 justify-between"
          >
            <div className="flex gap-2 items-center">
              <IconFolderUp className="mr-2 h-4 w-4" />
              <span>Folder Upload</span>
            </div>

            <KbdGroup>
              <Kbd>Alt</Kbd>
              <span>+</span>
              <Kbd>c</Kbd>
              <span className=" text-xs">then</span>
              <Kbd>i</Kbd>
            </KbdGroup>
          </ContextMenuItem>

          {folderid && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handelFolderFlow}>
                <div className="flex gap-2 items-center">
                  <IconActivity className="mr-2 h-4 w-4" />
                  <span>Folder Trigger-Actions</span>
                </div>
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

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
    </div>
  )
}

export default DriveWrapperLayout
