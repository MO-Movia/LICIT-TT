/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { Schema } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
import { UICommand } from '../core';

export interface LicitPlugin extends Plugin {
  getEffectiveSchema: (schema: Schema) => Schema;
  initKeyCommands: () => Plugin;
  initButtonCommands: (theme: unknown) => UICommand;
}

function hasSchemaInitializer(plugin: Plugin): plugin is LicitPlugin {
  return (
    'getEffectiveSchema' in plugin &&
    typeof (plugin as LicitPlugin).getEffectiveSchema === 'function'
  );
}

function hasKeyCommandInitializer(plugin: Plugin): plugin is LicitPlugin {
  return (
    'initKeyCommands' in plugin &&
    typeof (plugin as LicitPlugin).initKeyCommands === 'function'
  );
}

function applySchemaExtension(schema: Schema, plugin: Plugin): Schema {
  if (!hasSchemaInitializer(plugin)) {
    return schema;
  }

  return plugin.getEffectiveSchema(schema);
}

function appendKeyCommandPlugins(
  effectivePlugins: Array<Plugin>,
  plugin: Plugin
): void {
  if (!hasKeyCommandInitializer(plugin)) {
    return;
  }

  const keyCommandPlugins = plugin.initKeyCommands();
  if (Array.isArray(keyCommandPlugins)) {
    effectivePlugins.push(...keyCommandPlugins);
    return;
  }

  if (keyCommandPlugins) {
    effectivePlugins.push(keyCommandPlugins);
  }
}

export function getEffectiveSchema(
  defaultSchema: Schema,
  defaultPlugins: Array<Plugin>,
  plugins?: Array<Plugin>
): Schema {
  let editorSchema: Schema = defaultSchema;

  // Loads plugins and its corresponding schema in editor
  const effectivePlugins = defaultPlugins;

  if (plugins) {
    for (const plugin of plugins) {
      if (effectivePlugins.includes(plugin)) {
        continue;
      }

      effectivePlugins.push(plugin);
      editorSchema = applySchemaExtension(editorSchema, plugin);
      appendKeyCommandPlugins(effectivePlugins, plugin);
    }
  }

  return editorSchema;
}
