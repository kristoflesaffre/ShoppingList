# Restaurant als geplande maaltijd

Restaurant staat in de productzoekcatalogus via `public/images/items/restaurant_{160,240,320}.webp`. Deze transparante varianten zijn verkleind uit de bestaande goedgekeurde `public/images/afspraken/reservatie_restaurant_480.webp`; er is geen bestaande afbeelding vervangen of nieuwe AI-aanroep nodig.

De exacte planningsnamen Restaurant, Resto, Uit eten, Gaan eten en Restaurant reservatie/Reservatie restaurant worden behandeld als maaltijd zonder winkelproducten. Ze krijgen categorie Restaurant en label Uit eten, geen boodschappencheckbox, geen ingrediënten en geen kaart in de supermarktweergave per categorie. De dagweergave, dagkeuzestrook, dagbewerker en kalender gebruiken hetzelfde reservatiebord. De bestaande interne `takeout`-groepering wordt hergebruikt voor deze extern bereide maaltijd; Frituur behoudt zijn eigen foto en label Afhalen.

Kies bij toevoegen een dag om het bezoek in de kalender te plannen. Er is geen afspraak voor een specifieke dag of restaurant aangemaakt als onderdeel van deze codewijziging. Regressietests controleren naamgrenzen, categorie, beeldbestanden, kalendergroepering en nul winkel-ingrediënten.
