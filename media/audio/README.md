# Turkish voice-over: options for the owner to evaluate (no engine chosen yet)

Listen: `media/audio/samples/*.mp3`. All samples read the same V02 narration (text in `samples/samples.json`).

## Samples produced (free, local, no accounts)
| File | Engine | Licence for marketing use | Cost |
|---|---|---|---|
| `chatterbox-tr-natural.mp3` | Resemble AI **Chatterbox Multilingual** (neural, runs locally) default delivery | **MIT, commercial use allowed.** Output contains Resemble's inaudible "Perth" watermark | 0 |
| `chatterbox-tr-calm.mp3` | Chatterbox Multilingual, calmer/slower settings | MIT | 0 |
| `macos-yelda-baseline.mp3` | macOS built-in "Yelda" (current draft voice) | Apple licence restricts system voices to personal, non-commercial use, so **draft only** | 0 |

## Other options checked (not sampled; reason)
| Option | Turkish? | Licence / access | Notes |
|---|---|---|---|
| Piper (`tr_TR-dfki`) | Yes | **CC BY-NC-SA, non-commercial** | Excluded for marketing |
| Coqui XTTS-v2 | Yes | Coqui Public Model Licence, **non-commercial** | Excluded |
| Meta MMS-TTS (tur) | Yes | **CC BY-NC 4.0** | Excluded |
| Microsoft Azure Speech (official API) | Yes, neural tr-TR voices (e.g. Emel, Ahmet) | Commercial OK; has a monthly free tier | **Needs your Azure account and a key.** Verify current free quota. Free tier, but a card is usually required |
| Google Cloud Text-to-Speech (official API) | Yes, tr-TR WaveNet/Neural2 voices | Commercial OK; monthly free tier | **Needs a Google Cloud billing account.** Verify current free quota |
| ElevenLabs | Yes | Free plan is non-commercial with attribution; commercial needs a **paid** plan | Paid, so needs your approval |
| "edge-tts" (Microsoft Edge read-aloud) | Yes | **Unofficial API**, against our "official APIs only" rule | Excluded |
| Your own voice / a volunteer | – | Best authenticity; you own it | Drop `assets/library/V##/voiceover.wav`; the renderer uses it automatically |

## How to decide
1. Listen to the three MP3s (and V02 itself: `media/rendered/V02.mp4` uses the Chatterbox candidate).
2. Tell the team: Chatterbox / owner voice / try a cloud engine (needs your account; 0 TL within free tier).
3. Until you choose, renders with a TTS voice are marked `candidate` and the publish gate refuses them.
