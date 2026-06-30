/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

let isPreviewFormOpen = false;

export function openPreviewForm(): boolean {
  if (isPreviewFormOpen) {
    return false;
  }

  isPreviewFormOpen = true;
  return true;
}

export function closePreviewForm(): void {
  isPreviewFormOpen = false;
}

export function isPreviewOpen(): boolean {
  return isPreviewFormOpen;
}
