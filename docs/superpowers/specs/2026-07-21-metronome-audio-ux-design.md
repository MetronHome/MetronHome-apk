# Design — Metronome Audio Precision & Sensory UX (Axes A + C)

**Date:** 2026-07-21
**Projet:** MetronHomeApp (React 18 + Vite + TypeScript + Capacitor 5)
**Axes sélectionnés:** A (Précision & qualité audio) + C (UX sensorielle)
**Ordre de build:** A1 → C1 → C2 → A2 → C3

---

## 1. Contexte & diagnostic

Le métronome fonctionne mais repose sur un **scheduler `setTimeout` sur le thread
principal** (`src/hooks/useMetronome.ts:158-162`). Sur Android, dès que l'écran se
tamisit ou l'app passe en arrière-plan, le système **bride `setTimeout` à ~1 s** →
le tempo saute. Web Audio est déjà sample-accurate (bon), mais le *déclencheur* est
fragile.

Par ailleurs :
- `navigator.vibrate` existe déjà dans le scheduler (C3 partiellement fait).
- Tout le thème (`src/index.css`) est dark-glass sur-mesure ; `next-themes` est
  installé mais inutilisé → **pas de thème clair** dans ce design (voir §7).

---

## 2. A1 — Scheduler dans un Web Worker  ⭐ fondation

**But :** déplacer le timer de planification hors du thread principal pour qu'il ne
soit pas bridé par le système quand l'écran se tamise.

**Approche (pattern "A Tale of Two Clocks", Chris Wilson) :**
- Nouveau fichier `src/audio/metronome.worker.ts` :
  ```ts
  let timer: ReturnType<typeof setInterval> | null = null;
  self.onmessage = (e) => {
    if (e.data === "start") timer = setInterval(() => (self as any).postMessage("tick"), 25);
    if (e.data === "stop") { if (timer) clearInterval(timer); timer = null; }
  };
  ```
- `useMetronome` :
  - Créer le worker via `new Worker(new URL("../audio/metronome.worker.ts", import.meta.url), { type: "module" })` (Vite le bundle automatiquement, compatible build web Capacitor).
  - `start()` : `worker.postMessage("start")`.
  - `worker.onmessage` (tick) → appelle `scheduler()` (logique de lookahead inchangée).
  - `stop()` : `worker.postMessage("stop")` + `worker.terminate()`.
- **Fallback** : si `Worker` indisponible (WebView très ancienne), retomber sur le
  `setTimeout` actuel (try/catch autour de la création du worker).

**Données/interface :** aucune nouvelle prop UI. Changement interne uniquement.

**Tests :**
- `useMetronome.test.ts` : vérifier que `start()` puis `scheduler()` produit le bon
  nombre de `playClick` sur une fenêtre de lookahead donnée (on peut espionner
  `AudioContext` et compter les `osc.start`).
- Test unitaire de `getSubdivisionMultiplier` / `getBeatsPerMeasure` (déjà implicite).

---

## 3. C1 — WakeLock (écran toujours allumé)  ⭐ fort impact

**But :** empêcher l'écran de s'éteindre pendant la pratique.

**Implémentation dans `useMetronome` :**
- Ajouter `wakeLockEnabled: boolean` (défaut `true`) + `setWakeLockEnabled`.
- `start()` : si `wakeLockEnabled && "wakeLock" in navigator`,
  `wakeLockRef.current = await navigator.wakeLock.request("screen")` dans un try/catch.
- `stop()` : `wakeLockRef.current?.release()` dans try/catch, puis `null`.
- `visibilitychange` : si redevient visible ET `isPlaying` ET `wakeLockEnabled`,
  ré-acquérir (le WakeLock est relâché automatiquement en arrière-plan).
- **Feature-detect** : si `navigator.wakeLock` absent → aucun effet, pas d'erreur.

**UI :** nouveau toggle "Écran allumé" dans `MetronomeSettings` (voir §6).

---

## 4. C2 — Flash visuel plein écran  (activable/désactivable)

**But :** feedback visuel à chaque temps, utile en silencieux / malentendance, et
cohérent avec le thème glass. **L'utilisateur a explicitement demandé un toggle ON/OFF.**

