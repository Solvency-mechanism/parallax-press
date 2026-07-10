import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('public/assets', { recursive: true });
cpSync('../assets', 'public/assets', { recursive: true });   // ../assets = parallax-press-live/assets (canonical design)
console.log('synced ../assets -> public/assets');
