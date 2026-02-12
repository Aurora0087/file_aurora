import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePaginatedQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import {
  IconAdjustmentsFilled,
  IconSearch,
  IconLoader2,
  IconFile,
  IconFolder,
  IconStar,
  IconFolderFilled,
  IconFileFilled,
} from '@tabler/icons-react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import FolderPicker from './folder/flow/FolderPicker'
import { Id } from 'convex/_generated/dataModel'

function DriveSearch() {
  const navigate = useNavigate()
  const [openSearchFilter, setOpenSearchFilter] = useState(false)
  
  // Search States
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Advanced Filter States
  const [mimeType, setMimeType] = useState<string>('all')
  const [isStarred, setIsStarred] = useState<boolean | undefined>(undefined)
  const [parentId, setParentId] = useState<string | undefined>(undefined)
  const [parentName, setParentName] = useState<string | undefined>(undefined)

  // 1. Debounce Logic (Wait 300ms after user stops typing)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(handler)
  }, [query])

  // 2. Convex Query
  const { results, status } = usePaginatedQuery(
    api.drive.advancedSearch,
    {
      searchText: debouncedQuery || undefined,
      filters: {
        mimeType: mimeType === 'all' ? undefined : mimeType,
        isStarred: isStarred,
        parentId: parentId as Id<"driveItems">,

      },
    },
    { initialNumItems: 5 }
  )

  const handleResultClick = (item: any) => {
    setQuery('') // Clear search
    if (item.type === 'folder') {
      navigate({ to: '/drive/folder/$folderid', params: { folderid: item.id } })
    } else {
       navigate({ to: '/drive/file/$fileId', params: { fileId: item.id } })
    }
  }

  return (
    <div className="relative w-full max-w-sm">
      <InputGroup className="w-full">
        <InputGroupInput 
          placeholder="Search files, folders..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <InputGroupAddon>
          {status === 'LoadingFirstPage' ? (
            <IconLoader2 className="animate-spin size-4" />
          ) : (
            <IconSearch size={18} />
          )}
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <Button 
            size="icon-sm" 
            variant="ghost" 
            onClick={() => setOpenSearchFilter(true)}
            className={isStarred || mimeType !== 'all' || parentId ? "text-blue-500" : ""}
          >
            <IconAdjustmentsFilled size={18} />
          </Button>
        </InputGroupAddon>
      </InputGroup>

      {/* --- LIVE RESULTS DROPDOWN --- */}
      {query.length > 0 && (
        <Card className="absolute top-12 w-full z-50 shadow-2xl p-1 border animate-in fade-in slide-in-from-top-2">
          {results.length === 0 && status !== 'LoadingFirstPage' ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No results found</div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => handleResultClick(item)}
                className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md transition-colors text-left"
              >
                {item.type === 'folder' ? (
                   <IconFolderFilled size={18} style={{color:item.color}}/>
                ) : (
                   <IconFileFilled size={18} className="text-muted-foreground" />
                )}
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{item.type}</div>
                </div>
                {item.isStarred && <IconStar size={12} className="fill-amber-400 text-amber-400" />}
              </button>
            ))
          )}
        </Card>
      )}

      {/* --- ADVANCED FILTER DIALOG --- */}
      <Dialog open={openSearchFilter} onOpenChange={setOpenSearchFilter}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Advanced Search</DialogTitle>
            <DialogDescription>Fine-tune your search results</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* MimeType Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">File Type</Label>
              <Select value={mimeType} onValueChange={setMimeType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image/jpeg">Images</SelectItem>
                  <SelectItem value="video/mp4">Videos</SelectItem>
                  <SelectItem value="application/pdf">PDF Documents</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Parent Folder Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">In Folder</Label>
              <FolderPicker 
                currentName={parentName}
                currentValue={parentId}
                onSelect={(id, name) => {
                  setParentId(id === 'my-drive' ? undefined : id);
                  setParentName(name);
                }}
              />
            </div>

            {/* Starred Toggle */}
            <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border">
              <Checkbox 
                id="starred" 
                checked={isStarred} 
                onCheckedChange={(val) => setIsStarred(val === true ? true : undefined)} 
              />
              <Label htmlFor="starred" className="text-sm font-medium cursor-pointer">
                Only show Starred items
              </Label>
            </div>
          </div>

          <div className="flex justify-between mt-2">
            <Button variant="ghost" size="sm" onClick={() => {
              setMimeType('all');
              setIsStarred(undefined);
              setParentId(undefined);
              setParentName(undefined);
            }}>
              Reset Filters
            </Button>
            <Button size="sm" onClick={() => setOpenSearchFilter(false)}>Apply Filters</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DriveSearch
