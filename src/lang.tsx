import {createContext, useContext} from 'react';

/** Which language is the main (large) one on screen. 'en' by default; the Vietnamese cut wraps the video in 'vi'. */
export const LangContext = createContext<'en' | 'vi'>('en');
export const useViFirst = () => useContext(LangContext) === 'vi';

/** Main and secondary line of a bilingual pair, in the order of the current language. */
export const useBi = () => {
  const vi = useViFirst();
  return (en: React.ReactNode, viText: React.ReactNode): [React.ReactNode, React.ReactNode] => (vi ? [viText, en] : [en, viText]);
};
/** One-line "EN · VI" label: swaps the two halves in the Vietnamese cut. */
export const useFlip = () => {
  const vi = useViFirst();
  return (s: string) => (vi && s.includes(' · ') ? s.split(' · ').reverse().join(' · ') : s);
};
