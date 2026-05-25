import { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';
import { AuditLog } from '@/types';
import { auditService } from '@/services/auditService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  PRICE_UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  CANCEL: 'bg-orange-100 text-orange-700',
};

const ENTITIES = ['', 'Bill', 'Product', 'User', 'Purchase', 'Return'];

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (p: number, entity: string) => {
    setLoading(true);
    try {
      const res = await auditService.getAll(p, 50, entity || undefined);
      setLogs(res.data.data.data);
      setTotal(res.data.data.meta.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, entityFilter);
  }, [load, page, entityFilter]);

  const handleFilterChange = (entity: string) => {
    setEntityFilter(entity);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">{total} events recorded</p>
          </div>
        </div>
      </div>

      {/* Entity filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {ENTITIES.map((e) => (
          <button
            key={e || 'all'}
            onClick={() => handleFilterChange(e)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              entityFilter === e
                ? 'border-primary bg-primary text-white'
                : 'hover:bg-muted'
            }`}
          >
            {e || 'All'}
          </button>
        ))}
      </div>

      {/* Logs table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Entity</th>
              <th className="px-4 py-3 text-left font-medium">By</th>
              <th className="px-4 py-3 text-left font-medium">When</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No audit logs found</td></tr>
            ) : (
              logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{log.entity}</span>
                      {log.entityId && (
                        <span className="ml-1 text-xs text-muted-foreground font-mono">
                          #{log.entityId.slice(-6)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.userName || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(log.before || log.after) ? 'Click to expand' : '—'}
                    </td>
                  </tr>
                  {expandedId === log.id && (log.before || log.after) && (
                    <tr key={`${log.id}-expanded`} className="border-b bg-muted/10">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                          {log.before && (
                            <div>
                              <p className="font-semibold text-muted-foreground mb-1">Before</p>
                              <pre className="rounded bg-muted p-2 font-mono overflow-auto">
                                {JSON.stringify(log.before, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.after && (
                            <div>
                              <p className="font-semibold text-muted-foreground mb-1">After</p>
                              <pre className="rounded bg-muted p-2 font-mono overflow-auto">
                                {JSON.stringify(log.after, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 border-t p-3">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="flex items-center text-sm">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
