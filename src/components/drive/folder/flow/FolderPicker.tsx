import { useState } from 'react';
import { useQuery } from 'convex/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconChevronRight, IconFolderSearch, IconArrowLeft, IconLoader2, IconFolderFilled } from '@tabler/icons-react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

function FolderPicker({ 
  onSelect, 
  currentValue,
  currentName // 1. Added prop for the name
}: { 
  onSelect: (id: string, name: string) => void, // 2. Updated signature
  currentValue?: string,
  currentName?: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<Id<'driveItems'> | null>(null);

  const folderUI = useQuery(api.drive.getDirectoryContents, { 
    folderId: currentFolderId 
  });

  const handleBack = () => {
    if (!folderUI || folderUI.breadcrumbs.length <= 1) return;
    const parentFolder = folderUI.breadcrumbs[folderUI.breadcrumbs.length - 2];
    setCurrentFolderId(parentFolder.id as Id<'driveItems'> | null);
  };

  const handleConfirmSelection = () => {
    // 3. Pass both ID and Name back to the parent
    const id = currentFolderId === null ? "my-drive" : currentFolderId;
    const name = folderUI?.current.name || "My Drive";
    onSelect(id, name);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-xs h-9 gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all">
          <IconFolderSearch size={16} className="text-muted-foreground" />
          {currentValue ? ( // 4. Show Name if it exists, otherwise fallback to "Choose..."
            <span className="truncate flex items-center gap-2">
              <IconFolderFilled size={14} className="text-blue-500" />
              {currentName?currentName:("ID : "+currentName)}
            </span>
          ) : (
            "Choose Target Folder..."
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Destination</DialogTitle>
          <DialogDescription>
            Choose where the automated files should be moved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center gap-2">
            {currentFolderId !== null && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleBack}
              >
                <IconArrowLeft size={16} />
              </Button>
            )}
            <div className="text-sm font-bold truncate">
              {folderUI?.current.name || "Loading..."}
            </div>
          </div>

          <ScrollArea className="h-64 rounded-md border bg-muted/20 p-2">
            {!folderUI ? (
              <div className="flex h-full items-center justify-center">
                <IconLoader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : folderUI.folders.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground flex-col gap-2">
                <IconFolderFilled size={32} className="opacity-10" />
                No sub-folders here.
              </div>
            ) : (
              <div className="space-y-1">
                {folderUI.folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setCurrentFolderId(folder.id as Id<'driveItems'>)}
                    className="flex w-full items-center justify-between rounded-lg p-2 text-sm hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <IconFolderFilled
                        size={18}
                        style={{ color: folder.color !== "current" ? folder.color : undefined }}
                      />
                      <span className="font-medium">{folder.name}</span>
                    </div>
                    <IconChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="sm:justify-between items-center">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest bg-muted px-2 py-1 rounded">
            Target: {folderUI?.current.name}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSelection} disabled={!folderUI} className="px-6">
              Pick This Folder
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FolderPicker;