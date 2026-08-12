'use client';

import { useEffect, useState } from 'react';
import { Brain, Camera, CheckCircle, CircleNotch, PencilSimple, Plus, Trash, X } from '@phosphor-icons/react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { buildMeshGradient, extractColors } from '@/lib/colorUtils';

const DEFAULT_BOT_PHOTO = '/Logo.png';
const DEFAULT_BOT_BANNER = '#e5e7eb';

function hasBotPhoto(photoURL?: string): boolean {
  return Boolean(photoURL && photoURL !== DEFAULT_BOT_PHOTO);
}

function getCreatorName(user: { displayName?: string | null; email?: string | null }): string {
  return user.displayName || user.email?.split('@')[0] || 'Créateur du bot';
}

type BotFormState = {
  name: string;
  description: string;
  prompt: string;
  category: string;
  model: string;
  commands: string;
  welcomeMessage: string;
  photoURL: string;
  bannerURL: string;
};

type SavedBot = BotFormState & {
  id: string;
  slug: string;
  bannerColor: string;
  createdBy: string;
  createdByName?: string;
  createdByPhotoURL?: string;
  createdAt?: { toDate?: () => Date } | Date | null;
};

const DEFAULT_FORM: BotFormState = {
  name: '', description: '', prompt: '', category: 'Productivité', model: 'mistral-large-latest',
  commands: '@monbot, aide, configurer', welcomeMessage: '', photoURL: '', bannerURL: '',
};

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bot';
}

