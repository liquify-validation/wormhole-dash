import { Search, LayoutGrid, Table2 } from 'lucide-react';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  view: 'cards' | 'table';
  onViewChange: (v: 'cards' | 'table') => void;
  count: number;
}

export default function NetworkSearch({ search, onSearchChange, view, onViewChange, count }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-300">
          Guardians
          <span className="ml-2 text-xs font-normal text-gray-500">({count})</span>
        </h2>
      </div>
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search guardians..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-gray-800/60 border border-gray-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 w-48 transition-all"
          />
        </div>
        {/* View toggle */}
        <div className="flex items-center bg-gray-800/60 rounded-lg border border-gray-700/50 p-0.5">
          <button
            onClick={() => onViewChange('cards')}
            className={`p-1.5 rounded-md transition-colors ${
              view === 'cards' ? 'bg-gray-700 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewChange('table')}
            className={`p-1.5 rounded-md transition-colors ${
              view === 'table' ? 'bg-gray-700 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
