/*
  Protect: fingerprints for creator work, so a copy can be found wherever it travels.
  Image fingerprints (dHash and pHash, 64 bits each), audio landmark fingerprints, the verdict between an original
  and a suspected copy, video fingerprints from keyframes with a sliding clip match,
  and an in-memory registry with a BK-tree for lookups that scale.

  Pure functions on raw pixel arrays with no dependencies, so the same code ships to
  the browser (site/assets/engine/protect/), where files never leave the device.
  The rights module refers to a fingerprint only by the string toRightsRef() gives:
  `fp:<algo>:<hex>`.
*/
export { toGrey, resample, lowDct, dHash, pHash, hamming, toHex, fromHex, bits } from "./image.js";
export { fingerprintImage, compare, scoreOf, verdictOf, imageToJSON, imageFromJSON, SAME_MAX, EDITED_MAX, WINDOWS, VERDICT_WORDS } from "./compare.js";
export { sampleTimes, fingerprintVideo, findClip, videoToJSON, videoFromJSON, DEFAULT_INTERVAL, FRAME_MATCH_MAX, MIN_RUN } from "./video.js";
export { BKTree, createRegistry, createAudioRegistry, toRightsRef, parseRightsRef } from "./registry.js";
export { AUDIO_RATE, FFT_SIZE, HOP, FRAME_SECONDS, MIN_ALIGNED, CLEAR_RATIO, SAME_SLACK, SAME_SHIFT, AUDIO_WORDS, toMono, resampleAudio, fft, spectrogram, pickPeaks, packHash, unpackHash, landmarks, fingerprintAudio, fingerprintSamples, hashIndex, vote, readVotes, matchAudio, audioToJSON, audioFromJSON, } from "./audio.js";
export { tones, chirps, melody, speech, gain, addNoise, mixOver, lowpass, requantise, mp3Like, speed, concat, slice, normalise, encodeWav } from "./audiosynth.js";
export { rng, blank, makePhoto, makeShapes, makeNoise, resize, crop, cropBy, brightness, grade, overlay, recompress, WARM_GRADE } from "./synth.js";
