import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, ArrowRight, Globe, LogOut } from 'lucide-react';
import { api, pincode } from '../api';
import { UI } from '../i18n';
import { datumTekst, vul } from './FormPage';

// De startpagina. Sinds 21-11-2026 is inloggen met de pincode van het
// gezelschap de hoofdweg: je ziet je voorstellingen en opent per voorstelling
// je inzending, die dan al aan de voorstelling hangt. Een losse link openen
// (of zonder pincode beginnen) staat eronder als terugval, voor wie al
// begonnen was voordat dit er was.
export function LandingPage({ onStart, onCheck }) {
    const [lang, setLang] = useState('nl');
    const [tokenInput, setTokenInput] = useState('');
    const [bezig, setBezig] = useState(false);
    const [error, setError] = useState(null);
    const [deadlines, setDeadlines] = useState(null);
    const [pin, setPin] = useState('');
    const [mijn, setMijn] = useState(null);
    const [laden, setLaden] = useState(() => !!pincode.lees());
    const t = UI[lang];

    useEffect(() => { api.deadlines().then(setDeadlines).catch(() => {}); }, []);

    // Nog ingelogd van de vorige keer? Dan meteen het overzicht.
    useEffect(() => {
        if (!pincode.lees()) return;
        api.mijn()
            .then((r) => { setMijn(r); setLang(r.company?.voertaal || 'nl'); })
            .catch((e) => { if (e.status === 401) pincode.weg(); })
            .finally(() => setLaden(false));
    }, []);

    const inloggen = async (e) => {
        e.preventDefault();
        const p = pin.replace(/\D/g, '');
        if (!p) return;
        setBezig(true);
        setError(null);
        try {
            const r = await api.login(p);
            pincode.zet(p);
            setMijn(r);
            setLang(r.company?.voertaal || lang);
            setPin('');
        } catch (err) {
            setError(err.status === 401 ? t.pin_wrong : err.message);
        } finally {
            setBezig(false);
        }
    };

    const uitloggen = () => { pincode.weg(); setMijn(null); };

    const openVoorstelling = useCallback(async (v) => {
        const s = v.inzendingen?.[0];
        if (s && ['naar_maker', 'akkoord', 'doorgezet'].includes(s.status)) return onCheck(s.unique_token);
        if (s) return onStart(s.unique_token);
        setBezig(true);
        setError(null);
        try {
            const r = await api.openVoor(v.id);
            onStart(r.unique_token);
        } catch (err) {
            setError(err.message);
            setBezig(false);
        }
    }, [onStart, onCheck]);

    const startNew = async () => {
        setBezig(true);
        try {
            const res = await api.start(lang);
            onStart(res.unique_token);
        } catch (e) {
            setError(e.message);
            setBezig(false);
        }
    };

    const openExisting = () => {
        const v = tokenInput.trim();
        if (!v) return;
        const match = v.match(/(?:inzending|submission|check)\/([A-Za-z0-9_-]{8,})/);
        onStart(match ? match[1] : v);
    };

    const dl = mijn || deadlines;

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-[#9f4493] text-white">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Megaphone size={22} />
                        <span className="font-bold text-lg">CTF Marketing</span>
                    </div>
                    <LangSwitch lang={lang} setLang={setLang} />
                </div>
            </header>

            <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
                <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 md:p-12">
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{t.title}</h1>
                    <p className="text-slate-500 mb-8">{t.subtitle}</p>

                    {(dl?.deadline || dl?.deadline_aanpassen) && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm mb-8 space-y-1">
                            {dl.deadline && <p className="font-semibold">{vul(t.deadline, datumTekst(dl.deadline, lang))}</p>}
                            {dl.deadline_aanpassen && <p>{vul(t.deadline_aanpassen, datumTekst(dl.deadline_aanpassen, lang))}</p>}
                        </div>
                    )}

                    {laden ? (
                        <p className="text-slate-400">…</p>
                    ) : mijn ? (
                        <Overzicht mijn={mijn} t={t} bezig={bezig} onOpen={openVoorstelling} onUitloggen={uitloggen} />
                    ) : (
                        <form onSubmit={inloggen}>
                            <p className="text-slate-700 mb-4">{t.pin_intro}</p>
                            <label className="block text-sm font-semibold mb-1" htmlFor="pincode">{t.pin_label}</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    id="pincode"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-lg tracking-widest"
                                />
                                <button
                                    type="submit"
                                    disabled={bezig || !pin.trim()}
                                    className="bg-[#9f4493] hover:bg-[#7e3573] text-white font-semibold px-6 py-2 rounded-full flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {bezig ? '…' : t.pin_login} <ArrowRight size={18} />
                                </button>
                            </div>
                        </form>
                    )}

                    {error && <p className="text-sm text-red-600 mt-3" role="alert">{error}</p>}

                    {!mijn && !laden && (
                        <details className="mt-10 pt-6 border-t border-slate-200">
                            <summary className="font-semibold text-sm cursor-pointer text-slate-600">{t.fallback}</summary>
                            <p className="text-sm text-slate-600 mt-3 mb-4">{t.fallback_intro}</p>
                            <h3 className="font-semibold text-sm mb-2">{t.existing_token}</h3>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    value={tokenInput}
                                    onChange={(e) => setTokenInput(e.target.value)}
                                    placeholder={t.existing_token_placeholder}
                                    className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm"
                                />
                                <button
                                    onClick={openExisting}
                                    disabled={!tokenInput.trim()}
                                    className="bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50"
                                >{t.open}</button>
                            </div>
                            <button onClick={startNew} disabled={bezig} className="mt-4 text-sm text-[#9f4493] hover:underline disabled:opacity-50">
                                {t.new_submission}
                            </button>
                        </details>
                    )}
                </div>
            </main>
        </div>
    );
}

