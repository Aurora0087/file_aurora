import { useEffect, useMemo } from 'react' // Added useMemo and useEffect
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  IconScissors,
  IconAlertCircle,
  IconVideo,
  IconTrash,
} from '@tabler/icons-react'
import {
  Handle,
  NodeProps,
  Position,
  Node,
  useNodeConnections,
  useNodes,
} from '@xyflow/react'
import FolderPicker from './FolderPicker'

export type ActionNodeData = {
  action: string
  targetFolder?: string
  targetFolderName?: string
  format?: string
  quality?: string
  onChange: (id: string, key: string, value: string) => void
  onDelete: (id: string) => void
}

export type ActionNode = Node<ActionNodeData, 'action'>

function ActionNode({ id, data }: NodeProps<ActionNode>) {
  const nodes = useNodes()
  const connections = useNodeConnections({ handleType: 'target' })

  const sourceNode =
    connections.length > 0
      ? nodes.find((n) => n.id === connections[0].source)
      : null

  const connectedFilterField = sourceNode?.data?.field as string | undefined
  const connectedFilterValue = sourceNode?.data?.value as string | undefined

  // 1. Get Available Actions (Always include Move to Folder)
  const availableActions = useMemo(() => {
    const moveAction = { label: 'Move to Folder', value: 'move' }
    
    // Video Context
    if (connectedFilterField === 'media_type' && connectedFilterValue === 'video') {
      return [
        { label: 'Change Resolution', value: 'change-quality' },
        { label: 'Convert Format', value: 'convert-format' },
        { label: 'Compress Video', value: 'compress' },
        moveAction,
      ]
    }

    // Generic Contexts
    switch (connectedFilterField) {
      case 'media_type': // Image
        return [
          { label: 'Remove Background', value: 'remove-bg' },
          { label: 'Compress Image', value: 'compress' },
          { label: 'Convert to PDF', value: 'pdf' },
          moveAction,
        ]
      case 'size':
        return [
          { label: 'Compress File', value: 'compress' },
          moveAction,
        ]
      case 'name':
        return [
            moveAction,
            { label: 'Rename File', value: 'rename' },
        ]
      default:
        return [moveAction]
    }
  }, [connectedFilterField, connectedFilterValue])

  // 2. Logic: Auto-select default value when filter context changes
  useEffect(() => {
    if (!sourceNode) return;

    const isValid = availableActions.some(a => a.value === data.action);
    
    // If current action is not valid for the new filter, or no action selected
    if (!isValid || !data.action) {
      // Default to "move" if available, otherwise pick the first valid action
      const defaultAction = availableActions.find(a => a.value === 'move') || availableActions[0];
      if (defaultAction) {
        data.onChange(id, 'action', defaultAction.value);
      }
    }
  }, [availableActions, sourceNode, data.action, id])

  const isTerminalAction = data.action === 'move' || data.action === 'delete'
  const isVideoMode = connectedFilterField === 'media_type' && connectedFilterValue === 'video'

  return (
    <Card className="p-4 border-2 border-green-500 min-w-64 bg-linear-to-br from-background to-card shadow-xl">
      <Handle type="target" position={Position.Top} className="w-2! h-2! bg-green-500!" />

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 text-green-500 font-bold text-[10px] uppercase">
          <IconScissors size={14} /> Then do this...
        </div>

        <Button
          onClick={() => data.onDelete(id)}
          variant="destructive"
          size="icon-sm"
          className="rounded-full"
        >
          <IconTrash size={16} />
        </Button>
      </div>

      {!sourceNode ? (
        <div className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] mb-2">
          <IconAlertCircle size={14} />
          Connect a filter to see actions
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mb-2 text-[9px] text-muted-foreground italic">
          {isVideoMode && <IconVideo size={14} className="text-blue-500" />}
          Context: Actions for{' '}
          <strong>{connectedFilterValue || connectedFilterField}</strong>
        </div>
      )}

      <div className="space-y-3">
        <Select
          value={data.action}
          onValueChange={(val) => data.onChange(id, 'action', val)}
          disabled={!sourceNode}
        >
          <SelectTrigger className="w-full text-xs h-9">
            <SelectValue placeholder="Select Action" />
          </SelectTrigger>
          <SelectContent>
            {availableActions.map((act) => (
              <SelectItem key={act.value} value={act.value}>
                {act.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Dynamic Inputs based on Action */}
        {data.action === 'move' && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Target Folder
            </Label>
            <FolderPicker
              currentValue={data.targetFolder}
              currentName={data.targetFolderName}
              onSelect={(folderId, folderName) => {
                data.onChange(id, 'targetFolder', folderId)
                data.onChange(id, 'targetFolderName', folderName)
              }}
            />
          </div>
        )}

        {data.action === 'change-quality' && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Target Resolution</Label>
            <Select value={data.quality || '720p'} onValueChange={(v) => data.onChange(id, 'quality', v)}>
              <SelectTrigger className="w-full text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                <SelectItem value="720p">720p (HD)</SelectItem>
                <SelectItem value="480p">480p (SD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {data.action === 'convert-format' && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Target Format</Label>
            <Select value={data.format || 'mp4'} onValueChange={(v) => data.onChange(id, 'format', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4</SelectItem>
                <SelectItem value="webm">WebM</SelectItem>
                <SelectItem value="mov">MOV</SelectItem>
                <SelectItem value="gif">Animated GIF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={!isTerminalAction}
        className={`w-2! h-2! transition-colors duration-300 ${
          isTerminalAction ? 'bg-muted! cursor-not-allowed' : 'bg-green-500!'
        }`}
      />

      {isTerminalAction && (
        <div className="absolute -bottom-10 left-0 w-full bg-background rounded-xl ring ring-muted p-2 text-center text-[10px] text-muted-foreground uppercase font-medium">
          Flow Ends Here
        </div>
      )}
    </Card>
  )
}

export default ActionNode;