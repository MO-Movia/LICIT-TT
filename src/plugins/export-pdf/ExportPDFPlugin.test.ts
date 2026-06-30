/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { ExportPDFPlugin } from './ExportPDFPlugin';
import { Schema } from 'prosemirror-model';

describe('ExportPDFPlugin', () => {
  it('should create plugin with showButton true', () => {
    const plugin = new ExportPDFPlugin(true);
    expect(plugin.showButton).toBe(true);
  });

  it('should create plugin with showButton false', () => {
    const plugin = new ExportPDFPlugin(false);
    expect(plugin.showButton).toBe(false);
  });

  it('should return same schema from getEffectiveSchema', () => {
    const plugin = new ExportPDFPlugin(true);
    const mockSchema = {} as Schema;
    expect(plugin.getEffectiveSchema(mockSchema)).toBe(mockSchema);
  });

  it('should return keymap from initKeyCommands', () => {
    const plugin = new ExportPDFPlugin(true);
    const keymap = plugin.initKeyCommands();
    expect(keymap).toBeDefined();
  });

  it('should return button commands for light theme', () => {
    const plugin = new ExportPDFPlugin(true);
    const commands = plugin.initButtonCommands('light');
    expect(commands).toBeDefined();
    expect(Object.keys(commands).length).toBeGreaterThan(0);
  });

  it('should return button commands for dark theme', () => {
    const plugin = new ExportPDFPlugin(true);
    const commands = plugin.initButtonCommands('dark');
    expect(commands).toBeDefined();
    expect(Object.keys(commands).length).toBeGreaterThan(0);
  });

  it('should return empty object when showButton is false', () => {
    const plugin = new ExportPDFPlugin(false);
    const commands = plugin.initButtonCommands('light');
    expect(commands).toEqual({});
  });
});