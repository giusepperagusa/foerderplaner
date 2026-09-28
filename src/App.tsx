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
import { ShieldCheck, Tag, Cpu, BookOpen, ArrowUpCircle, Scale } from 'lucide-react';

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
      const idx = prevPlans.findIndex((p) => p.id === activePlanId);
      if (idx === -1) {
        const fresh = updater(createBlankPlan(activePlanId));
        return [fresh, ...prevPlans];
      }
      const updated = updater(prevPlans[idx]);
      const nextList = [...prevPlans];
      nextList[idx] = updated;
      return nextList;
    });
  };

  const handleUpdateProfile = (updatedProfile: typeof activePlan.profil) => {
    updateActivePlan((prev) => ({
      ...prev,
      profil: updatedProfile,
      aktualisiertAm: new Date().toISOString().split('T')[0],
    }));
  };

  const handleRatingChange = (id: string, value: RatingValue) => {
    updateActivePlan((prev) => ({
      ...prev,
      checklistenBewertungen: {
        ...prev.checklistenBewertungen,
        [id]: value,
      },
      aktualisiertAm: new Date().toISOString().split('T')[0],
    }));
  };

  const handleFlagToggle = (id: string) => {
    updateActivePlan((prev) => ({
      ...prev,
      checklistenFoerderbedarf: {
        ...prev.checklistenFoerderbedarf,
        [id]: !prev.checklistenFoerderbedarf[id],
      },
      aktualisiertAm: new Date().toISOString().split('T')[0],
    }));
  };

  const handleAddPlanRow = (row: PlanRow) => {
    updateActivePlan((prev) => ({
      ...prev,
      planEintraege: [...prev.planEintraege, row],
      aktualisiertAm: new Date().toISOString().split('T')[0],
    }));
  };

  const handleUpdateRows = (rows: PlanRow[]) => {
    updateActivePlan((prev) => ({
      ...prev,
      planEintraege: rows,
      aktualisiertAm: new Date().toISOString().split('T')[0],
    }));
  };

  const handleUpdateField = (field: string, val: any) => {
    updateActivePlan((prev) => ({
      ...prev,
      [field]: val,
      aktualisiertAm: new Date().toISOString().split('T')[0],
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
          aktualisiertAm: new Date().toISOString().split('T')[0],
        };
      })
    );
  };

  const handleImportPlans = (imported: FoerderplanDocument[], mode: 'copy' | 'overwrite' = 'copy') => {
    setPlans((prev) => {
      if (mode === 'overwrite') {
        const importedMap = new Map(imported.map((p) => [p.id, p]));
        const updated = prev.map((p) => importedMap.get(p.id) || p);
        const existingIds = new Set(prev.map((p) => p.id));
        const brandNew = imported.filter((p) => !existingIds.has(p.id));
        return [...brandNew, ...updated];
      } else {
        const existingIds = new Set(prev.map((p) => p.id));
        const sanitized = imported.map((imp) => {
          if (existingIds.has(imp.id)) {
            return {
              ...imp,
              id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              profil: {
                ...imp.profil,
                name: imp.profil.name ? `${imp.profil.name} (Kopie)` : 'Importierte Kopie',
              },
            };
          }
          return imp;
        });
        return [...sanitized, ...prev];
      }
    });
  };

  const handleResetActivePlan = () => {
    if (window.confirm('Moechten Sie alle Angaben dieses Foerderplans wirklich leeren?')) {
      const blank = createBlankPlan(activePlanId);
      updateActivePlan(() => blank);
      setCurrentStep(1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
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

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        {currentStep === 1 && (
          <StudentProfileStep
            profile={activePlan.profil}
            onChange={handleUpdateProfile}
            onNext={() => setCurrentStep(2)}
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

      {/* Unobtrusive Footer with version tag and privacy notice */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap text-slate-500">
            <span className="font-medium text-slate-700">Foerderplan-Assistent Grundschule</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Client-seitig im Browser (PWA, LocalStorage & Web Worker)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsGuidelinesModalOpen(true)}
              className="hover:text-blue-600 transition flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Richtlinien: {GUIDELINE_VERSION}</span>
            </button>

            <button
              onClick={() => setIsConsentModalOpen(true)}
              className="hover:text-indigo-600 transition flex items-center gap-1 cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>Lokale KI (Wllama Wasm)</span>
            </button>

            <button
              onClick={() => setIsLicenseModalOpen(true)}
              className="hover:text-indigo-600 transition flex items-center gap-1 cursor-pointer"
              title="Lizenz- und Urheberrechtsinformationen (GPLv3)"
            >
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-700 hover:text-indigo-600">GPLv3</span>
            </button>

            <button
              onClick={() => setIsVersionInfoModalOpen(true)}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border transition-colors cursor-pointer ${
                needRefresh
                  ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              }`}
              title="Version, Changelog & PWA Update-Status oeffnen"
            >
              {needRefresh ? (
                <ArrowUpCircle className="w-3 h-3 text-amber-600" />
              ) : (
                <Tag className="w-3 h-3 text-slate-400" />
              )}
              <span>{APP_VERSION}</span>
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
