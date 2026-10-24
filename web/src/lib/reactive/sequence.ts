// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createSequence } from '../../../../packages/engine/src/reactive/sequence';
export const { march, runLength, bigram, phrase, palindrome, alternate, rewind, ladder, comboLock } = createSequence(defaultEffects.reactiveCore);
