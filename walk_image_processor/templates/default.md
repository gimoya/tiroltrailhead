---
title: "{title}"
author: "Walk Image Processor"
date: "{date}"
geometry: "a4paper,margin=2cm"
fontsize: 12pt
documentclass: report
header-includes:
  - \usepackage{{graphicx}}
---

# {title}

## Begehungsbericht

**Datum:** {date}  
**Untersuchungsgebiet:** {location}  
**Dokumententyp:** Begehungsbericht  
**Teilnehmende Personen:** P1, P2, ...

## Begehungsstatistik

- **Gesamtbilder:** {total_images}
- **Dokumentierte Strecke:** {total_distance} km (Luftlinie zwischen Aufnahmepunkten)
- **Koordinatensystem:** WGS84 (GPS)

## Methodik

Die Bildorganisation erfolgte automatisch nach dem Nearest-Neighbor-Prinzip. Ausgehend vom mit "001_" markierten Startbild wird jedes nachfolgende Bild als das geografisch nächstgelegene zum vorherigen ausgewählt. Die Entfernungsberechnung erfolgt mittels Haversine-Formel für präzise GPS-Distanzbestimmung.

## Ergebnis

Die automatische Verarbeitung der GPS-getaggten Bilder ermöglicht eine systematische und reproduzierbare Dokumentation des Wanderwegs. Alle Bilder wurden erfolgreich nach geografischer Nähe sortiert und mit entsprechenden Koordinaten versehen.

## Schlussfolgerungen

Die automatische Bildorganisation und GPS-Dokumentation ermöglicht eine objektive und reproduzierbare Erfassung von Wegverläufen. Die generierte Dokumentation dient als Grundlage für weitere Analysen und kann für Wegeplanung und -wartung verwendet werden.

# Fotodokumentation

{content}

## Anhänge

### Anhang A: Koordinatenliste

{coordinates_list}

### Anhang B: Technische Metadaten

- **Bildformat:** {file_format}
- **Koordinatenquelle:** GPS-Daten in Dateinamen  
- **Sortieralgorithmus:** Nearest Neighbor  
- **Dokumenterstellung:** Automatisch generiert
