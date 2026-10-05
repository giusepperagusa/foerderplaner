/**
 * @license
 * Förderplan-Assistent Berlin
 * Copyright (C) 2024-2026 Giuseppe Ragusa
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navigation } from './components/Navigation';
import { StudentProfileStep } from './components/StudentProfileStep';
import { ChecklistAssessmentStep } from './components/ChecklistAssessmentStep';
import { AiAssistantStep } from './components/AiAssistantStep';
import { PlanEditorStep } from './components/PlanEditorStep';
import { PrintPreviewStep } from './components/PrintPreviewStep';
import { GuidelinesManagerModal } from './components/GuidelinesManagerModal';
import { PlanManagerModal } from './components/PlanManagerModal';
import { ModelConsentModal } from './components/ModelConsentModal';
import { VersionInfoModal, APP_VERSION, GUIDELINE_VERSION } from './components/VersionInfoModal';
import { LicenseModal } from './components/LicenseModal';
import { PWAUpdateToast } from './components/PWAUpdateToast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { usePWAUpdate } from './hooks/usePWAUpdate';
import { FoerderplanDocument, RatingValue, PlanRow, PlanStatus } from './types/foerderplan';
import {
  getStoredPlans,
  saveStoredPlans,
  getActivePlanId,
  setActivePlanId,
  createBlankPlan,
  duplicatePlan,
} from './utils/planStorage';
import { ShieldCheck, Tag, Cpu, BookOpen, ArrowUpCircle, Scale, FolderOpen } from 'lucide-react';

export default function App() {
  // PWA update management
  const {
    needRefresh,
    updateServiceWorker,
    checkForUpdates,
    isChecking: isCheckingUpdates,
    lastCheckResult,
    dismissRefresh,
  } = usePWAUpdate();

  // Load plans list from LocalStorage
  const [plans, setPlans] = useState<FoerderplanDocument[]>(() => {
    return getStoredPlans();
  });

  // Track active plan ID
  const [activePlanId, setActivePlanIdState] = useState<string>(() => {
    const savedActiveId = getActivePlanId();
    const plansList = getStoredPlans();
    if (savedActiveId && plansList.some((p) => p.id === savedActiveId)) {
      return savedActiveId;
    }
    return plansList[0]?.id || 'plan_init';
  });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState<boolean>(false);
  const [isPlanManagerOpen, setIsPlanManagerOpen] = useState<boolean>(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
  const [isVersionInfoModalOpen, setIsVersionInfoModalOpen] = useState<boolean>(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [aiAssistantTab, setAiAssistantTab] = useState<'rules' | 'webllm'>('rules');

  // Active plan document
  const activePlan = useMemo(() => {
    const found = plans.find((p) => p.id === activePlanId);
    return found || plans[0] || createBlankPlan();
  }, [plans, activePlanId]);

  // Persist plans whenever they change
  useEffect(() => {
    if (plans.length > 0) {
      saveStoredPlans(plans);
    }
  }, [plans]);

  // Persist active plan ID
  useEffect(() => {
    if (activePlanId) {
      setActivePlanId(activePlanId);
    }
  }, [activePlanId]);

  // Helper to mutate active plan
  const updateActivePlan = (updater: (prev: FoerderplanDocument) => FoerderplanDocument) => {
    setPlans((prevPlans) => {
      const now = new Date().toISOString();
      const idx = prevPlans.findIndex((p) => p.id === activePlanId);
      if (idx === -1) {
        const fresh = updater(createBlankPlan(activePlanId));
        return [{ ...fresh, erstelltAm: fresh.erstelltAm || now, aktualisiertAm: now }, ...prevPlans];
      }
      const current = prevPlans[idx];
      const updated = updater(current);
      const nextList = [...prevPlans];
      nextList[idx] = {
        ...updated,
        erstelltAm: updated.erstelltAm || current.erstelltAm || now,
        aktualisiertAm: now,
      };
      return nextList;
    });
  };

  const handleUpdateProfile = (updatedProfile: typeof activePlan.profil) => {
    updateActivePlan((prev) => ({
      ...prev,
      profil: updatedProfile,
    }));
  };

  const handleRatingChange = (id: string, value: RatingValue) => {
    updateActivePlan((prev) => ({
      ...prev,
      checklistenBewertungen: {
        ...prev.checklistenBewertungen,
        [id]: value,
      },
    }));
  };

  const handleFlagToggle = (id: string) => {
    updateActivePlan((prev) => ({
      ...prev,
      checklistenFoerderbedarf: {
        ...prev.checklistenFoerderbedarf,
        [id]: !prev.checklistenFoerderbedarf[id],
      },
    }));
  };

  const handleAddPlanRow = (row: PlanRow) => {
    updateActivePlan((prev) => ({
      ...prev,
      planEintraege: [...prev.planEintraege, row],
    }));
  };

  const handleRemovePlanRow = (rowId: string) => {
    updateActivePlan((prev) => ({
      ...prev,
      planEintraege: prev.planEintraege.filter((r) => r.id !== rowId),
    }));
  };

  const handleUpdateRows = (rows: PlanRow[]) => {
    updateActivePlan((prev) => ({
      ...prev,
      planEintraege: rows,
    }));
  };

  const handleUpdateField = (field: string, val: any) => {
    updateActivePlan((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleSelectPlan = (id: string) => {
    setActivePlanIdState(id);
    setCurrentStep(1);
    setIsPlanManagerOpen(false);
  };

  const handleCreateNewPlan = () => {
    const freshPlan = createBlankPlan();
    setPlans((prev) => [freshPlan, ...prev]);
    setActivePlanIdState(freshPlan.id);
    setCurrentStep(1);
    setIsPlanManagerOpen(false);
  };

  const handleDeletePlan = (id: string) => {
    setPlans((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length === 0) {
        const fresh = createBlankPlan();
        setActivePlanIdState(fresh.id);
        setCurrentStep(1);
        return [fresh];
      }
      if (activePlanId === id) {
        setActivePlanIdState(remaining[0].id);
        setCurrentStep(1);
      }
      return remaining;
    });
  };

  const handleDuplicatePlan = (plan: FoerderplanDocument) => {
    const duplicated = duplicatePlan(plan);
    setPlans((prev) => [duplicated, ...prev]);
    setActivePlanIdState(duplicated.id);
    setCurrentStep(1);
    setIsPlanManagerOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextStatus: PlanStatus = p.status === 'abgeschlossen' ? 'entwurf' : 'abgeschlossen';
        return {
          ...p,
          status: nextStatus,
          aktualisiertAm: new Date().toISOString(),
        };
      })
    );
  };

  const handleImportPlans = (imported: FoerderplanDocument[], mode: 'copy' | 'overwrite' = 'copy') => {
    setPlans((prev) => {
      const now = new Date().toISOString();
      const normalize = (doc: FoerderplanDocument): FoerderplanDocument => ({
        ...doc,
        erstelltAm: doc.erstelltAm || doc.aktualisiertAm || now,
        aktualisiertAm: doc.aktualisiertAm || doc.erstelltAm || now,
      });

      if (mode === 'overwrite') {
        const importedMap = new Map(imported.map((p) => [p.id, normalize(p)]));
        const updated = prev.map((p) => importedMap.get(p.id) || p);
        const existingIds = new Set(prev.map((p) => p.id));
        const brandNew = imported.filter((p) => !existingIds.has(p.id)).map(normalize);
        return [...brandNew, ...updated];
      } else {
        const existingIds = new Set(prev.map((p) => p.id));
        const sanitized = imported.map((imp) => {
          const base = normalize(imp);
          if (existingIds.has(base.id)) {
            return {
              ...base,
              id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              profil: {
                ...base.profil,
                name: base.profil.name ? `${base.profil.name} (Kopie)` : 'Importierte Kopie',
              },
              erstelltAm: now,
              aktualisiertAm: now,
            };
          }
          return base;
        });
        return [...sanitized, ...prev];
      }
    });
  };

  const handleResetActivePlan = () => {
    if (window.confirm('Möchten Sie alle Angaben dieses Förderplans wirklich leeren?')) {
      const blank = createBlankPlan(activePlanId);
      setPlans((prev) => prev.map((p) => (p.id === activePlanId ? blank : p)));
      setCurrentStep(1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans print:bg-white print:min-h-0 print:m-0 print:p-0">
      {/* Skip to Content Link for Keyboard and Screen Reader Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Zum Hauptinhalt springen
      </a>

      <Navigation
        currentStep={currentStep}
        onSelectStep={setCurrentStep}
        onOpenGuidelinesManager={() => setIsGuidelinesModalOpen(true)}
        onOpenPlanManager={() => setIsPlanManagerOpen(true)}
        onOpenModelConsent={() => setIsConsentModalOpen(true)}
        onOpenVersionInfo={() => setIsVersionInfoModalOpen(true)}
        onCreateNewPlan={handleCreateNewPlan}
        onResetPlan={handleResetActivePlan}
        plansCount={plans.length}
        activePlanName={activePlan.profil.name}
        activePlanStatus={activePlan.status || 'entwurf'}
        onToggleStatus={() => handleToggleStatus(activePlan.id)}
        needRefresh={needRefresh}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:m-0 print:w-full focus:outline-none">
        {currentStep === 1 && (
          <StudentProfileStep
            profile={activePlan.profil}
            onChange={handleUpdateProfile}
            onNext={() => setCurrentStep(2)}
            createdAt={activePlan.erstelltAm}
            updatedAt={activePlan.aktualisiertAm}
          />
        )}

        {currentStep === 2 && (
          <ChecklistAssessmentStep
            ratings={activePlan.checklistenBewertungen}
            flaggedForSupport={activePlan.checklistenFoerderbedarf}
            onRatingChange={handleRatingChange}
            onFlagToggle={handleFlagToggle}
            onNext={() => setCurrentStep(3)}
            onPrev={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <AiAssistantStep
            profile={activePlan.profil}
            ratings={activePlan.checklistenBewertungen}
            flaggedForSupport={activePlan.checklistenFoerderbedarf}
            existingRows={activePlan.planEintraege}
            onAddPlanRow={handleAddPlanRow}
            onRemovePlanRow={handleRemovePlanRow}
            generatedText={activePlan.generierteKiTexte || ''}
            onSaveGeneratedText={(text) => handleUpdateField('generierteKiTexte', text)}
            activeTab={aiAssistantTab}
            onTabChange={setAiAssistantTab}
            onNext={() => setCurrentStep(4)}
            onPrev={() => setCurrentStep(2)}
            onRequestOpenConsentModal={() => setIsConsentModalOpen(true)}
          />
        )}

        {currentStep === 4 && (
          <PlanEditorStep
            rows={activePlan.planEintraege}
            onUpdateRows={handleUpdateRows}
            onNext={() => setCurrentStep(5)}
            onPrev={() => setCurrentStep(3)}
            weitereVereinbarungen={activePlan.weitereVereinbarungen}
            gespraechsDatum={activePlan.gespraechsDatum}
            anwesendePersonen={activePlan.anwesendePersonen}
            informationElternErfolgt={activePlan.informationElternErfolgt}
            onUpdateField={handleUpdateField}
          />
        )}

        {currentStep === 5 && (
          <PrintPreviewStep
            planDoc={activePlan}
            onPrev={() => setCurrentStep(4)}
          />
        )}
      </main>

      {/* Unobtrusive Footer with version tag, GitHub repo and privacy notice - STRICTLY HIDDEN ON PRINT */}
      <footer className="print:hidden no-print bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-700">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap text-slate-700">
            <span className="font-semibold text-slate-900">Förderplan-Assistent Grundschule</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-emerald-800 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              100% Client-seitig im Browser (PWA, LocalStorage & Web Worker)
            </span>
            <span>&bull;</span>
            <a
              href="https://github.com/giusepperagusa/foerderplaner"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 hover:text-blue-700 transition underline underline-offset-2 font-medium"
              title="Quellcode-Entwicklung auf GitHub ansehen"
            >
              GitHub (Quellcode)
            </a>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIsPlanManagerOpen(true)}
              className="hover:text-blue-700 transition flex items-center gap-1 cursor-pointer font-medium text-slate-700"
              title="Förderplan-Manager öffnen"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-700" />
              <span>Förderplan-Manager</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGuidelinesModalOpen(true)}
              className="hover:text-blue-700 transition flex items-center gap-1 cursor-pointer font-medium text-slate-700"
              title={`Richtlinien-Katalog (v${GUIDELINE_VERSION})`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-700" />
              <span>Richtlinien-Katalog</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConsentModalOpen(true)}
              className="hover:text-indigo-700 transition flex items-center gap-1 cursor-pointer font-medium text-slate-700"
              title="Lokale KI (Wllama, optional & experimentell) verwalten & Modell-Status prüfen"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-700" />
              <span>Lokale KI (Optional)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLicenseModalOpen(true)}
              className="hover:text-indigo-700 transition flex items-center gap-1 cursor-pointer font-medium text-slate-700"
              title="Software-Lizenz (GPLv3) anzeigen"
            >
              <Scale className="w-3.5 h-3.5 text-indigo-700" />
              <span className="font-semibold text-slate-800 hover:text-indigo-700">Software-Lizenz (GPLv3)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVersionInfoModalOpen(true)}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border transition-colors cursor-pointer ${
                needRefresh
                  ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              }`}
              title="Versionsinfo & Bereitstellung"
            >
              {needRefresh ? (
                <ArrowUpCircle className="w-3 h-3 text-amber-600" />
              ) : (
                <Tag className="w-3 h-3 text-slate-400" />
              )}
              <span>Versionsinfo ({APP_VERSION})</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Guidelines Manager Modal */}
      <GuidelinesManagerModal
        isOpen={isGuidelinesModalOpen}
        onClose={() => setIsGuidelinesModalOpen(false)}
      />

      {/* Multi-Plan Manager Modal */}
      <PlanManagerModal
        isOpen={isPlanManagerOpen}
        onClose={() => setIsPlanManagerOpen(false)}
        plans={plans}
        activePlanId={activePlanId}
        onSelectPlan={handleSelectPlan}
        onCreateNewPlan={handleCreateNewPlan}
        onDeletePlan={handleDeletePlan}
        onDuplicatePlan={handleDuplicatePlan}
        onToggleStatus={handleToggleStatus}
        onImportPlans={handleImportPlans}
      />

      {/* Local LLM Interactive Consent & Cache Modal */}
      <ModelConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
      />

      {/* Unobtrusive Version Info Modal with PWA Update Checker */}
      <VersionInfoModal
        isOpen={isVersionInfoModalOpen}
        onClose={() => setIsVersionInfoModalOpen(false)}
        onCheckForUpdates={checkForUpdates}
        isCheckingUpdates={isCheckingUpdates}
        lastCheckResult={lastCheckResult}
        needRefresh={needRefresh}
        onApplyUpdate={() => updateServiceWorker(true)}
        onOpenLicense={() => {
          setIsVersionInfoModalOpen(false);
          setIsLicenseModalOpen(true);
        }}
      />

      {/* Dedicated GPLv3 License & Model Exclusion Modal */}
      <LicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
      />

      {/* Background Update Notification Toast */}
      <PWAUpdateToast
        needRefresh={needRefresh}
        onUpdate={() => updateServiceWorker(true)}
        onDismiss={dismissRefresh}
      />

      {/* Offline Mode Indicator Banner */}
      <OfflineIndicator />
    </div>
  );
}
