<div align="center">

# ☁️ Skyline

**A weather bet between friends powered by reactive, self-executing contracts.**

Built as a concept demo for the **[Rialo](https://rialo.io)** Layer-1: a chain where smart contracts wake themselves up on a schedule and call the internet directly, no oracle and no external bot required.

[**🔴 Live Demo**](https://hosam-rialo-sky.surge.sh) · [Report an issue](https://github.com/hosammahdy91/skyline-rialo/issues)

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Built with React](https://img.shields.io/badge/built%20with-React-61DAFB?logo=react&logoColor=white)
![Firebase](https://img.shields.io/badge/backend-Firebase-FFCA28?logo=firebase&logoColor=white)

</div>

---

## The idea

Two friends. One question: *"Will tomorrow's temperature in Cairo go above 35°?"*

Stake a bet, pick a side, and walk away. When the settlement time arrives, the contract:

1. **Wakes itself up** no cron job, no keeper bot watching a queue
2. **Calls a real weather API directly** no oracle network in between
3. **Splits the pot automatically** among whoever guessed right

This is a simulation of what becomes *native* on Rialo: reactive execution and native HTTPS calls built into the base layer, instead of assembled from three separate external systems.

## Why this matters

| What the app needs | On most chains today | On Rialo |
|---|---|---|
| Reading real-world data | An oracle contract + its own network | A direct HTTPS call from inside the contract |
| Executing at a set time | An external keeper bot | A native on-chain time trigger |
| Settlement | Manual logic once data arrives | Reactive execution the moment the condition is met |

## Features

- 🌡️ Create a room with a city, a temperature threshold, and a settlement time
- 🤝 Friends join with a shared link and pick **Over** or **Under**
- ⚡ Fully automatic settlement against a real weather reading ([Open-Meteo](https://open-meteo.com))
- 💰 Pot splits instantly between winners, logged step-by-step
- 🔄 Real-time shared state every visitor sees the same rooms live (via Firestore)
- 🛡️ A 15-minute minimum lead time on every bet, so no one can create and instantly settle a room

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Fast builds, single-command dev server |
| Shared state | Firebase Firestore | Stands in for Rialo's shared on-chain state until mainnet |
| Weather data | Open-Meteo API | Free, no ke the same kind of call a Rialo contract would make natively |
| Hosting | Surge.sh | Zero-config static hosting with real outbound network access |

## Getting started

```bash
git clone https://github.com/hosammahdy91/skyline-rialo.git
cd skyline-rialo
npm install
npm run dev
```

Then open `http://localhost:5173`.

To build for production:

```bash
npm run build
```

> **Note:** the app connects to a shared Firebase project for demo purposes. To run your own independent instance, replace the `firebaseConfig` object in `src/lib/chain.js` with your own Firebase project's credentials.

## Project structure