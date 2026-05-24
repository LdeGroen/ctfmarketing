# CTF Marketing

Inzending- en review-app voor marketingmateriaal van het Café Theater Festival.

Live: https://marketing.cafetheaterfestival.nl

## Flow

1. Maker start een formulier op `/`
2. Vult NL+EN teksten, credits, keywords, foto's (16:9 / 1:1 / 4:5) en video-links in
3. Klikt op "Definitief insturen" — komt in CRM bij marketingteam
4. Marketingteam redigeert, klikt "Stuur naar maker" → maker krijgt mail met `/check/{token}`
5. Maker geeft akkoord of stuurt mail voor wijzigingen
6. Marketingteam zet door naar uiteindelijke Marketing-record in CRM

## Lokaal

```bash
cp .env.example .env
npm install
npm start
```
