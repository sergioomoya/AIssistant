/**
 * Separador con texto
 */

interface DividerProps {
  text?: string
}

export function Divider({ text = 'o con email' }: DividerProps) {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-surface-700"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-4 bg-surface-900 text-surface-500">{text}</span>
      </div>
    </div>
  )
}

