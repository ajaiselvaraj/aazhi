// ═══════════════════════════════════════════════════════════════
// useWorkflow — Dynamic Process Hierarchy Hook
// Fetches workflow stage definitions from the backend (Single Source of Truth).
// Falls back to hardcoded defaults if the API is unreachable.
// Caches in module-level Map for the session duration (60s TTL).
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { apiClient } from '../services/api/apiClient';

export interface WorkflowStage {
    key: string;
    label: string;
    color?: string;
}

// Module-level session cache — survives re-renders without re-fetching
const _cache: Map<string, { data: WorkflowStage[]; ts: number }> = new Map();
const CACHE_TTL_MS = 60_000; // 60 seconds

// ─── Hardcoded fallbacks (mirrors DB seed data) ──────────
const FALLBACK_STAGES: Record<string, WorkflowStage[]> = {
    complaint: [
        { key: 'pending',     label: 'Submitted',   color: 'slate' },
        { key: 'assigned',    label: 'Assigned',    color: 'blue' },
        { key: 'in_progress', label: 'In Progress', color: 'indigo' },
        { key: 'resolved',    label: 'Resolved',    color: 'green' },
        { key: 'closed',      label: 'Closed',      color: 'emerald' },
    ],
    service_request: [
        { key: 'created',    label: 'Submitted',   color: 'slate' },
        { key: 'assigned',   label: 'Assigned',    color: 'blue' },
        { key: 'working',    label: 'In Progress', color: 'indigo' },
        { key: 'completed',  label: 'Completed',   color: 'green' },
    ],
};

// ─── Hook ─────────────────────────────────────────────────
export function useWorkflow(type: 'complaint' | 'service_request') {
    const [stages, setStages] = useState<WorkflowStage[]>(FALLBACK_STAGES[type]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const cached = _cache.get(type);
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
            setStages(cached.data);
            setLoading(false);
            return;
        }

        let mounted = true;
        setLoading(true);
        setError(false);

        (async () => {
            try {
                // Public endpoint — no auth required
                const data = await apiClient.get<WorkflowStage[]>(
                    `/complaints/workflow/${type}`
                );
                if (mounted && Array.isArray(data) && data.length >= 2) {
                    _cache.set(type, { data, ts: Date.now() });
                    setStages(data);
                }
            } catch (err) {
                // Silently use fallback — user experience is preserved
                console.warn(`[useWorkflow] Could not fetch workflow for '${type}', using fallback.`);
                if (mounted) setError(true);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [type]);

    // Build a stage-key → index map for the tracker to use
    const stageIndexMap: Record<string, number> = {};
    stages.forEach((s, i) => { stageIndexMap[s.key] = i; });

    return { stages, stageIndexMap, loading, error };
}

// ─── Utility: invalidate cache (call after admin saves workflow) ─
export function invalidateWorkflowCache(type?: string) {
    if (type) {
        _cache.delete(type);
    } else {
        _cache.clear();
    }
}
