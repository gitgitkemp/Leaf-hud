# Leaf HUD

Dashboard voor in de auto, gewoon in de browser van je telefoon. Eén bestand (`index.html`), geen installatie.

**Wat erop staat**

- Snelheid in grote 7-segment cijfers (GPS, met optioneel vloeiende aanvulling via de bewegingssensor)
- Kompasstreep: GPS-koers tijdens het rijden, telefoonkompas bij stilstand
- G-meter met spoor, piekring en maxima (optrekken, remmen, bocht)
- Ritregel: rijtijd, afstand, gemiddelde. Optioneel rit-energie in kWh en euro
- Parkeerplek onthouden met pijl en afstand
- HUD-stand: gespiegeld beeld voor reflectie in de voorruit
- Kleur wisselt vanzelf (07:00 blauw, 17:30 donkerrood), vegen om zelf te kiezen
- Haalt zelf nieuwe versies op

## G-meter

De meter rekent met de zwaartekracht uit de sensor, dus het maakt niet uit of de telefoon rechtop, gekanteld, liggend of plat zit. Het teken van de sensor wordt bepaald uit de stand van het scherm, zodat het ook klopt op toestellen die de versnelling andersom doorgeven.

Zit de houder scheef, dan leert de meter dat tijdens het rijden: hij vergelijkt optrekken en remmen met de snelheidsverandering van de GPS, en bochten met de koersverandering. Het ringetje rond de meter laat zien hoe ver de kalibratie is. Bij stilstand stelt hij het nulpunt bij. Elke manier van vastzetten heeft een eigen kalibratie.

- Tik op de meter: nulpunt (bij stilstand) en pieken resetten
- Vasthouden: kalibratie opnieuw

## Testen

```
node tests/motion.test.js
```

Bootst een auto na met de telefoon in verschillende standen en controleert of optrekken, remmen en bochten de goede kant op komen. Draait ook automatisch op GitHub.

## Gebruiken

Zet de map online (bijv. GitHub Pages) en open de pagina op je telefoon. Op iPhone: deel, zet op beginscherm. Locatie en beweging moeten toegestaan zijn.
