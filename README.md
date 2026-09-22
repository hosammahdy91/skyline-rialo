# Skyline: Weather Bets on Rialo

A simple bet between friends on tomorrow's weather. You stake an amount and pick a side. When the settlement time arrives, the contract wakes itself up, reads the real temperature off the internet, and splits the pot between the winners.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

For a production build: `npm run build` then `npm run preview`.

## Why Rialo specifically

On most other chains, this app needs three external pieces: an oracle to fetch the temperature, a keeper bot to wake the contract at the right time, and a server to host both. On Rialo, all three collapse into the base layer:

| What the app needs | On typical chains | On Rialo |
| --- | --- | --- |
| Reading the temperature | An oracle contract plus its own network | An HTTPS call from inside the contract |
| Executing at a set time | An external bot watching and sending a tx | A native on-chain time trigger |
| Settlement | Manual logic once data arrives | Reactive execution once the condition is met |

## Structure

```
src/
  lib/chain.js             Reactive-contract simulation: deploy, time trigger, HTTPS call, settle
  components/Dial.jsx      Temperature dial, compares the reading to the agreed threshold
  components/ChainLog.jsx  Step-by-step log of what the contract is doing
  components/NewRoom.jsx   Room creation
  App.jsx                  Screens and navigation
  styles.css               Design system
```

### `src/lib/chain.js` is the swap point

All the "chain" logic is isolated in this file and stores state in `localStorage`. Once the real Rialo mainnet is live, its contents get replaced with real SDK calls. `createRoom` becomes a contract deploy, `joinRoom` a deposit transaction, and `settle` disappears entirely because the contract handles it on-chain. Nothing else changes.

The temperature source is Open-Meteo (open-meteo.com), free with no API key, standing in for the same kind of API the contract would call on the real network.

## Notes on the demo

- The "Fast-forward to settlement" button inside a room jumps the settlement time to now, so you can see the full cycle without waiting a day.
- The tokens used in the app are for demo purposes only and have no real value. Rialo has not announced a real token yet.
- Storage is local to the browser. The "Clear all rooms" button on the home screen resets everything.
