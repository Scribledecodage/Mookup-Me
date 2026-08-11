'use client';

import React from 'react';
import { House, SquaresFour, Users, Bug, Plus, ArrowSquareOut, Lightning, Shield, Code } from '@phosphor-icons/react';
import type { BotSection } from '@/components/sidebar/BotView';

interface BotPageProps {
  section: BotSection;
}

/* ─── Accueil ─────────────────────────────────────────────────────────────── */
function AccueilSection() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Bienvenue dans les Bots</h2>
        <p className="text-gray-500 text-[15px]">
          Automatisez vos workflows et enrichissez vos groupes grâce aux intégrations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Lightning, title: 'Automatisation', desc: 'Déclenchez des actions sur événements' },
          { icon: Shield,  title: 'Sécurité',       desc: 'Contrôle d\'accès et modération' },
          { icon: Code,   title: 'API',             desc: 'Connectez vos services externes' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-gray-50 rounded-2xl p-5 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Icon size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-gray-800 text-[14px]">{title}</p>
              <p className="text-gray-500 text-[13px] mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Plus size={20} className="text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-800 text-[14px]">Créer votre premier bot</p>
          <p className="text-gray-500 text-[13px]">Configurez un bot en quelques minutes via l'onglet Applications.</p>
        </div>
        <button 
          onClick={() => alert("Cette fonctionnalité sera bientôt disponible !")}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl text-[13px] font-medium hover:bg-blue-600 transition-colors flex-shrink-0 cursor-pointer"
        >
          Commencer
        </button>
      </div>
    </div>
  );
}

/* ─── Applications ────────────────────────────────────────────────────────── */
const APPS = [
  { name: 'BDD Bot',        desc: 'Répond aux questions sur la base de données',   tag: 'IA',         color: 'bg-purple-50 text-purple-500' },
  { name: 'Reminder Bot',   desc: 'Envoie des rappels planifiés dans vos groupes', tag: 'Utilitaire', color: 'bg-green-50 text-green-500' },
  { name: 'Welcome Bot',    desc: 'Accueille automatiquement les nouveaux membres', tag: 'Modération', color: 'bg-orange-50 text-orange-500' },
];

function ApplicationsSection() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Applications</h2>
          <p className="text-gray-500 text-[15px]">Gérez et installez des bots dans vos espaces.</p>
        </div>
        <button 
          onClick={() => alert("Ajout de bot bientôt disponible !")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-[13px] font-medium hover:bg-blue-600 transition-colors flex-shrink-0 cursor-pointer"
        >
          <Plus size={15} />
          Ajouter
        </button>
      </div>

      <div className="space-y-3">
        {APPS.map(app => (
          <div key={app.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${app.color.split(' ')[0]}`}>
              <SquaresFour size={18} className={app.color.split(' ')[1]} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-[14px]">{app.name}</p>
              <p className="text-gray-500 text-[13px] truncate">{app.desc}</p>
            </div>
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${app.color} flex-shrink-0`}>
              {app.tag}
            </span>
            <button 
              onClick={() => alert(`Détails de ${app.name} bientôt disponible !`)}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
            >
              <ArrowSquareOut size={15} className="text-gray-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Groupes (serveurs) ─────────────────────────────────────────────────── */
const GROUPS = [
  { name: 'Groupe Général',  bots: 2, members: 12 },
  { name: 'Team Mookup',     bots: 1, members: 5  },
];

function ServeursSection() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Groupes</h2>
        <p className="text-gray-500 text-[15px]">Bots actifs dans vos groupes.</p>
      </div>

      <div className="space-y-3">
        {GROUPS.map(group => (
          <div key={group.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800 text-[14px]">{group.name}</p>
              <p className="text-gray-500 text-[13px]">{group.members} membres · {group.bots} bot{group.bots > 1 ? 's' : ''} actif{group.bots > 1 ? 's' : ''}</p>
            </div>
            <button 
              onClick={() => alert(`Configuration de ${group.name} bientôt disponible !`)}
              className="px-3 py-1.5 text-[13px] font-medium text-blue-500 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex-shrink-0 cursor-pointer"
            >
              Configurer
            </button>
          </div>
        ))}
      </div>

      {GROUPS.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-[14px]">Aucun groupe avec des bots pour l'instant.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Débogage ────────────────────────────────────────────────────────────── */
const LOGS = [
  { level: 'info',  time: '14:32:01', msg: 'BDD Bot connecté avec succès' },
  { level: 'warn',  time: '14:31:44', msg: 'Délai de réponse élevé (1.4s) pour Reminder Bot' },
  { level: 'error', time: '14:30:12', msg: 'Welcome Bot : token expiré, reconnexion en cours' },
  { level: 'info',  time: '14:29:55', msg: 'Reminder Bot : rappel envoyé dans Groupe Général' },
];

const levelStyle: Record<string, string> = {
  info:  'bg-blue-50 text-blue-500',
  warn:  'bg-yellow-50 text-yellow-600',
  error: 'bg-red-50 text-red-500',
};

function DebugSection() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Débogage d'intégration</h2>
          <p className="text-gray-500 text-[15px]">Journaux d'activité en temps réel.</p>
        </div>
        <button 
          onClick={() => alert("Journaux effacés !")}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-[13px] font-medium hover:bg-gray-200 transition-colors cursor-pointer"
        >
          Effacer
        </button>
      </div>

      <div className="bg-gray-950 rounded-2xl p-4 space-y-2 font-mono text-[13px]">
        {LOGS.map((log, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-gray-500 flex-shrink-0">{log.time}</span>
            <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase flex-shrink-0 ${levelStyle[log.level]}`}>
              {log.level}
            </span>
            <span className="text-gray-300 break-all">{log.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Export principal ───────────────────────────────────────────────────── */
export default function BotPage({ section }: BotPageProps) {
  return (
    <div className="h-full overflow-y-auto bg-white">
      {section === 'accueil'      && <AccueilSection />}
      {section === 'applications' && <ApplicationsSection />}
      {section === 'serveurs'     && <ServeursSection />}
      {section === 'debug'        && <DebugSection />}
    </div>
  );
}
