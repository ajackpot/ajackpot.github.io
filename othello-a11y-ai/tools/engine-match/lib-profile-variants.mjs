import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadJsonFileIfPresent, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

export const ACTIVE_GENERATED_MODULE_PATH = 'js/ai/learned-eval-profile.generated.js';

export function parseVariantSpec(value, fallbackLabel = null) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    return null;
  }

  const [labelPart, modulePathPart] = text.split('|');
  const label = (labelPart ?? '').trim() || fallbackLabel || null;
  const generatedModule = (modulePathPart ?? '').trim() || null;
  if (!label) {
    throw new Error(`Variant spec is missing a label: ${value}`);
  }
  return {
    label,
    generatedModule,
  };
}

export function parseVariantSpecList(value, fallback = []) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }

  return value
    .split(';')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => parseVariantSpec(token));
}

export async function importGeneratedProfileModule(modulePath) {
  const resolved = resolveCliPath(modulePath);
  const imported = await import(pathToFileURL(resolved).href);
  return {
    resolvedPath: resolved,
    imported,
  };
}

export async function loadProfileVariant({
  label,
  generatedModule = null,
  evaluationJson = null,
  moveOrderingJson = null,
  tupleJson = null,
  mpcJson = null,
  disableMoveOrdering = false,
  disableTuple = false,
  disableMpc = false,
} = {}) {
  if (typeof label !== 'string' || label.trim() === '') {
    throw new Error('Profile variant label is required.');
  }

  let evaluationProfile = null;
  let moveOrderingProfile = null;
  let tupleResidualProfile = null;
  let mpcProfile = null;
  let resolvedModulePath = null;

  if (typeof generatedModule === 'string' && generatedModule.trim() !== '') {
    const loaded = await importGeneratedProfileModule(generatedModule);
    resolvedModulePath = loaded.resolvedPath;
    evaluationProfile = loaded.imported.GENERATED_EVALUATION_PROFILE ?? loaded.imported.default ?? null;
    moveOrderingProfile = loaded.imported.GENERATED_MOVE_ORDERING_PROFILE ?? null;
    tupleResidualProfile = loaded.imported.GENERATED_TUPLE_RESIDUAL_PROFILE ?? null;
    mpcProfile = loaded.imported.GENERATED_MPC_PROFILE ?? null;
  }

  const explicitEvaluation = loadJsonFileIfPresent(evaluationJson);
  const explicitMoveOrdering = loadJsonFileIfPresent(moveOrderingJson);
  const explicitTuple = loadJsonFileIfPresent(tupleJson);
  const explicitMpc = loadJsonFileIfPresent(mpcJson);

  if (explicitEvaluation) {
    evaluationProfile = explicitEvaluation;
  }
  if (explicitMoveOrdering) {
    moveOrderingProfile = explicitMoveOrdering;
  }
  if (explicitTuple) {
    tupleResidualProfile = explicitTuple;
  }
  if (typeof mpcJson === 'string' && mpcJson.trim() !== '') {
    mpcProfile = explicitMpc;
  }

  if (!evaluationProfile) {
    throw new Error(`Unable to resolve evaluation profile for variant ${label}.`);
  }

  return {
    label,
    generatedModulePath: resolvedModulePath,
    evaluationProfile,
    moveOrderingProfile: disableMoveOrdering ? null : moveOrderingProfile,
    tupleResidualProfile: disableTuple ? null : tupleResidualProfile,
    mpcProfile: disableMpc ? null : mpcProfile,
  };
}

export function buildEngineProfileOverrides(variant) {
  return {
    evaluationProfile: variant?.evaluationProfile ?? null,
    moveOrderingProfile: Object.hasOwn(variant ?? {}, 'moveOrderingProfile')
      ? variant.moveOrderingProfile
      : null,
    tupleResidualProfile: Object.hasOwn(variant ?? {}, 'tupleResidualProfile')
      ? variant.tupleResidualProfile
      : null,
    mpcProfile: Object.hasOwn(variant ?? {}, 'mpcProfile')
      ? variant.mpcProfile
      : null,
  };
}

export function describeVariantForSummary(variant) {
  return {
    label: variant?.label ?? null,
    generatedModulePath: variant?.generatedModulePath
      ? (relativePathFromCwd(variant.generatedModulePath) ?? variant.generatedModulePath)
      : null,
    evaluationProfileName: variant?.evaluationProfile?.name ?? null,
    evaluationBucketCount: Array.isArray(variant?.evaluationProfile?.phaseBuckets)
      ? variant.evaluationProfile.phaseBuckets.length
      : 0,
    interpolationMode: variant?.evaluationProfile?.interpolation?.mode ?? null,
    moveOrderingProfileName: variant?.moveOrderingProfile?.name ?? null,
    tupleResidualProfileName: variant?.tupleResidualProfile?.name ?? null,
    mpcProfileName: variant?.mpcProfile?.name ?? null,
  };
}

export function ensureVariantOutputDir(outputPath) {
  const resolved = resolveCliPath(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}
