import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Globe, AlertTriangle, Copy, Upload, Trash2, Plus, FileImage, Link as LinkIcon } from 'lucide-react';
import { api } from '../api';
import { UI, EXAMPLES } from '../i18n';
import { useAutosave } from '../useAutosave';

const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9f4493]";

export function FormPage({ token, onBack }) {
    const [lang, setLang] = useState('nl');
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

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

    const saveFn = useMemo(() => async (data) => {
        if (!data) return;
        await api.update(token, {
            gezelschap_naam: data.gezelschap_naam,
            voorstelling_titel: data.voorstelling_titel,
            contact_naam: data.contact_naam,
            contact_email: data.contact_email,
            credits: data.credits,
            taal: data.taal,
            keywords: data.keywords,
            korte_tekst_nl: data.korte_tekst_nl,
            korte_tekst_en: data.korte_tekst_en,
            bio_nl: data.bio_nl,
            bio_en: data.bio_en,
            website: data.website,
            socials: data.socials,
            photos: data.photos,
            videos: data.videos,
            language: data.language,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const { status: saveStatus, flush } = useAutosave(submission, saveFn, 800);

    // Sync taal-state naar submission
    useEffect(() => {
        if (submission && submission.language !== lang) {
            setSubmission(prev => ({ ...prev, language: lang }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang]);

    const onChange = (patch) => setSubmission(prev => ({ ...prev, ...patch }));

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">…</p></div>;
    }
    if (error || !submission) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow p-6 max-w-md text-center">
                    <AlertTriangle size={32} className="mx-auto text-red-500 mb-3" />
                    <h2 className="text-xl font-bold mb-2">Er ging iets mis</h2>
                    <p className="text-sm text-slate-600">{error}</p>
                    <button onClick={onBack} className="mt-4 text-sm text-[#9f4493] hover:underline">← Terug</button>
                </div>
            </div>
        );
    }

    if (submission.status !== 'draft') {
        return <SubmittedScreen lang={lang} setLang={setLang} />;
    }

    const handleSubmit = async () => {
        // Validatie minimumvereisten
        const photos = submission.photos || [];
        const horizontal = photos.filter(p => p.type === 'horizontal').length;
        const square = photos.filter(p => p.type === 'square').length;
        const errs = [];
        if (!submission.gezelschap_naam) errs.push(t.gezelschap);
        if (!submission.voorstelling_titel) errs.push(t.voorstelling);
        if (!submission.contact_email) errs.push(t.contact_email);
        if (horizontal < 1) errs.push('1 × ' + t.photo_horizontal);
        if (square < 2) errs.push('2 × ' + t.photo_square);
        if (errs.length > 0) {
            alert((lang === 'nl' ? 'Vul/lever eerst: ' : 'Please fill/provide first: ') + '\n• ' + errs.join('\n• '));
            return;
        }
        if (!window.confirm(t.submit_confirm)) return;
        setSubmitting(true);
        try {
            await flush();
            const res = await api.submit(token);
            setSubmission(prev => ({ ...prev, status: res.status, submitted_at: res.submitted_at }));
        } catch (e) {
            alert('Error: ' + e.message);
        } finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header lang={lang} setLang={setLang} t={t} saveStatus={saveStatus} />

            <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
                <CopyLinkBar token={token} lang={lang} t={t} />

                <Section title={t.section_basics}>
                    <Field label={t.gezelschap} required>
                        <input value={submission.gezelschap_naam || ''} onChange={(e) => onChange({ gezelschap_naam: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label={t.voorstelling} required>
                        <input value={submission.voorstelling_titel || ''} onChange={(e) => onChange({ voorstelling_titel: e.target.value })} className={inputCls} />
                    </Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label={t.contact_naam}>
                            <input value={submission.contact_naam || ''} onChange={(e) => onChange({ contact_naam: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label={t.contact_email} required>
                            <input type="email" value={submission.contact_email || ''} onChange={(e) => onChange({ contact_email: e.target.value })} className={inputCls} />
                        </Field>
                    </div>
                    <Field label={t.taal} help={t.taal_help}>
                        <input value={submission.taal || ''} onChange={(e) => onChange({ taal: e.target.value })} className={inputCls} />
                    </Field>
                </Section>

                <Section title={t.section_credits}>
                    <Field label={t.credits} help={t.credits_help}>
                        <textarea value={submission.credits || ''} onChange={(e) => onChange({ credits: e.target.value })} className={inputCls + ' h-32'} />
                    </Field>
                    <KeywordsInput value={submission.keywords || []} onChange={(v) => onChange({ keywords: v })} t={t} />
                </Section>

                <Section title={t.section_texts}>
                    <BilingualTextField
                        label={t.korte_tekst}
                        nlValue={submission.korte_tekst_nl || ''}
                        enValue={submission.korte_tekst_en || ''}
                        onChangeNl={(v) => onChange({ korte_tekst_nl: v })}
                        onChangeEn={(v) => onChange({ korte_tekst_en: v })}
                        rows={5}
                        t={t}
                        examplesKey="short"
                    />
                    <BilingualTextField
                        label={t.bio}
                        nlValue={submission.bio_nl || ''}
                        enValue={submission.bio_en || ''}
                        onChangeNl={(v) => onChange({ bio_nl: v })}
                        onChangeEn={(v) => onChange({ bio_en: v })}
                        rows={8}
                        t={t}
                        examplesKey="bio"
                    />
                </Section>

                <Section title={t.section_media}>
                    <PhotosUpload
                        photos={submission.photos || []}
                        onChange={(v) => onChange({ photos: v })}
                        token={token}
                        t={t}
                    />
                    <VideosInput
                        videos={submission.videos || []}
                        onChange={(v) => onChange({ videos: v })}
                        t={t}
                    />
                </Section>

                <Section title={t.section_socials}>
                    <Field label={t.website}>
                        <input type="url" value={submission.website || ''} onChange={(e) => onChange({ website: e.target.value })} className={inputCls} placeholder="https://..." />
                    </Field>
                    <SocialsInput socials={submission.socials || []} onChange={(v) => onChange({ socials: v })} t={t} />
                </Section>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold disabled:opacity-50"
                    >
                        <Check size={18} /> {submitting ? '…' : t.submit}
                    </button>
                </div>
            </main>
        </div>
    );
}

// ============================================================================
// Sub-components
// ============================================================================

function Section({ title, children }) {
    return (
        <section className="bg-white rounded-2xl shadow-md p-6 md:p-8 space-y-4">
            <h2 className="text-xl font-bold text-[#9f4493] border-b border-slate-200 pb-2">{title}</h2>
            {children}
        </section>
    );
}

function Field({ label, required, help, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {children}
            {help && <p className="text-xs text-slate-500 mt-1">{help}</p>}
        </div>
    );
}

function Header({ lang, setLang, t, saveStatus }) {
    return (
        <header className="bg-[#9f4493] text-white sticky top-0 z-10">
            <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-white/70">{t.subtitle}</div>
                    <h1 className="font-bold text-lg truncate">{t.title}</h1>
                </div>
                <div className="flex items-center gap-3">
                    {saveStatus === 'saving' && <span className="text-xs text-white/80">{t.saving}</span>}
                    {saveStatus === 'saved' && <span className="text-xs text-white/80 flex items-center gap-1"><CheckCircle2 size={12} /> {t.saved}</span>}
                    {saveStatus === 'error' && <span className="text-xs text-red-200">{t.save_error}</span>}
                    <LangSwitch lang={lang} setLang={setLang} />
                </div>
            </div>
        </header>
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

function CopyLinkBar({ token, lang, t }) {
    const [copied, setCopied] = useState(false);
    const url = `${window.location.origin}/inzending/${token}`;
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {}
    };
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs text-amber-800">
                {lang === 'nl' ? 'Sla deze link op om later terug te komen' : 'Save this link to come back later'}
            </span>
            <button onClick={copy} className="text-xs text-amber-900 hover:text-black flex items-center gap-1">
                <Copy size={12} /> {copied ? t.copied : t.copy_url}
            </button>
        </div>
    );
}

function KeywordsInput({ value, onChange, t }) {
    const arr = Array.isArray(value) ? value : [];
    const setAt = (i, v) => {
        const next = [...arr];
        next[i] = v;
        onChange(next);
    };
    // Toon altijd 3 inputs
    const display = [0, 1, 2].map(i => arr[i] || '');
    return (
        <Field label={t.keywords} help={t.keywords_help}>
            <div className="grid grid-cols-3 gap-2">
                {display.map((v, i) => (
                    <input
                        key={i}
                        value={v}
                        onChange={(e) => setAt(i, e.target.value)}
                        className={inputCls}
                        placeholder={`#${i + 1}`}
                    />
                ))}
            </div>
        </Field>
    );
}

function BilingualTextField({ label, nlValue, enValue, onChangeNl, onChangeEn, rows = 5, t, examplesKey }) {
    const [showExamples, setShowExamples] = useState(false);
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}<span className="text-red-500 ml-1">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs text-slate-500 mb-1">{t.nl_version}</label>
                    <textarea value={nlValue} onChange={(e) => onChangeNl(e.target.value)} className={inputCls} rows={rows} />
                </div>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">{t.en_version}</label>
                    <textarea value={enValue} onChange={(e) => onChangeEn(e.target.value)} className={inputCls} rows={rows} />
                </div>
            </div>
            <button
                type="button"
                onClick={() => setShowExamples(s => !s)}
                className="text-xs text-[#9f4493] hover:underline mt-1"
            >
                {showExamples ? '▲' : '▼'} {examplesKey === 'short' ? t.example_short : t.example_bio}
            </button>
            {showExamples && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                        <div className="text-[10px] uppercase text-slate-500">NL</div>
                        {EXAMPLES[examplesKey].nl.map((ex, i) => (
                            <p key={i} className="text-xs text-slate-600 italic">{ex}</p>
                        ))}
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                        <div className="text-[10px] uppercase text-slate-500">EN</div>
                        {EXAMPLES[examplesKey].en.map((ex, i) => (
                            <p key={i} className="text-xs text-slate-600 italic">{ex}</p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function PhotosUpload({ photos, onChange, token, t }) {
    const horizontal = photos.filter(p => p.type === 'horizontal');
    const square = photos.filter(p => p.type === 'square');
    const vertical = photos.filter(p => p.type === 'vertical');

    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.photos}<span className="text-red-500 ml-1">*</span></label>
            <p className="text-xs text-slate-500 mb-3">{t.photos_help}</p>

            <PhotoGroup
                label={t.photo_horizontal}
                required={1}
                photos={horizontal}
                onAdd={(p) => onChange([...photos, { ...p, type: 'horizontal' }])}
                onRemove={(idx) => onChange(photos.filter((p, i) => !(p.type === 'horizontal' && horizontal[idx] === p)))}
                token={token}
                aspect="16/9"
            />
            <PhotoGroup
                label={t.photo_square}
                required={2}
                photos={square}
                onAdd={(p) => onChange([...photos, { ...p, type: 'square' }])}
                onRemove={(idx) => onChange(photos.filter((p) => !(p.type === 'square' && square[idx] === p)))}
                token={token}
                aspect="1/1"
            />
            <PhotoGroup
                label={t.photo_vertical}
                required={0}
                photos={vertical}
                onAdd={(p) => onChange([...photos, { ...p, type: 'vertical' }])}
                onRemove={(idx) => onChange(photos.filter((p) => !(p.type === 'vertical' && vertical[idx] === p)))}
                token={token}
                aspect="4/5"
            />
        </div>
    );
}

function PhotoGroup({ label, required, photos, onAdd, onRemove, token, aspect }) {
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState(null);
    const onFile = async (file, type) => {
        if (!file) return;
        setUploading(true); setErr(null);
        try {
            const res = await api.upload(token, file, type);
            onAdd({ url: res.url, thumb_url: res.thumb_url, path: res.path });
        } catch (e) { setErr(e.message); }
        finally { setUploading(false); }
    };
    const ok = required === 0 || photos.length >= required;
    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">
                    {label}
                    {required > 0 && (
                        <span className={`ml-2 text-xs ${ok ? 'text-green-600' : 'text-amber-600'}`}>
                            ({photos.length}/{required})
                        </span>
                    )}
                </h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {photos.map((p, i) => (
                    <div key={i} className="relative border rounded-lg overflow-hidden" style={{ aspectRatio: aspect }}>
                        <img src={p.thumb_url || p.url} alt="" className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => onRemove(i)}
                            className="absolute top-1 right-1 bg-white/90 hover:bg-white p-1 rounded shadow text-red-600"
                            title="Verwijder"
                        ><Trash2 size={12} /></button>
                    </div>
                ))}
                <label className="border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#9f4493] hover:bg-purple-50/40" style={{ aspectRatio: aspect, minHeight: '80px' }}>
                    <FileImage size={20} className="text-slate-400 mb-1" />
                    <span className="text-xs text-slate-500">{uploading ? '…' : 'Upload'}</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            const typeMap = { '16/9': 'horizontal', '1/1': 'square', '4/5': 'vertical' };
                            onFile(file, typeMap[aspect]);
                            e.target.value = '';
                        }}
                        disabled={uploading}
                        className="hidden"
                    />
                </label>
            </div>
            {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
        </div>
    );
}

function VideosInput({ videos, onChange, t }) {
    const arr = Array.isArray(videos) ? videos : [];
    return (
        <Field label={t.videos} help={t.videos_help}>
            <div className="space-y-2">
                {arr.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <LinkIcon size={14} className="text-slate-400 flex-shrink-0" />
                        <input
                            type="url"
                            value={v || ''}
                            onChange={(e) => {
                                const next = [...arr];
                                next[i] = e.target.value;
                                onChange(next);
                            }}
                            className={inputCls}
                            placeholder="https://..."
                        />
                        <button
                            type="button"
                            onClick={() => onChange(arr.filter((_, idx) => idx !== i))}
                            className="text-red-600 p-1"
                        ><Trash2 size={14} /></button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => onChange([...arr, ''])}
                    className="text-sm text-[#9f4493] hover:underline flex items-center gap-1"
                ><Plus size={14} /> {t.add_video}</button>
            </div>
        </Field>
    );
}

function SocialsInput({ socials, onChange, t }) {
    const arr = Array.isArray(socials) ? socials : [];
    const platforms = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'X', 'Andere'];
    return (
        <Field label={t.socials}>
            <div className="space-y-2">
                {arr.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <select
                            value={s.platform || ''}
                            onChange={(e) => {
                                const next = [...arr];
                                next[i] = { ...next[i], platform: e.target.value };
                                onChange(next);
                            }}
                            className="border border-slate-300 rounded-lg px-2 py-2 text-sm w-32"
                        >
                            <option value="">—</option>
                            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input
                            value={s.url || ''}
                            onChange={(e) => {
                                const next = [...arr];
                                next[i] = { ...next[i], url: e.target.value };
                                onChange(next);
                            }}
                            className={inputCls}
                            placeholder="https://... of @gebruikersnaam"
                        />
                        <button
                            type="button"
                            onClick={() => onChange(arr.filter((_, idx) => idx !== i))}
                            className="text-red-600 p-1"
                        ><Trash2 size={14} /></button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => onChange([...arr, { platform: '', url: '' }])}
                    className="text-sm text-[#9f4493] hover:underline flex items-center gap-1"
                ><Plus size={14} /> Voeg toe</button>
            </div>
        </Field>
    );
}

function SubmittedScreen({ lang, setLang }) {
    const t = UI[lang];
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
                    <h1 className="text-3xl font-bold mb-3">{t.submitted_title}</h1>
                    <p className="text-slate-600">{t.submitted_body}</p>
                </div>
            </main>
        </div>
    );
}
