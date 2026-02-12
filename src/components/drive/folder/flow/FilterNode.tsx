import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconFilterFilled, IconTrash } from '@tabler/icons-react'
import {
  Handle,
  NodeProps,
  Position,
  Node,
  useNodeConnections,
  HandleProps,
} from '@xyflow/react'

export type FilterNodeData = {
  field: 'name' | 'extension' | 'size' | 'media_type' | string
  operator: string
  value: string
  onChange: (id: string, key: string, value: string) => void;
  onDelete: (id: string) => void;
}

export type FilterNode = Node<FilterNodeData, 'filter'>

function FilterNode({ id, data }: NodeProps<FilterNode>) {
  const getAvailableOperators = () => {
    switch (data.field) {
      case 'name':
        return [
          { label: 'Contains', value: 'contains' },
          { label: 'Equal to', value: 'eq' },
          { label: 'Starts with', value: 'starts_with' },
          { label: 'Ends with', value: 'ends_with' },
        ]
      case 'extension':
        return [{ label: 'Equal to', value: 'eq' }]
      case 'size':
        return [{ label: 'Is Greater Than', value: 'gt' }]
      case 'media_type':
        return [{ label: 'Equal to', value: 'eq' }]
      default:
        return []
    }
  }

  const handleFieldChange = (newField: string) => {
    data.onChange(id, 'field', newField)

    if (newField === 'name') {
      data.onChange(id, 'operator', 'contains')
    } else if (newField === 'size') {
      data.onChange(id, 'operator', 'gt')
    } else if (newField === 'extension') {
      data.onChange(id, 'operator', 'eq')
    } else if (newField === 'media_type') {
      data.onChange(id, 'operator', 'eq')
      // Set a default value so the select isn't empty
      data.onChange(id, 'value', 'image')
    }
  }

  const operators = getAvailableOperators()

  return (
    <Card className="p-4 border-2 border-orange-500 min-w-64 bg-linear-to-br from-background to-card shadow-xl">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2! h-2! bg-primary!"
      />

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 text-orange-500 font-bold text-[10px] uppercase">
          <IconFilterFilled size={14} /> Only if...
        </div>
        
        <Button 
          onClick={() => data.onDelete(id)}
          variant="destructive"
          size="icon-sm"
          className=' rounded-full'
           >
          <IconTrash />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Field Selector */}
        <Select value={data.field} onValueChange={handleFieldChange}>
          <SelectTrigger className="w-full text-xs">
            <SelectValue placeholder="Select Field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">File Name</SelectItem>
            <SelectItem value="extension">Extension (e.g .png)</SelectItem>
            <SelectItem value="media_type">Media type</SelectItem>
            <SelectItem value="size">File Size (MB)</SelectItem>
          </SelectContent>
        </Select>

        {/* Operator Selector */}
        <Select
          value={data.operator}
          onValueChange={(val) => data.onChange(id, 'operator', val)}
        >
          <SelectTrigger className="w-full text-xs">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value Field: Logic for Media Type Dropdown vs Text Input */}
        {data.field === 'media_type' ? (
          <Select
            value={data.value}
            onValueChange={(val) => data.onChange(id, 'value', val)}
          >
            <SelectTrigger className="w-full text-xs h-8">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="w-full text-xs h-8"
            placeholder="Value..."
            value={data.value}
            onChange={(e) => data.onChange(id, 'value', e.target.value)}
          />
        )}
      </div>

      <FilterBottomHandle
        type="source"
        position={Position.Bottom}
        connectionCount={1}
        className="w-2! h-2! bg-green-500! data-[connectable=false]:bg-gray-400!"
      />
    </Card>
  )
}

interface FilterBottomHandleProps extends HandleProps {
  connectionCount?: number
}

const FilterBottomHandle = ({
  connectionCount = 1,
  ...props
}: FilterBottomHandleProps) => {
  const connections = useNodeConnections({
    handleType: props.type,
  })

  return (
    <Handle {...props} isConnectable={connections.length < connectionCount} />
  )
}

export default FilterNode
