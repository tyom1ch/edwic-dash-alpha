import { Capacitor } from '@capacitor/core';

export function basenameFromBase(base, native = false) {
  if (native) return undefined;
  const value = base || '/';
  if (value === '/' || value === './' || value === '.') return undefined;
  const trimmed = value.endsWith('/') ? value.slice(0, -1) : value;
  if (!trimmed) return undefined;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function routerBasename() {
  return basenameFromBase(import.meta.env.BASE_URL, Capacitor.isNativePlatform());
}

export function stripBasename(path, basename) {
  if (!basename || typeof path !== 'string') return path;
  if (path === basename || path.startsWith(`${basename}/`)) {
    return path.slice(basename.length) || '/';
  }
  return path;
}
