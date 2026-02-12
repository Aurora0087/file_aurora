import * as React from "react"
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'
import { 
  IconDownload, 
  IconFile, 
  IconHistory, 
  IconInfoCircle, 
  IconChevronRight,
  IconClock,
  IconRestore
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from "date-fns" // Optional: for nice dates

// Helper for bytes
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const Route = createFileRoute('/drive/__drive/file/$fileId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { fileId } = Route.useParams()
  
  // 1. Data Fetching
  const data = useQuery(api.drive.getFileDetails, { 
    fileId: fileId as Id<"driveItems"> 
  })
  const touch = useMutation(api.activity.touchItem)

  // 2. Track "Recently Opened"
  React.useEffect(() => {
    touch({ itemId: fileId as Id<"driveItems"> })
  }, [fileId, touch])

  // 3. Loading State
  if (data === undefined) {
    return <FileDetailsSkeleton />
  }

  const { file, parent, versions } = data

  return (
    <div className="flex flex-col h-full bg-background p-6 space-y-8">
      
      {/* --- Breadcrumbs --- */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/drive/my-drive" className="hover:text-primary transition-colors">My Drive</Link>
        <IconChevronRight size={14} />
        {parent?.id && (
          <>
            <Link 
              to="/drive/folder/$folderid" 
              params={{ folderid: parent.id }}
              className="hover:text-primary transition-colors"
            >
              {parent.name}
            </Link>
            <IconChevronRight size={14} />
          </>
        )}
        <span className="text-foreground font-medium truncate max-w-[200px]">{file.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- Left Column: Preview & Main Info --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video w-full rounded-2xl border bg-muted/30 flex items-center justify-center overflow-hidden relative group">
            {file.thumbnail ? (
              <img src={file.thumbnail} alt={file.name} className="h-full w-full object-contain" />
            ) : (
              <IconFile size={80} className="text-muted-foreground/20" />
            )}
            
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <Button asChild variant="secondary" size="lg">
                 <a href={file.url} download={file.name} target="_blank">
                    <IconDownload className="mr-2" /> Download Original
                 </a>
               </Button>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{file.name}</h1>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{file.mimeType}</Badge>
                {file.isPublic && <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Public</Badge>}
                {file.isStarred && <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Starred</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* --- Right Column: Metadata & Version History --- */}
        <div className="space-y-6">
          
          {/* Metadata Card */}
          <div className="rounded-xl border p-4 space-y-4">
            <h3 className="flex items-center gap-2 font-semibold text-sm">
              <IconInfoCircle size={18} /> Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size</span>
                <span className="font-medium">{formatBytes(file.size || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Edited</span>
                <span className="font-medium">{format(file.lastEdited, 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{parent!.name}</span>
              </div>
            </div>
          </div>

          {/* Version History */}
          <div className="rounded-xl border flex flex-col h-100">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-sm">
                <IconHistory size={18} /> Version History
              </h3>
              <Badge variant="secondary">{versions.length}</Badge>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {versions.map((version, index) => (
                  <div key={version._id} className="p-4 hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {index === 0 ? "Current Version" : `Version ${versions.length - index}`}
                          </p>
                          {index === 0 && <div className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <IconClock size={12} /> {format(version.createdAt, 'MMM d, h:mm a')}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          ID: {version.versionId.slice(0, 8)}...
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={version.url} download>
                            <IconDownload size={16} />
                          </a>
                        </Button>
                        {index !== 0 && (
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Restore this version">
                             <IconRestore size={16} />
                           </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

        </div>
      </div>
    </div>
  )
}

function FileDetailsSkeleton() {
  return (
    <div className="p-6 space-y-8 animate-pulse">
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}