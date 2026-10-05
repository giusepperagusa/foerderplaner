import React from 'react';
import {
  User,
  CheckSquare,
  Sparkles,
  Table,
  Printer,
  BookOpen,
  ShieldCheck,
  RotateCcw,
  FolderOpen,
  Plus,
  Clock,
  CheckCircle2,
  Cpu,
  Tag,
  ArrowUpCircle,
} from 'lucide-react';
import { PlanStatus } from '../types/foerderplan';
import { APP_VERSION } from './VersionInfoModal';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  currentStep: number;
  onSelectStep: (step: number) => void;
  onOpenGuidelinesManager: () => void;
  onOpenPlanManager: () => void;
  onOpenModelConsent: () => void;
  onOpenVersionInfo: () => void;
  onCreateNewPlan: () => void;
  onResetPlan: () => void;
  plansCount: number;
  activePlanName: string;
  activePlanStatus: PlanStatus;
  onToggleStatus: () => void;
  needRefresh?: boolean;
}

export const Navigation: React.FC<Props> = ({
  currentStep,
  onSelectStep,
  onOpenGuidelinesManager,
  onOpenPlanManager,
  onOpenModelConsent,
  onOpenVersionInfo,
  onCreateNewPlan,
  onResetPlan,
  plansCount,
  activePlanName,
  activePlanStatus,
  onToggleStatus,
  needRefresh = false,
}) => {
  const steps = [
    { num: 1, label: 'Stammdaten & Schwerpunkt', icon: User },
    { num: 2, label: 'Einschätzungsbogen', icon: CheckSquare },
    { num: 3, label: 'KI-Förderempfehlungen (Optional)', icon: Sparkles },
    { num: 4, label: 'Förderplan-Editor', icon: Table },
    { num: 5, label: 'Druck & Export', icon: Printer },
  ];

  const displayName = activePlanName.trim() || 'Neuer Förderplan (Leer)';
  const isCompleted = activePlanStatus === 'abgeschlossen';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs app-header print:hidden no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Brand bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs font-bold text-lg shrink-0">
              FP
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Förderplan-Assistent Grundschule
                </h1>
                
                {/* 100% Offline & DSGVO Badge */}
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  100% Offline & DSGVO
                </span>

                {/* Unobtrusive Version Tag with Update Indicator */}
                <button
                  type="button"
                  onClick={onOpenVersionInfo}
                  aria-label={`Versionsinfo (${APP_VERSION})`}
                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border transition-colors ${
                    needRefresh
                      ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 animate-pulse'
                      : 'text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
                  }`}
                  title="Versionsinfo & Bereitstellung"
                >
                  {needRefresh ? (
                    <ArrowUpCircle className="w-3 h-3 text-amber-600" />
                  ) : (
                    <Tag className="w-2.5 h-2.5 text-slate-400" />
                  )}
                  <span>Versionsinfo ({APP_VERSION})</span>
                  {needRefresh && <span className="font-sans font-bold text-[9px] bg-amber-500 text-white px-1 rounded-sm">UPDATE</span>}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Geleitet nach den Berliner Bewertungsrichtlinien „Fördermaßnahmen konkret!“
              </p>
            </div>
          </div>

          {/* Active plan badge & Global buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Active Plan Selector Pill */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
              <button
                type="button"
                onClick={onOpenPlanManager}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-blue-600 transition"
                title="Förderplan-Manager öffnen"
                aria-label="Förderplan-Manager öffnen"
              >
                <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline text-slate-500 font-normal">Plan:</span>
                <span className="max-w-[130px] truncate" title={displayName}>
                  {displayName}
                </span>
                <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {plansCount}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleStatus}
                className={`ml-1 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border transition ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
                title={isCompleted ? 'Klicken: Als Entwurf markieren' : 'Klicken: Als abgeschlossen markieren'}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Abgeschlossen</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Entwurf</span>
                  </>
                )}
              </button>
            </div>

            {/* In-App PWA Install Button */}
            <PWAInstallButton />

            {/* New Plan Button */}
            <button
              type="button"
              onClick={onCreateNewPlan}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs cursor-pointer"
              title="Neuen leeren Förderplan starten"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Neuer Plan</span>
            </button>

            {/* Local LLM (Wllama) Button */}
            <button
              type="button"
              onClick={onOpenModelConsent}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition border border-indigo-200 cursor-pointer"
              title="Lokale KI (Wllama, optional & experimentell) verwalten & Modell-Status prüfen"
              aria-label="Lokale KI (Optional)"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Lokale KI (Optional)</span>
            </button>

            {/* Guidelines button */}
            <button
              type="button"
              onClick={onOpenGuidelinesManager}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition border border-slate-200 cursor-pointer"
              title="Amtlichen Richtlinien-Katalog öffnen"
              aria-label="Richtlinien-Katalog"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Richtlinien-Katalog</span>
            </button>

            {/* Reset Button with accessible aria-label and high-contrast styling */}
            <button
              type="button"
              onClick={onResetPlan}
              aria-label="Diesen Förderplan leeren"
              className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              title="Diesen Förderplan leeren"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Tabs with semantic nav element and aria-current */}
        <nav aria-label="Förderplan Schritte" className="flex overflow-x-auto py-2 gap-1 no-scrollbar app-navigation print:hidden no-print">
          {steps.map((step) => {
            const isActive = currentStep === step.num;
            const isCompletedStep = currentStep > step.num;

            return (
              <button
                key={step.num}
                type="button"
                onClick={() => onSelectStep(step.num)}
                aria-current={isActive ? 'step' : undefined}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isCompletedStep
                    ? 'text-slate-800 hover:bg-slate-100'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-white text-blue-700'
                      : isCompletedStep
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                  aria-hidden="true"
                >
                  {step.num}
                </div>
                <span>{step.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
