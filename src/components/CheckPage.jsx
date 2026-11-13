import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Globe, Mail, AlertTriangle } from 'lucide-react';
import { api } from '../api';
import { UI } from '../i18n';

export function CheckPage({ token }) {
    const [lang, setLang] = useState('nl');
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [approving, setApproving] = useState(false);

    const t = UI[lang];

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const sub = await api.get(token);
                if (cancelled) return;
                setSubmission(sub);
                if (sub.language) setLang(sub.language);
            } catch (e) { setError(e.message); }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const handleApprove = async () => {
        if (!window.confirm(t.check_approve_confirm)) return;
        setApproving(true);
        try {
            const res = await api.approve(token);
            setSubmission(prev => ({ ...prev, status: res.status, approved_at: res.approved_at }));
        } catch (e) {
            alert(e.message);
        } finally { setApproving(false); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">…</p></div>;

    if (error || !submission) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow p-6 max-w-md text-center">
                    <AlertTriangle size={32} className="mx-auto text-red-500 mb-3" />
                    <h2 className="text-xl font-bold mb-2">{t.not_open_title}</h2>
                    <p className="text-sm text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    if (submission.status === 'akkoord' || submission.status === 'doorgezet') {
        return (
            <div className="min-h-screen flex flex-col">
                <header className="bg-[#9f4493] text-white">
                    <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-end">
                        <LangSwitch lang={lang} setLang={setLang} />
                    </div>
                </header>
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-md p-10 max-w-lg text-center">
                        <CheckCircle2 size={48} className="mx-auto text-green-600 mb-4" />
                        <h1 className="text-3xl font-bold mb-3">{t.check_approved_title}</h1>
                        <p className="text-slate-600">{t.check_approved_body}</p>
                    </div>
                </main>
            </div>
        );
    }

    const pickEdit = (edit, orig) => (edit !== null && edit !== '' && edit !== undefined ? edit : orig);
    const keywords = submission.edited_keywords?.length ? submission.edited_keywords : (submission.keywords || []);
    const photos = submission.edited_photos?.length ? submission.edited_photos : (submission.photos || []);

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-[#9f4493] text-white">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="font-bold text-lg">{t.check_title}</h1>
                    <LangSwitch lang={lang} setLang={setLang} />
                </div>
            </header>

            <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
                    {t.check_intro}
                </div>

                <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
                    <Row label={lang === 'nl' ? 'Gezelschap' : 'Group'} value={submission.gezelschap_naam} />
                    <Row label={lang === 'nl' ? 'Voorstelling' : 'Performance'} value={submission.voorstelling_titel} />
                    <Row label="Credits" value={pickEdit(submission.edited_credits, submission.credits)} pre />
                    <Row label="Keywords" value={keywords.join(', ')} />
                    <Row label={lang === 'nl' ? 'Korte tekst NL' : 'Short text NL'} value={pickEdit(submission.edited_korte_tekst_nl, submission.korte_tekst_nl)} pre />
                    <Row label={lang === 'nl' ? 'Korte tekst EN' : 'Short text EN'} value={pickEdit(submission.edited_korte_tekst_en, submission.korte_tekst_en)} pre />
                    <Row label="Bio NL" value={pickEdit(submission.edited_bio_nl, submission.bio_nl)} pre />
                    <Row label="Bio EN" value={pickEdit(submission.edited_bio_en, submission.bio_en)} pre />

                    {photos.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold uppercase text-slate-500 mb-2">{lang === 'nl' ? 'Geselecteerde foto’s' : 'Selected photos'}</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {photos.map((p, i) => (
                                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="block border rounded overflow-hidden">
                                        <img src={p.thumb_url || p.url} alt="" className="w-full h-32 object-cover" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <a
                        href={`mailto:marketing@cafetheaterfestival.nl?subject=${encodeURIComponent('Wijzigingen marketing-materiaal — ' + (submission.gezelschap_naam || ''))}`}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-medium"
                    >
                        <Mail size={16} /> {t.check_mailto}
                    </a>
                    <button
                        onClick={handleApprove}
                        disabled={approving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm font-semibold disabled:opacity-50"
                    >
                        <Check size={16} /> {approving ? '…' : t.check_approve}
                    </button>
                </div>
            </main>
        </div>
    );
}

function Row({ label, value, pre }) {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div>
            <div className="text-xs font-semibold uppercase text-slate-500 mb-1">{label}</div>
            <div className={`text-sm ${pre ? 'whitespace-pre-wrap' : ''}`}>{value}</div>
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
