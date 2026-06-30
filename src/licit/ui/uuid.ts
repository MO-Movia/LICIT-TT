/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

export default function uuid(): string {
  return crypto.randomUUID();
}
