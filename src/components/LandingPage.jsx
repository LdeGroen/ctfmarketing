import React, { useState } from 'react';
import { Megaphone, ArrowRight, Globe } from 'lucide-react';
import { api } from '../api';
import { UI } from '../i18n';

export function LandingPage({ onStart }) {
    const [lang, setLang] = useState('nl');
    const [tokenInput, setTokenInput] = useState('');
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState(null);
    const t = UI[lang];

    const startNew = async () => {
        setStarting(true);
        try {
            const res = await api.start(lang);
            onStart(res.unique_token);
        } catch (e) {
            setError(e.message);
            setStarting(false);
        }
    };

    const openExisting = () => {
        const v = tokenInput.trim();
        if (!v) return;
        const match = v.match(/(?:inzending|submission|check)\/([A-Za-z0-9_-]{8,})/);
        const token = match ? match[1] : v;
        onStart(token);
    };

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
                <div className="bg-white rounded-2xl shadow-md p-8 md:p-12">
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{t.title}</h1>
                    <p className="text-slate-500 mb-8">{t.subtitle}</p>

                    <p className="text-slate-700 mb-8">{t.landing_intro}</p>

                    <button
                        onClick={startNew}
                        disabled={starting}
                        className="w-full sm:w-auto bg-[#9f4493] hover:bg-[#7e3573] text-white font-semibold px-6 py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {starting ? '…' : t.new_submission} <ArrowRight size={18} />
                    </button>

                    <div className="mt-10 pt-6 border-t border-slate-200">
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
                    </div>

                    {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
                </div>
            </main>
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
