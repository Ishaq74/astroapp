import React from 'react';
import { motion } from 'motion/react';
import { Lightbulb, Sparkles, BarChart3, Edit3, Image as ImageIcon, Eye } from 'lucide-react';

export default function ProposalsApp({ onClose }: { onClose: () => void }) {
  const proposals = [
    {
      title: "Assistant IA (Gemini)",
      description: "Un assistant intégré pour rédiger des articles, générer des balises SEO, ou traduire le contenu (i18n) automatiquement.",
      icon: <Sparkles className="text-purple-500" size={24} />,
      color: "bg-purple-100"
    },
    {
      title: "Tableau de Bord Analytique",
      description: "Intégration de graphiques pour visualiser le trafic du site Astro, les temps de build, ou les performances Lighthouse.",
      icon: <BarChart3 className="text-blue-500" size={24} />,
      color: "bg-blue-100"
    },
    {
      title: "Éditeur Markdown Avancé",
      description: "Améliorer l'application 'Notes' avec un éditeur complet pour écrire des articles de blog directement depuis l'interface mobile.",
      icon: <Edit3 className="text-orange-500" size={24} />,
      color: "bg-orange-100"
    },
    {
      title: "Médias Intelligents",
      description: "Génération automatique de texte alternatif (alt text) via l'IA et optimisation des formats d'images pour Astro.",
      icon: <ImageIcon className="text-pink-500" size={24} />,
      color: "bg-pink-100"
    },
    {
      title: "Live Preview",
      description: "Un mini-navigateur intégré pour voir les changements du site Astro en temps réel avant de déclencher un déploiement.",
      icon: <Eye className="text-emerald-500" size={24} />,
      color: "bg-emerald-100"
    }
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <Lightbulb className="text-yellow-600" size={20} />
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Propositions</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
        <p className="text-slate-600 text-sm mb-6">
          Voici quelques idées pour enrichir <strong>Concordia OS</strong> et en faire l'outil ultime pour gérer votre repo Astro :
        </p>

        {proposals.map((proposal, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-start"
          >
            <div className={`p-3 rounded-xl ${proposal.color} shrink-0`}>
              {proposal.icon}
            </div>
            <div>
              <h3 className="font-medium text-slate-800 mb-1">{proposal.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {proposal.description}
              </p>
            </div>
          </motion.div>
        ))}

        <div className="mt-8 p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
          <h4 className="font-medium text-indigo-900 mb-2">Que voulez-vous implémenter ?</h4>
          <p className="text-sm text-indigo-700">
            Dites-moi quelle idée vous intéresse le plus, ou proposez-en une autre, et je l'ajouterai immédiatement à l'OS !
          </p>
        </div>
      </div>
    </div>
  );
}
