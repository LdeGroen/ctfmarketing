import { useEffect, useRef, useState } from 'react';

/**
 * Debounced autosave hook.
 *
 * @param {object} data        — de huidige formulier-state
 * @param {function} saveFn    — async functie die data accepteert en opslaat
 * @param {number} delayMs     — debounce-tijd
 *
 * Returns: { status: 'idle'|'saving'|'saved'|'error', lastError, flush }
 */
export function useAutosave(data, saveFn, delayMs = 800) {
    const [status, setStatus] = useState('idle');
    const [lastError, setLastError] = useState(null);
    const timerRef = useRef(null);
    const lastSavedRef = useRef(null);
    const isFirstRun = useRef(true);
    const inFlightRef = useRef(false);
    const pendingRef = useRef(null);

    useEffect(() => {
        // Skip eerste run (initial load uit backend)
        if (isFirstRun.current) {
            isFirstRun.current = false;
            lastSavedRef.current = JSON.stringify(data);
            return;
        }
        const serialized = JSON.stringify(data);
        if (serialized === lastSavedRef.current) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        setStatus('saving');
        timerRef.current = setTimeout(async () => {
            await runSave(serialized);
        }, delayMs);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    async function runSave(serialized) {
        if (inFlightRef.current) {
            // Plaats deze save in de wachtrij; we vuren 'm direct af na current
            pendingRef.current = serialized;
            return;
        }
        inFlightRef.current = true;
        try {
            await saveFn(JSON.parse(serialized));
            lastSavedRef.current = serialized;
            setStatus('saved');
            setLastError(null);
        } catch (e) {
            setStatus('error');
            setLastError(e.message || String(e));
        } finally {
            inFlightRef.current = false;
            if (pendingRef.current && pendingRef.current !== lastSavedRef.current) {
                const next = pendingRef.current;
                pendingRef.current = null;
                setStatus('saving');
                runSave(next);
            }
        }
    }

    const flush = async () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        const serialized = JSON.stringify(data);
        if (serialized !== lastSavedRef.current) {
            await runSave(serialized);
        }
    };

    return { status, lastError, flush };
}
