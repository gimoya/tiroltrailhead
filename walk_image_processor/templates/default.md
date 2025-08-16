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
**Datum der Begehung:** XX.XX.XXXX  
**Untersuchungsgebiet:** {location}  
**Dokumentenformat:** Begehungsbericht  
**Teilnehmende Personen:** P1, P2, ...  

## Begehungsstatistik

- **Gesamtbilder:** {total_images}
- **Dokumentierte Strecke:** {total_distance} km (Luftlinie zwischen Aufnahmepunkten)
- **Koordinatensystem:** WGS84 (GPS)

## Zielsetzung

Zielsetzung der Begehung...

## Methodik

Die Bildorganisation erfolgte automatisch nach chronologischen Kriterien. Alle Bilder werden verarbeitet, wobei Bilder ohne Zeitstempel zuerst angezeigt werden, gefolgt von Bildern mit Zeitstempel in chronologischer Reihenfolge. Die Entfernungsberechnung erfolgt mittels Haversine-Formel für präzise GPS-Distanzbestimmung zwischen aufeinanderfolgenden Aufnahmepunkten.

## Ergebnis

Ergebnisse...

## Schlussfolgerungen

Schlussfolgerungen...

# Fotodokumentation

{content}

## Anhänge

### Anhang A: Koordinatenliste

{coordinates_list}

### Anhang B: Technische Metadaten

- **Bildformat:** {file_format}
- **Dokumentformat:** A4 PDF
- **Koordinatenquelle:** GPS-Daten in Dateinamen  
- **Datumsquelle:** Datum und Uhrzeit in Dateinamen  
- **Sortieralgorithmus:** Chronologisch