function Overzicht({ mijn, t, bezig, onOpen, onUitloggen }) {
    const lijst = mijn.voorstellingen || [];
    return (
        <div>
            <div className="flex items-center justify-between gap-3 mb-4">
                <p className="font-semibold">{vul(t.pin_welcome, mijn.company?.name || '')}</p>
                <button onClick={onUitloggen} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
                    <LogOut size={14} /> {t.pin_logout}
                </button>
            </div>
            {lijst.length === 0 ? (
                <p className="text-slate-600">{t.pin_none}</p>
            ) : (
                <>
                    <p className="text-slate-600 mb-4">{t.pin_choose}</p>
                    <ul className="space-y-3">
                        {lijst.map((v) => {
                            const s = v.inzendingen?.[0];
                            const stand = s ? (t[`st_${s.status}`] || s.status) : t.st_none;
                            const knop = !s ? t.pin_fill
                                : s.status === 'draft' ? t.pin_continue
                                : s.status === 'naar_maker' ? t.pin_check
                                : s.status === 'submitted' && s.aanpasbaar ? t.pin_edit
                                : t.pin_view;
                            return (
                                <li key={v.id} className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold">{v.titel || '—'}{v.jaar ? <span className="text-slate-400 font-normal"> · {v.jaar}</span> : null}</p>
                                        <p className={`text-sm ${s?.status === 'naar_maker' ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>{stand}</p>
                                    </div>
                                    <button
                                        onClick={() => onOpen(v)}
                                        disabled={bezig}
                                        className="bg-[#9f4493] hover:bg-[#7e3573] text-white text-sm font-semibold px-5 py-2 rounded-full flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {knop} <ArrowRight size={16} />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </div>
    );
}

function LangSwitch({ lang, setLang }) {
    return (
        <div className="flex items-center gap-1 bg-white/15 rounded-full p-1 border border-white/20">
            <Globe size={14} className="text-white/80 ml-1" />
            {['nl', 'en'].map(l => (
                <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase transition ${lang === l ? 'bg-white text-[#9f4493]' : 'text-white/70'}`}
                >{l}</button>
            ))}
        </div>
    );
}
