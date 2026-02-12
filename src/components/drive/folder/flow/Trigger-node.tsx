import { Card } from '@/components/ui/card'
import { IconCloudUpload, IconPlayerPlayFilled } from '@tabler/icons-react'
import { Handle, Position } from '@xyflow/react'

function TriggerNode() {
  return (
    <Card className="p-4 border-2 border-primary min-w-64 bg-linear-to-br from-background to-card shadow-xl">
    <div className="flex items-center gap-2 mb-3 text-primary font-bold text-[10px] uppercase">
      <IconPlayerPlayFilled size={14} /> When this happens...
    </div>
    <div className="flex items-center gap-3 p-2 bg-primary/5 rounded-md border border-primary/20">
      <IconCloudUpload size={20} className="text-primary" />
      <span className="text-sm font-semibold">File is Uploaded</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-2! h-2! bg-primary!" />
  </Card>
  )
}

export default TriggerNode