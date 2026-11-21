import { useEffect, useRef, useState } from 'react';

/**
 * Debounced autosave hook.
 *
 * @param {object} data        — de huidige formulier-state
 * @param {function} saveFn    — async functie die data accepteert en opslaat
 * @param {number} delayMs     — debounce-tijd
 *
 * Returns: { status: 'idle'|'saving'|'saved'|'error', lastError, flush }
 *
 * `flush()` wacht tot alles echt is opgeslagen, ook een opslag die al onderweg
 * was, en gooit een fout als de laatste opslag mislukte. Tot 21-11-2026 kwam
 * hij meteen terug als er al een opslag liep (de nieuwe stond dan alleen in de
 * wachtrij) en slikte hij een fout in: indienen ging dan door zonder de laatste
 * wijziging (audit FRM-09). Wie alleen wil bewaren zonder te stoppen bij een
 * fout (een stap verder), vangt de fout zelf af.
 */
export function useAutosave(data, saveFn, delayMs = 800) {
    const [status, setStatus] = useState('idle');
    const [lastError, setLastError] = useState(null);
    const timerRef = useRef(null);
    const lastSavedRef = useRef(null);
    const isFirstRun = useRef(true);
    // De opslagen lopen na elkaar; elke stap slaat de nieuwste stand op die er
    // op dat moment is, zodat tussenstanden worden overgeslagen.
    const ketenRef = useRef(Promise.resolve());
    const nieuwsteRef = useRef(null);
    const dataRef = useRef(data);
    dataRef.current = data;
    const saveRef = useRef(saveFn);
    saveRef.current = saveFn;

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
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            // De fout staat al in status/lastError.
            runSave(serialized).catch(() => {});
        }, delayMs);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    function runSave(serialized) {
        nieuwsteRef.current = serialized;
        const stap = ketenRef.current.catch(() => {}).then(async () => {
            const s = nieuwsteRef.current;
            if (s === lastSavedRef.current) return;
            await saveRef.current(JSON.parse(s));
            lastSavedRef.current = s;
        });
        ketenRef.current = stap;
        stap.then(
            () => {
                if (ketenRef.current === stap) {
                    setStatus('saved');
                    setLastError(null);
                }
            },
            (e) => {
                if (ketenRef.current === stap) {
                    setStatus('error');
                    setLastError(e?.message || String(e));
                }
            },
        );
        return stap;
    }

    const flush = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        // Ook als er niets nieuws is: wachten op een opslag die nog loopt.
        return runSave(JSON.stringify(dataRef.current));
    };

    return { status, lastError, flush };
}
