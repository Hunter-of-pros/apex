import React, { useState, useMemo } from 'react';
import { AuditLogEntry } from '../../types';
import { FileText, Search, Filter, Clock, ShieldCheck } from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
  loading: boolean;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs, loading }) => {
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      if (filterType && item.event_type !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          (item.accession_number && item.accession_number.toLowerCase().includes(q)) ||
          item.event_type.toLowerCase().includes(q) ||
          item.actor.toLowerCase().includes(q) ||
          item.details_json.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [logs, filterType, search]);

  const eventTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.event_type));
    return Array.from(set);
  }, [logs]);

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-primary overflow-hidden">
      {/* Top Filter Bar */}
      <div className="bg-bg-secondary border-b border-border-subtle p-3 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-accent" />
          <span className="font-sans font-bold text-sm text-text-primary">
            Clinical Audit & Regulatory Ledger
          </span>
          <span className="font-mono text-2xs px-1.5 py-0.2 bg-bg-tertiary border border-border-strong rounded-xs text-text-muted">
            {filteredLogs.length} EVENTS RECORDED
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full bg-bg-primary border border-border-subtle rounded-xs pl-7 pr-2.5 py-1 text-xs text-text-primary font-mono focus:border-border-focus"
            />
          </div>

          {/* Event Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-bg-primary border border-border-subtle rounded-xs px-2 py-1 text-xs text-text-secondary font-mono focus:border-border-focus"
          >
            <option value="">All Event Types</option>
            {eventTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse font-mono text-2xs">
          <thead className="bg-bg-secondary sticky top-0 z-10 border-b border-border-strong text-text-muted uppercase text-[10px] select-none">
            <tr>
              <th className="py-2 px-3 font-semibold w-20">ID</th>
              <th className="py-2 px-3 font-semibold w-40">Timestamp (UTC)</th>
              <th className="py-2 px-3 font-semibold w-44">Accession</th>
              <th className="py-2 px-3 font-semibold">Event Classification</th>
              <th className="py-2 px-3 font-semibold w-36">Actor ID</th>
              <th className="py-2 px-3 font-semibold text-right w-24">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-muted">
                  Loading immutable audit log...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-text-muted">
                  No audit log events match active filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedId === log.id;
                let parsedDetails = null;
                try {
                  parsedDetails = JSON.parse(log.details_json);
                } catch {
                  parsedDetails = log.details_json;
                }

                return (
                  <React.Fragment key={log.id}>
                    <tr className="border-b border-border-subtle/70 hover:bg-bg-secondary/70 transition-colors">
                      <td className="py-2 px-3 text-text-muted">#{log.id}</td>
                      <td className="py-2 px-3 text-text-secondary whitespace-nowrap">
                        {new Date(log.created_at).toISOString().replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="py-2 px-3 text-text-primary font-bold">
                        {log.accession_number || '—'}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded-xs font-semibold ${
                            log.event_type.startsWith('CLINICIAN_AGREE')
                              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60'
                              : log.event_type.startsWith('CLINICIAN_DISAGREE')
                              ? 'bg-red-950/40 text-red-300 border border-red-800/60'
                              : log.event_type.startsWith('CLINICIAN_DEFER')
                              ? 'bg-amber-950/40 text-amber-300 border border-amber-800/60'
                              : 'bg-bg-tertiary text-text-secondary border border-border-subtle'
                          }`}
                        >
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-text-secondary">{log.actor}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="px-2 py-0.5 text-[10px] bg-bg-tertiary hover:bg-bg-elevated border border-border-subtle rounded-xs text-text-secondary hover:text-text-primary"
                        >
                          {isExpanded ? 'Hide' : 'Inspect'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded JSON Inspector */}
                    {isExpanded && (
                      <tr className="bg-bg-secondary/90 border-b border-border-strong">
                        <td colSpan={6} className="p-3">
                          <div className="bg-bg-primary p-2.5 rounded-xs border border-border-subtle overflow-x-auto text-[11px] text-text-secondary">
                            <pre>{JSON.stringify(parsedDetails, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
