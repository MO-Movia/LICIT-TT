
/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

/*
 * File: types.ts
 * Project: @mo/licit-capco
 * Created Date: Tuesday March 18th 2025
 * Author: grodgers
 * -----
 * Last Modified:
 * Modified By:
 * -----
 * Copyright (c) 2025 Modus Operandi
 */

export const CAPCO = 'capco';

export interface CapcoState {
  portionMarking?: string;
  ism: {
    system: string;
    classification: {key: string; value: string};
    sciControls?: {key: string; value: string}[];
    atomicEnergyMarkings?: {key: string; value: string}[];
    ownerProducer?: {key: string; value: string}[];
    disseminationControls?: {key: string; value: string}[];
  };
}

export interface CapcoService {
  openManagementDialog(selectedCapco): Promise<CapcoState | null>;
  saveCapco(capcoList: CapcoState[]): Promise<boolean>;
  getCapco(): Promise<CapcoState[]>;
}

export interface CapcoRuntime {
  capcoService: CapcoService;
}
