import { EnumValuesInput } from './EnumValuesInput'
import type { JsonContractField } from '@/types/contract'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type ContractFieldRowProps = {
  field: JsonContractField
  depth: number
  label: string
  isContainer: boolean
  onChange: (field: JsonContractField) => void
}

export function ContractFieldRow({
  field,
  depth,
  label,
  isContainer,
  onChange,
}: ContractFieldRowProps) {
  return (
    <TableRow className={cn(isContainer && 'bg-muted/25 hover:bg-muted/40')}>
      <TableCell className="px-4">
        <div
          className="flex min-w-0 items-center gap-2"
          style={{ paddingLeft: `${depth * 1.25}rem` }}
        >
          {depth > 0 && <span className="h-px w-3 shrink-0 bg-border" />}
          <code
            className={cn(
              'block truncate rounded-sm px-2 py-1 font-mono text-xs text-foreground',
              isContainer ? 'bg-background font-semibold' : 'bg-muted',
            )}
            title={field.path}
          >
            {label}
          </code>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={isContainer ? 'outline' : 'secondary'}>
          {field.type}
        </Badge>
      </TableCell>
      <TableCell>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            size="sm"
            checked={field.required}
            onCheckedChange={(checked) =>
              onChange({ ...field, required: checked })
            }
          />
          Required
        </label>
      </TableCell>
      <TableCell>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            size="sm"
            checked={field.nullable}
            onCheckedChange={(checked) =>
              onChange({ ...field, nullable: checked })
            }
          />
          Nullable
        </label>
      </TableCell>
      <TableCell>
        {isContainer ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <EnumValuesInput
            value={field.enumValues}
            onChange={(enumValues) => onChange({ ...field, enumValues })}
          />
        )}
      </TableCell>
      <TableCell className="pr-4">
        <Input
          value={field.description ?? ''}
          onChange={(event) =>
            onChange({
              ...field,
              description: event.currentTarget.value || undefined,
            })
          }
          placeholder="Optional note"
        />
      </TableCell>
    </TableRow>
  )
}
