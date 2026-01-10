/**
 * Filtros de búsqueda para reuniones
 */

import { Search, Filter } from 'lucide-react'

interface MeetingsFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
}

export function MeetingsFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: MeetingsFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <SearchInput value={searchQuery} onChange={onSearchChange} />
      <StatusSelect value={statusFilter} onChange={onStatusChange} />
    </div>
  )
}

// ========== Sub-componentes ==========

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar reuniones..."
        className="input pl-10"
      />
    </div>
  )
}

function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-surface-500" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input w-auto"
      >
        <option value="all">Todas</option>
        <option value="scheduled">Programadas</option>
        <option value="in_progress">En curso</option>
        <option value="completed">Completadas</option>
      </select>
    </div>
  )
}