async function uploadBotImage(file: File, uid: string, slug: string, kind: 'avatar' | 'banner'): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `bot-assets/${uid}/${slug}-${kind}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('chat-files').upload(path, file, { contentType: file.type || 'image/*', upsert: false });
  if (error) throw error;
  return supabase.storage.from('chat-files').getPublicUrl(path).data.publicUrl;
}

function formatBotDate(value: SavedBot['createdAt']): string {
  if (!value) return '';
  const date = value instanceof Date ? value : value.toDate?.();
  return date ? `Créé le ${date.toLocaleDateString('fr-FR')}` : '';
}

function BotImageFields({ form, setForm, avatarPreview, bannerPreview, onAvatarChange, onBannerChange, onRemoveAvatar, onRemoveBanner }: {
  form: BotFormState;
  setForm: React.Dispatch<React.SetStateAction<BotFormState>>;
  avatarPreview: string;
  bannerPreview: string;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBannerChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onRemoveBanner: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">Image de profil <span className="font-normal text-gray-400">(facultative)</span></label>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 hover:border-indigo-400 hover:bg-indigo-50/40">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">{avatarPreview ? <img src={avatarPreview} alt="Aperçu du bot" className="h-full w-full object-cover" /> : <Brain size={28} weight="duotone" className="text-gray-500" aria-hidden="true" />}</span>
          <span className="min-w-0"><span className="block text-[13px] font-medium text-gray-700">Choisir une image</span><span className="block truncate text-[11px] text-gray-400">Icône cerveau par défaut</span></span><Camera size={18} className="ml-auto flex-shrink-0 text-gray-400" /><input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
        </label>
        <input type="url" value={form.photoURL} onChange={event => setForm(current => ({ ...current, photoURL: event.target.value }))} placeholder="Ou coller une URL d’image" className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-indigo-400" />
        {(avatarPreview || form.photoURL) && <button type="button" onClick={onRemoveAvatar} className="mt-2 text-[12px] font-medium text-red-500 hover:text-red-600">Supprimer l’image</button>}
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">Bannière <span className="font-normal text-gray-400">(facultative)</span></label>
        <label className="relative flex h-[76px] cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-[#e5e7eb] p-3 hover:border-indigo-400">{(bannerPreview || form.bannerURL) && <img src={bannerPreview || form.bannerURL} alt="Aperçu de la bannière" className="absolute inset-0 h-full w-full object-cover opacity-80" />}<span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-black/10 text-gray-600"><Camera size={18} /></span><span className="relative z-10 min-w-0 text-gray-700"><span className="block text-[13px] font-medium">Choisir une bannière</span><span className="block text-[11px] text-gray-500">Grise par défaut</span></span><input type="file" accept="image/*" className="hidden" onChange={onBannerChange} /></label>
        <input type="url" value={form.bannerURL} onChange={event => setForm(current => ({ ...current, bannerURL: event.target.value }))} placeholder="Ou coller une URL de bannière" className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-indigo-400" />
        {(bannerPreview || form.bannerURL) && <button type="button" onClick={onRemoveBanner} className="mt-2 text-[12px] font-medium text-red-500 hover:text-red-600">Supprimer la bannière</button>}
      </div>
    </div>
  );
}

function BotForm({ form, setForm, editingBotId, isSaving, error, avatarPreview, bannerPreview, onAvatarChange, onBannerChange, onRemoveAvatar, onRemoveBanner, onSubmit, onCancel }: {
  form: BotFormState;
  setForm: React.Dispatch<React.SetStateAction<BotFormState>>;
  editingBotId: string | null;
  isSaving: boolean;
  error: string;
  avatarPreview: string;
  bannerPreview: string;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBannerChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onRemoveBanner: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const update = (field: keyof BotFormState, value: string) => setForm(current => ({ ...current, [field]: value }));
  return (
    <section className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-3"><div><h3 className="text-[16px] font-semibold text-gray-900">{editingBotId ? 'Modifier le bot' : 'Créer une application bot'}</h3><p className="mt-1 text-[12px] text-gray-500">Configure son identité, son comportement et ses commandes.</p></div><button type="button" onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100" aria-label="Fermer"><X size={18} /></button></div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-gray-700">Nom du bot *</span><input required maxLength={40} value={form.name} onChange={event => update('name', event.target.value)} placeholder="Ex. Assistant Mookup" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] outline-none focus:border-indigo-400 focus:bg-white" /></label><label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-gray-700">Catégorie</span><select value={form.category} onChange={event => update('category', event.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] outline-none focus:border-indigo-400 focus:bg-white"><option>Productivité</option><option>Intelligence artificielle</option><option>Modération</option><option>Automatisation</option><option>Divertissement</option></select></label></div>
        <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-gray-700">Description *</span><input required maxLength={180} value={form.description} onChange={event => update('description', event.target.value)} placeholder="À quoi sert ce bot ?" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] outline-none focus:border-indigo-400 focus:bg-white" /></label>
        <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-gray-700">Prompt système *</span><textarea required minLength={10} maxLength={5000} rows={5} value={form.prompt} onChange={event => update('prompt', event.target.value)} placeholder="Tu es un assistant utile, précis et sympathique…" className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] leading-5 outline-none focus:border-indigo-400 focus:bg-white" /><span className="mt-1 block text-right text-[11px] text-gray-400">{form.prompt.length}/5000</span></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-gray-700">Modèle IA</span><select value={form.model} onChange={event => update('model', event.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] outline-none focus:border-indigo-400 focus:bg-white"><option value="mistral-large-latest">Mistral Large</option><option value="mistral-small-latest">Mistral Small</option></select></label><label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-gray-700">Commandes reconnues</span><input maxLength={180} value={form.commands} onChange={event => update('commands', event.target.value)} placeholder="@monbot, aide, configurer" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] outline-none focus:border-indigo-400 focus:bg-white" /></label></div>
        <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-gray-700">Message d’accueil <span className="font-normal text-gray-400">(facultatif)</span></span><textarea maxLength={500} rows={2} value={form.welcomeMessage} onChange={event => update('welcomeMessage', event.target.value)} placeholder="Message envoyé quand le bot rejoint un groupe…" className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] outline-none focus:border-indigo-400 focus:bg-white" /></label>
        <BotImageFields form={form} setForm={setForm} avatarPreview={avatarPreview} bannerPreview={bannerPreview} onAvatarChange={onAvatarChange} onBannerChange={onBannerChange} onRemoveAvatar={onRemoveAvatar} onRemoveBanner={onRemoveBanner} />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2.5 text-[12px] text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" onClick={onCancel} className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100">Annuler</button><button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{isSaving ? <CircleNotch size={16} className="animate-spin" /> : <CheckCircle size={16} />}{isSaving ? 'Enregistrement…' : editingBotId ? 'Enregistrer les modifications' : 'Créer le bot'}</button></div>
      </form>
    </section>
  );
}

function BotCard({ bot, onEdit, onDelete }: { bot: SavedBot; onEdit: () => void; onDelete: () => void }) {
  const [generatedBanner, setGeneratedBanner] = useState(bot.bannerColor || DEFAULT_BOT_BANNER);
  const hasPhoto = hasBotPhoto(bot.photoURL);

  useEffect(() => {
    if (!hasPhoto || bot.bannerURL) return;

    let cancelled = false;
    void extractColors(bot.photoURL as string).then(colors => {
      if (!cancelled) setGeneratedBanner(buildMeshGradient(colors));
    });
    return () => {
      cancelled = true;
    };
  }, [bot.bannerColor, bot.bannerURL, bot.photoURL, hasPhoto]);

  const bannerBackground = hasPhoto && !bot.bannerURL ? generatedBanner : bot.bannerColor || DEFAULT_BOT_BANNER;

  return <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="relative h-24" style={{ background: bannerBackground }}>{bot.bannerURL && <img src={bot.bannerURL} alt="" className="h-full w-full object-cover" />}<div className="absolute -bottom-5 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-sm">{hasPhoto ? <img src={bot.photoURL} alt={`Avatar ${bot.name}`} className="h-full w-full object-cover" /> : <Brain size={34} weight="duotone" className="text-gray-500" aria-hidden="true" />}</div></div><div className="p-4 pt-7"><div className="flex flex-wrap items-center gap-2"><h4 className="text-[16px] font-semibold text-gray-900">{bot.name}</h4></div><p className="mt-1 line-clamp-2 text-[13px] text-gray-500">{bot.description}</p><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-900"><span className="rounded-md bg-gray-100 px-2 py-1 font-medium">{bot.category && bot.category !== 'Assistant' ? bot.category : 'Productivité'}</span>{bot.commands && <span className="rounded-md bg-gray-100 px-2 py-1">{bot.commands.split(',')[0].trim()}</span>}<span className="rounded-md bg-gray-100 px-2 py-1">{formatBotDate(bot.createdAt)}</span></div><div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3"><button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-gray-600 hover:bg-gray-100"><PencilSimple size={14} /> Modifier</button><button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-50"><Trash size={14} /> Supprimer</button></div></div></article>;
}

export default function BotApplicationsPage() {
  const [user] = useAuthState(auth);
  const [bots, setBots] = useState<SavedBot[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [form, setForm] = useState<BotFormState>(DEFAULT_FORM);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const botsQuery = query(collection(db, 'bots'), where('createdBy', '==', user.uid));
    return onSnapshot(botsQuery, snapshot => {
      const records = snapshot.docs.map(document => ({ id: document.id, ...document.data() })) as SavedBot[];
      records.sort((first, second) => first.name.localeCompare(second.name, 'fr'));
      setBots(records);
    }, snapshotError => { console.error('Erreur chargement des bots:', snapshotError); setError('Impossible de charger les bots enregistrés.'); });
  }, [user]);

  const resetForm = () => { setForm(DEFAULT_FORM); setEditingBotId(null); setAvatarFile(null); setBannerFile(null); setAvatarPreview(''); setBannerPreview(''); setError(''); };
  const closeForm = () => { resetForm(); setIsFormOpen(false); };
  const handleFileChange = (kind: 'avatar' | 'banner', event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => kind === 'avatar' ? (setAvatarFile(file), setAvatarPreview(String(reader.result || ''))) : (setBannerFile(file), setBannerPreview(String(reader.result || ''))); reader.readAsDataURL(file); };
  const removeAvatar = () => { setAvatarFile(null); setAvatarPreview(''); setForm(current => ({ ...current, photoURL: '' })); };
  const removeBanner = () => { setBannerFile(null); setBannerPreview(''); setForm(current => ({ ...current, bannerURL: '' })); };
  const openCreateForm = () => { resetForm(); setIsFormOpen(true); };
  const openEditForm = (bot: SavedBot) => { setEditingBotId(bot.id); setForm({ name: bot.name, description: bot.description, prompt: bot.prompt, category: bot.category && bot.category !== 'Assistant' ? bot.category : 'Productivité', model: bot.model || 'mistral-large-latest', commands: bot.commands || '', welcomeMessage: bot.welcomeMessage || '', photoURL: bot.photoURL === DEFAULT_BOT_PHOTO ? '' : bot.photoURL || '', bannerURL: bot.bannerURL || '' }); setAvatarFile(null); setBannerFile(null); setAvatarPreview(hasBotPhoto(bot.photoURL) ? bot.photoURL || '' : ''); setBannerPreview(bot.bannerURL || ''); setError(''); setIsFormOpen(true); };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) { setError('Connecte-toi pour créer un bot.'); return; }
    setError(''); setIsSaving(true);
    try {
      const slug = slugify(form.name);
      let photoURL = form.photoURL.trim();
      let bannerURL = form.bannerURL.trim();
      if (avatarFile) photoURL = await uploadBotImage(avatarFile, user.uid, slug, 'avatar');
      if (bannerFile) bannerURL = await uploadBotImage(bannerFile, user.uid, slug, 'banner');
      const payload = { name: form.name.trim(), slug, description: form.description.trim(), prompt: form.prompt.trim(), category: form.category, model: form.model, commands: form.commands.trim(), welcomeMessage: form.welcomeMessage.trim(), photoURL, bannerURL, bannerColor: DEFAULT_BOT_BANNER, isPublic: true, createdBy: user.uid, createdByName: getCreatorName(user), createdByPhotoURL: user.photoURL || '', updatedAt: serverTimestamp() };
      if (editingBotId) await updateDoc(doc(db, 'bots', editingBotId), payload);
      else await addDoc(collection(db, 'bots'), { ...payload, createdAt: serverTimestamp() });
      closeForm();
    } catch (saveError) { console.error('Erreur création bot:', saveError); setError('Impossible d’enregistrer le bot. Vérifie les images ou réessaie.'); } finally { setIsSaving(false); }
  };

  const handleDelete = async (bot: SavedBot) => { if (!window.confirm(`Supprimer le bot « ${bot.name} » ?`)) return; try { await deleteDoc(doc(db, 'bots', bot.id)); } catch (deleteError) { console.error('Erreur suppression bot:', deleteError); setError('Impossible de supprimer ce bot.'); } };

  return <div className="mx-auto max-w-3xl space-y-6 p-6 pb-12"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="mb-1 text-2xl font-semibold text-gray-900">Applications</h2><p className="text-[15px] text-gray-500">Crée et enregistre tes propres bots pour Mookup.</p></div><button type="button" onClick={openCreateForm} className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-600"><Plus size={15} /> Nouveau bot</button></div>{isFormOpen && <BotForm form={form} setForm={setForm} editingBotId={editingBotId} isSaving={isSaving} error={error} avatarPreview={avatarPreview} bannerPreview={bannerPreview} onAvatarChange={event => handleFileChange('avatar', event)} onBannerChange={event => handleFileChange('banner', event)} onRemoveAvatar={removeAvatar} onRemoveBanner={removeBanner} onSubmit={handleSubmit} onCancel={closeForm} />}{!user && <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-700">Connecte-toi pour enregistrer une application bot.</p>}{error && !isFormOpen && <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>}<section><div className="mb-3 flex items-center justify-between"><div><h3 className="text-[16px] font-semibold text-gray-900">Tes applications</h3><p className="mt-1 text-[12px] text-gray-500">Tes bots sont sauvegardés automatiquement et restent disponibles dans ton espace.</p></div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">{bots.length} application{bots.length > 1 ? 's' : ''}</span></div>{bots.length > 0 ? <div className="grid gap-4 lg:grid-cols-2">{bots.map(bot => <BotCard key={bot.id} bot={bot} onEdit={() => openEditForm(bot)} onDelete={() => void handleDelete(bot)} />)}</div> : <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-[13px] text-gray-400">Aucune application créée pour le moment.</div>}</section></div>;
}
