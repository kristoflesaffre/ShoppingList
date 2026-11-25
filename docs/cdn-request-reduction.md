# CDN aanvragen, 25 november 2026

Het Vercel-dashboard toonde over de laatste 30 dagen 756.145 CDN-aanvragen, waarvan 181.827 voor ShoppingList en 568.614 voor Noe's Cijferbos. De spelwebsite is dus de grootste bron. De CLI-query voor exacte padstatistieken vereist een betaald Observability-abonnement; dit is niet geactiveerd.

De recente ShoppingList-productielogs tonen daarnaast iedere 30 seconden GET /api/stremio. StremioProvider staat rond de volledige app, ook bij recepten en de permanent geopende kalender. Een continu zichtbare sessie veroorzaakt daarmee theoretisch 2.880 aanvragen per dag, 86.400 per 30 dagen, zonder overige verkeer. Dit is een berekening, niet de volledige gemeten padverdeling.

Buiten /films-series wordt nu iedere vijf minuten gesynchroniseerd: maximaal 288 periodieke aanvragen per zichtbare sessiedag, 90% minder voor deze specifieke achtergrondcontrole. In Films & series en X-Ray blijft de interval 30 seconden. Eerste laden, terugkeren naar een zichtbare pagina en expliciete wijzigingen blijven direct synchroniseren; verborgen pagina's pollen niet. De autorisatie, Pi-commando's en strikte schermsensorbeveiliging zijn niet gewijzigd.

In het aparte Cijferbos-project is tegelijk de service worker aangepast: spelmedia pas downloaden bij gebruik en daarna uit lokale cache hergebruiken. Historisch verbruik blijft staan. Een abonnement wijzigen is niet nodig om deze codecorrecties te publiceren.