**Implémentation :**
- Ajouter `visualFlashEnabled: boolean` (défaut `true`) + `setVisualFlashEnabled`.
- Dans `scheduler()`, **uniquement sur un temps fort** (`isMainBeat`) :
  - si `visualFlashEnabled`, incrémenter un compteur `flashKeyRef` et déclencher un
    état `flashKey` (pour re-déclencher l'animation CSS à chaque beat).
- `Index.tsx` : ajouter un overlay plein écran fixe
  `<div className="beat-flash" key={flashKey} />` (rendu conditionnel si `isPlaying`).
- `src/index.css` : keyframe `@keyframes beatFlash` (opacité 0 → ~0.35 → 0 sur
  ~120 ms), couleur `--glow`/`--primary`, `pointer-events:none`, `z-index` bas.
  Sur beat accentué, intensité légèrement plus forte (via classe `beat-flash--accent`).

**Données/interface :** `flashKey` exposé par le contexte ; `visualFlashEnabled`
relié au toggle UI.

**Tests :**
- Vérifier que `flashKey` s'incrémente seulement si `visualFlashEnabled === true`
  (sinon reste stable).
- Vérifier qu'aucun flash n'est déclenché sur les subdivisions non principales.

---

## 5. A2 — Timbres de clic enrichis

**But :** clics plus musicaux et accent réellement distinct.

**Changements dans `playClick` (`useMetronome.ts:70`) :**
- Conserver les 3 `SoundType` ("click", "accent", "wood") mais meilleure synthèse :
  - **"wood" (woodblock)** : 2 oscillateurs (ex. 800 + 2400 Hz) + `BandpassFilter`
    + enveloppe courte (15 ms) → son "toc" bois crédible.
  - **"click"** : sinus 1000 Hz non-accent / 1500 Hz accent, enveloppe 40 ms.
  - **"accent"** : triangle plus riche.
- **Accent** : toujours + fort (gain 1.0 vs 0.6) **et** pitch nettement différent →
  le 1er temps se repère à l'oreille.
- *Optionnel (hors scope par défaut)* : 4e timbre "rimshot". À ajouter seulement si
  l'utilisateur le souhaite.

**UI :** le sélecteur "Son" existe déjà (`MetronomeSettings` lignes 24-28, 87-92) ;
aucun changement nécessaire sauf si on ajoute le 4e timbre.

---

## 6. C3 — Vibration (peaufinée)

**Déjà présent** (`useMetronome.ts:141-143`). Peaufinage :
- Accent : `navigator.vibrate(35)`, temps faible : `navigator.vibrate(12)`.
- Vibration uniquement sur temps forts (déjà le cas).
- Garder le toggle "Vibration" existant dans `MetronomeSettings` (lignes 105-115).

---

## 7. Modifications UI consolidées (`MetronomeSettings` + `Index`)

`MetronomeSettings.tsx` : ajouter 2 toggles (Écran allumé, Flash visuel) + props :
`wakeLockEnabled`, `visualFlashEnabled`, `onWakeLockChange`, `onVisualFlashChange`.
Bouton "Vibration" reste.

`Index.tsx` :
- Passer les nouvelles props au `<MetronomeSettings>`.
- Rendre l'overlay `.beat-flash` (§4).
- `useMetronomeContext()` expose déjà tout (état + setters).

**Ajouts à `MetronomeState` (useMetronome) :** `wakeLockEnabled`, `visualFlashEnabled`.
**Setters ajoutés :** `setWakeLockEnabled`, `setVisualFlashEnabled`.
`reset()` réinitialise ces deux à leurs défauts (`true`).

---

## 8. Gestion d'erreurs & robustesse

| Risque | Mitigation |
|---|---|
| Worker indisponible (vieille WebView) | try/catch → fallback `setTimeout` |
| `navigator.wakeLock` absent | feature-detect, aucun effet |
| `wakeLock.request` rejeté (permissions/batterie) | catch silencieux, log warning |
| `AudioContext.resume` échoue | catch dans `initAudio` |
| Perte WakeLock en arrière-plan | re-acquérir sur `visibilitychange` |

---

## 9. Plan de tests (vitest + jsdom)

1. **Unitaires** : `getBeatsPerMeasure`, `getSubdivisionMultiplier`.
2. **Scheduler** : mock `AudioContext`, compter `osc.start` sur N ticks → vérifie
   cadence et accent sur beat 1.
3. **Worker fallback** : forcer `Worker = undefined` → `start()` n'envoie pas d'erreur.
4. **WakeLock** : jsdom n'a pas `wakeLock` → `start()` ne plante pas ; toggle
   `wakeLockEnabled=false` → aucun appel.
5. **Flash gating** : `visualFlashEnabled=false` → `flashKey` stable ; `true` →
   s'incrémente sur temps forts uniquement.
6. **Vibration** : `vibrationEnabled=false` → `navigator.vibrate` non appelé.

---

## 10. Hors scope (explicitement exclus)

- Thème clair/sombre (`next-themes` présent mais design dark-glass sur-mesure → rework
  trop lourd pour ce cycle).
- Axes B (outils pratique) et D (données/progression) — sessions suivantes si désiré.
- 4e timbre "rimshot" (optionnel, à confirmer).
