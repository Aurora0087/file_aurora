import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMutation, useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'
import { IconCopy, IconCheck, IconLink } from '@tabler/icons-react'
import { toast } from 'sonner'

function ShareDialog({
  isOpen,
  setOpen,
  itemId,
}: {
  isOpen: boolean
  setOpen: (open: boolean) => void
  itemId: string
}) {
  const [duration, setDuration] = useState<string>("never")
  const [copied, setCopied] = useState(false)
  
  const existingLink = useQuery(api.drive.getPublicLink, { fileId: itemId as Id<"driveItems"> })
  const createLink = useMutation(api.drive.createPublicLink)

  const shareUrl = existingLink 
    ? `${window.location.origin}/drive/shared/${existingLink.token}` 
    : ""

  const handleGenerate = async () => {
    try {
      await createLink({
        fileId: itemId as Id<"driveItems">,
        duration: duration as any
      })
      toast.success("Share link generated!")
    } catch (e) {
      toast.error("Failed to generate link")
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success("Link copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconLink size={20} className="text-blue-500" />
            Share with others
          </DialogTitle>
          <DialogDescription>
            Anyone with this link will be able to view and download this file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Link Expiration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className=' w-full'>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="1d">1 Day</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="never">Never (Lifetime)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {existingLink ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Public Link</Label>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={shareUrl} 
                  className="text-xs w-full"
                />
                <Button size="sm" onClick={copyToClipboard} className="h-9 px-3">
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </Button>
              </div>
              {existingLink.expiresAt && (
                <p className="text-[10px] text-amber-600 font-medium">
                  Expires on: {new Date(existingLink.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <Button onClick={handleGenerate} className="w-full">
              Generate Share Link
            </Button>
          )}
        </div>

        <div className="flex justify-between items-center mt-2 pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
          {existingLink && (
             <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleGenerate}>
                Regenerate Link
             </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ShareDialog