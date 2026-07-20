import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
  Search, SlidersHorizontal, Trash2, Download, X,
} from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  bulkActions?: { label: string; icon?: React.ElementType; danger?: boolean; onClick: (selected: T[]) => void }[];
  pageSize?: number;
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

type SortDir = 'asc' | 'desc' | null;

const SKELETON_ROWS = 6;

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td className="py-3.5 px-4 border-b border-line dark:border-white/5">
        <div className="skeleton h-4 w-4 rounded" />
      </td>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3.5 px-4 border-b border-line dark:border-white/5">
          <div className={`skeleton h-3.5 rounded ${i === 0 ? 'w-32' : 'w-20'}`} />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T extends object>({
  columns, data, keyField, loading = false,
  emptyTitle = 'No records found', emptyMessage = 'No data matches your current filters.',
  searchable = true, searchPlaceholder = 'Search…', bulkActions = [],
  pageSize = 15, toolbar, onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const getKey = (row: T) => String(row[keyField]);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = (row as Record<string, unknown>)[col.key as string];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey] as string;
      const bv = (b as Record<string, unknown>)[sortKey] as string;
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [search, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(null); setSortDir(null);
  };

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paginated.length) { setSelected(new Set()); }
    else { setSelected(new Set(paginated.map(getKey))); }
  };

  const selectedRows = data.filter(r => selected.has(getKey(r)));
  const hasSelection = selected.size > 0;

  const SortIcon = ({ col }: { col: Column<T> }) => {
    if (!col.sortable) return null;
    const key = col.key as string;
    if (sortKey !== key) return <ChevronsUpDown size={12} className="text-muted/40 ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-ledger ml-1" />
      : <ChevronDown size={12} className="text-ledger ml-1" />;
  };

  return (
    <div className="section-card">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line dark:border-white/5 flex-wrap">
        {searchable && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="input pl-8 h-8 text-xs"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink dark:hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {toolbar}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`btn-ghost py-1.5 px-3 text-xs ${showFilters ? 'bg-line/50 dark:bg-white/10 text-ink dark:text-white' : ''}`}
          >
            <SlidersHorizontal size={13} />
            Filters
          </button>
          <button className="btn-ghost py-1.5 px-3 text-xs">
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {hasSelection && bulkActions.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-ledger/5 dark:bg-white/5 border-b border-ledger/20 dark:border-white/10 animate-slideDown">
          <span className="text-xs font-semibold text-ledger dark:text-white">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-2">
            {bulkActions.map((action, i) => (
              <button
                key={i}
                onClick={() => { action.onClick(selectedRows); setSelected(new Set()); }}
                className={`btn-ghost text-xs py-1 px-2.5 ${action.danger ? 'text-danger hover:bg-danger-light dark:hover:bg-danger/20' : ''}`}
              >
                {action.icon && <action.icon size={12} />}
                {action.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto btn-ghost py-1 px-2 text-xs">
            <X size={12} />
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={paginated.length > 0 && selected.size === paginated.length}
                  onChange={toggleAll}
                  className="rounded border-line dark:border-white/20 accent-ledger cursor-pointer"
                />
              </th>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  style={col.width ? { width: col.width } : {}}
                  onClick={() => col.sortable && toggleSort(col.key as string)}
                  className={col.sortable ? 'cursor-pointer select-none hover:text-ink dark:hover:text-white' : ''}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.header}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <SkeletonRow key={i} cols={columns.length} />
                ))
              : paginated.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-16 text-center">
                    <div className="text-muted dark:text-white/40">
                      <Search size={28} className="mx-auto mb-3 opacity-30" />
                      <div className="text-sm font-semibold text-ink dark:text-white mb-1">{emptyTitle}</div>
                      <div className="text-xs">{emptyMessage}</div>
                    </div>
                  </td>
                </tr>
              )
              : paginated.map(row => {
                const id = getKey(row);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={`${onRowClick ? 'cursor-pointer' : ''} ${selected.has(id) ? 'bg-ledger/5 dark:bg-white/5' : ''}`}
                  >
                    <td className="bg-white dark:bg-transparent" onClick={e => { e.stopPropagation(); toggleRow(id); }}>
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggleRow(id)}
                        className="rounded border-line dark:border-white/20 accent-ledger cursor-pointer"
                      />
                    </td>
                    {columns.map(col => (
                      <td key={String(col.key)} className="dark:bg-transparent dark:text-white/80">
                        {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && sorted.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-line dark:border-white/5 text-xs text-muted dark:text-white/50">
          <span>
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost py-1 px-2 text-xs disabled:opacity-30"
            >
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page - 2 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                    p === page ? 'bg-ledger text-white' : 'hover:bg-line/60 dark:hover:bg-white/10 text-ink dark:text-white'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-ghost py-1 px-2 text-xs disabled:opacity-30"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
