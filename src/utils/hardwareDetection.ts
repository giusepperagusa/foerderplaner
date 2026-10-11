/**
 * Förderplan-Assistent Berlin
 * Copyright (C) 2024-2026 Giuseppe Ragusa
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Hardware Detection & Device Tier Analyzer
 * Probes CPU cores, memory limits, and device form factor to recommend
 * the optimal local AI model (Llama-3.2-3B, Qwen2.5-1.5B, or Llama-3.2-1B)
 * that can run comfortably on the user's hardware.
 */

export interface DeviceHardwareProfile {
  logicalCores: number;
  physicalCores: number;
  memoryGB?: number;
  isMobile: boolean;
  tier: 'high' | 'balanced' | 'compact';
  recommendedModelKey: string;
  hardwareSummary: string;
  recommendationReason: string;
}

export function detectDeviceHardware(): DeviceHardwareProfile {
  if (typeof window === 'undefined') {
    return {
      logicalCores: 4,
      physicalCores: 2,
      tier: 'high',
      isMobile: false,
      recommendedModelKey: 'llama-3.2-3b-q4_k_s',
      hardwareSummary: '4 CPU-Kerne • Standard-Hardware',
      recommendationReason: 'Bevorzugtes Standardmodell für Desktop- und Laptop-Hardware.',
    };
  }

  const logicalCores = navigator.hardwareConcurrency || 4;
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

  // deviceMemory API (in GB) is supported in Chromium browsers (Chrome, Edge, Opera)
  const memoryGB = (navigator as any).deviceMemory as number | undefined;

  // Derive estimated physical cores leaving thread headroom for the browser UI and OS
  let physicalCores = 2;
  if (logicalCores >= 12) {
    physicalCores = 6;
  } else if (logicalCores >= 8) {
    physicalCores = 4;
  } else if (logicalCores >= 6) {
    physicalCores = 4;
  } else if (logicalCores >= 4) {
    physicalCores = 2;
  } else if (logicalCores >= 2) {
    physicalCores = 2;
  } else {
    physicalCores = 1;
  }

  // Determine capability tier based on RAM, CPU threads, and device type:
  // Tier 1 (High): >= 8 GB RAM, >= 6 cores, non-mobile -> Llama-3.2-3B-Instruct-Q4_K_S
  // Tier 2 (Balanced): >= 4 GB RAM, >= 4 cores, non-mobile -> Qwen2.5-1.5b-Instruct-Q8_0
  // Tier 3 (Compact): < 4 GB RAM, <= 4 cores, or mobile devices -> Llama-3.2-1B-Instruct-Q8_0
  let tier: 'high' | 'balanced' | 'compact';
  let recommendedModelKey: string;
  let recommendationReason: string;

  if (memoryGB !== undefined) {
    if (memoryGB >= 8 && logicalCores >= 6 && !isMobile) {
      tier = 'high';
      recommendedModelKey = 'llama-3.2-3b-q4_k_s';
      recommendationReason = `Optimal für Ihr Gerät (${memoryGB} GB RAM, ${logicalCores} CPU-Kerne): Höchste Qualität & Nuancierung mit 3 Mrd. Parametern.`;
    } else if (memoryGB >= 4 && !isMobile) {
      tier = 'balanced';
      recommendedModelKey = 'qwen2.5-1.5b-q8_0';
      recommendationReason = `Empfohlen für Ihr Gerät (${memoryGB} GB RAM, ${logicalCores} CPU-Kerne): Hohe 8-Bit-Präzision bei moderater RAM-Belastung.`;
    } else {
      tier = 'compact';
      recommendedModelKey = 'llama-3.2-1b-q8_0';
      recommendationReason = `Empfohlen für Ihr Gerät (${isMobile ? 'Mobilgerät' : `${memoryGB} GB RAM`}): Geringer Speicherbedarf & flüssige Ausführung.`;
    }
  } else {
    // If deviceMemory is unavailable (e.g. Safari / Firefox)
    if (logicalCores >= 8 && !isMobile) {
      tier = 'high';
      recommendedModelKey = 'llama-3.2-3b-q4_k_s';
      recommendationReason = `Optimal für Ihren Rechner (${logicalCores} CPU-Kerne): Höchste Qualität mit 3 Mrd. Parametern.`;
    } else if (logicalCores >= 4 && !isMobile) {
      tier = 'balanced';
      recommendedModelKey = 'qwen2.5-1.5b-q8_0';
      recommendationReason = `Empfohlen für Ihr Gerät (${logicalCores} CPU-Kerne): Bewährte Balance aus 8-Bit-Präzision und Geschwindigkeit.`;
    } else {
      tier = 'compact';
      recommendedModelKey = 'llama-3.2-1b-q8_0';
      recommendationReason = `Empfohlen für ${isMobile ? 'Mobilgeräte' : 'sparsamere Hardware'}: Schnelle 8-Bit-Inferenz bei minimalem Speicherbedarf.`;
    }
  }

  const memoryText = memoryGB ? `${memoryGB} GB RAM` : 'RAM dyn.';
  const hardwareSummary = `${logicalCores} CPU-Kerne (${physicalCores} Wllama-Threads) • ${memoryText}${isMobile ? ' • Mobil' : ' • Desktop/Laptop'}`;

  return {
    logicalCores,
    physicalCores,
    memoryGB,
    isMobile,
    tier,
    recommendedModelKey,
    hardwareSummary,
    recommendationReason,
  };
}
