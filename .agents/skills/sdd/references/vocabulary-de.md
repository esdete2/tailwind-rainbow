---
description: German vocabulary for SDD user-facing rendering. Read on demand when the configured graph language is `de`. Never translate YAML frontmatter, CLI tokens, or entry IDs — only the terms shown in user-facing narration.
metadata:
    sdd-content-hash: 4ee26465f531e84be1996917976e45e2ce9372d5b23f30aab596346936f7933a
    sdd-version: 0.17.0
name: vocabulary-de
---

# SDD Vokabular — Deutsch (`de`)

Diese Referenz übersetzt SDD-Begriffe ins Deutsche, wenn das Skill die Graph-Inhalte für Nutzer:innen rendert (Catch-up, Playback, Status-Erzählung, Grooming-Tabellen). Die kanonischen englischen Tokens bleiben in YAML-Frontmatter, CLI-Argumenten und CLI-Ausgaben unverändert — Übersetzung passiert ausschließlich in der konversationellen Darstellung.

## Typen

| Englisch (kanonisch) | Deutsch |
|----------------------|---------|
| signal               | Signal  |
| decision             | Entscheidung |

## Signal-Kinds

| Englisch (kanonisch) | Deutsch | Leitfrage |
|----------------------|---------|-----------|
| gap                  | Lücke   | Was braucht Aufmerksamkeit? |
| fact                 | Fakt    | Was wissen wir? |
| question             | Frage   | Was wissen wir nicht? |
| insight              | Einsicht | Was haben wir synthetisiert? |
| done                 | Erledigt | Was wurde abgeschlossen? |

## Decision-Kinds

| Englisch (kanonisch) | Deutsch    | Leitfrage |
|----------------------|------------|-----------|
| directive            | Direktive  | Welchen Weg gehen wir? |
| activity             | Aktivität  | Was ist als Nächstes zu tun? |
| plan                 | Plan       | Was muss bei Fertigstellung gelten? |
| contract             | Vertrag    | Was muss immer gelten? |
| aspiration           | Anspruch   | Wohin streben wir? |

## Layer (Ebenen)

| Englisch (kanonisch) | Deutsch        | Denkebene |
|----------------------|----------------|-----------|
| strategic (`stg`)    | strategisch    | Warum existiert das? In welche Richtung? |
| conceptual (`cpt`)   | konzeptionell  | Welcher Ansatz? Kernideen und Grenzen |
| tactical (`tac`)     | taktisch       | Wie umsetzen? Strukturen und Trade-offs |
| operational (`ops`)  | operativ       | Umsetzung. Einzelne Implementierungsschritte |
| process (`prc`)      | Prozess        | Wie arbeiten wir? Verträge, Review-Regeln, Release-Prozess |

## Status (abgeleitet)

| Englisch      | Deutsch        |
|---------------|----------------|
| open          | offen          |
| active        | aktiv          |
| settled       | feststehend    |
| closed-by     | geschlossen-durch |
| superseded-by | abgelöst-durch |

`settled` ist der abgeleitete Status einer Direktive mit `intent: settled` — von Geburt an terminal, ohne schließende Kante (siehe „Intent" unten). `{status: settled}` rendert als „feststehend".

## Referenz-Felder

| Englisch   | Deutsch       | Bedeutung |
|------------|---------------|-----------|
| refs       | Referenzen    | „baut auf / hängt ab von" — Kontext, kein Status-Effekt |
| supersedes | löst ab       | „ersetzt" — Ziel ist nicht mehr aktiv/offen |
| closes     | schließt      | „löst auf / erfüllt" — Ziel ist nicht mehr aktiv/offen |

## Konfidenz (Confidence)

| Englisch | Deutsch | Bedeutung |
|----------|---------|-----------|
| high     | hoch    | starke Überzeugung |
| medium   | mittel  | plausibel, aber unvalidiert |
| low      | niedrig | Hypothese / Experiment |

## Intent (Direktiv-Lebenszyklus)

Nur Direktiven tragen ein `intent`-Attribut. Die Werte sind CLI-Tokens und bleiben in Frontmatter und CLI-Aufrufen Englisch (`--intent pending`); die deutschen Begriffe erscheinen nur in der Erzählung.

| Englisch (kanonisch) | Deutsch       | Bedeutung |
|----------------------|---------------|-----------|
| pending              | ausstehend    | verlangt Folgehandlung — der Standard fürs Handeln |
| guiding              | leitend       | stehender Kontext, der spätere Entscheidungen prägt, ohne je „fertig" zu werden |
| settled              | feststehend   | von Geburt an terminal — bewusstes „keine Aktion nötig" / „so belassen", ohne schließende Kante |

Nur `guiding` rendert als eigenes Attribut auf Eintragszeilen (`[intent: guiding]` → „leitend"); `pending` und nicht-spezifizierte bleiben still, und `settled` zeigt sich über seinen Status „feststehend".

## Häufige Begriffe in der Erzählung

| Englisch                 | Deutsch                       |
|--------------------------|-------------------------------|
| signal                   | Signal                        |
| decision                 | Entscheidung                  |
| graph                    | Graph                         |
| entry                    | Eintrag                       |
| participant              | Teilnehmer:in                 |
| work in progress (WIP)   | laufende Arbeit (WIP)         |
| acceptance criteria (AC) | Akzeptanzkriterien (AK)       |
| catch-up                 | Lagebericht                   |
| groom / grooming         | aufräumen / Aufräumen         |
| explore                  | erkunden                      |
| capture                  | festhalten / erfassen         |
| pre-flight               | Pre-Flight (Vorabprüfung)     |
| short-loop               | Kurzschluss                   |
| supersede                | ablösen                       |
| close                    | schließen                     |
| dialogue                 | Dialog                        |
| thread                   | Strang                        |
| upstream                 | stromaufwärts / Vorläufer     |
| downstream               | stromabwärts / Nachfolger     |

## Was **nicht** übersetzt wird

- **YAML-Frontmatter:** `type`, `kind`, `layer`, `confidence`, `refs`, `supersedes`, `closes`, `participants` — alles bleibt Englisch.
- **CLI-Token:** `sdd new d cpt --kind plan --confidence medium` — alle Argumente, Flags und Werte bleiben Englisch.
- **Eintrags-IDs:** `20260422-235706-d-cpt-x38` — bleibt wie gespeichert, keine Übersetzung der Typ-/Layer-Suffixe.
- **Abschnittsüberschriften in Einträgen** wie `## Acceptance criteria` — bleiben Englisch, damit Pre-Flight sie maschinell findet.
- **Status-Notation** in Rohausgaben wie `sdd view`, `sdd show` — die CLI selbst bleibt Englisch. Nur wenn das Skill in der Erzählung rendert, werden Begriffe übersetzt.

## Beispiele — Rendering

**Englisch (Rohausgabe von `sdd view`):**
```
  20260422-235706-d-cpt-x38 conceptual plan decision [confidence: medium] (Christopher, Claude) {status: active} Multilingual SDD uses a per-graph configured language...
```

**Deutsch (Skill-Erzählung im Lagebericht):**
> **Mehrsprachige SDD-Infrastruktur** — konzeptioneller Plan (`d-cpt-x38`), Konfidenz mittel, aktiv. Pro-Graph-konfigurierte Sprache in `.sdd/config.yaml`…

Die CLI-Tokens (`d`, `cpt`, `plan`, `medium`) tauchen im Skill-Rendering als deutsche Begriffe auf; die Eintrags-ID bleibt unverändert.
