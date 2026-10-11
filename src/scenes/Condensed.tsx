import {Series} from 'remotion';
import {CLOSING_SHORT_DURATION, ClosingShort} from './ClosingShort';
import {MAIN_RACE_DURATION, MainRace} from './MainRace';
import {PROBLEM04_DURATION, Problem04} from './Problem04';
import {TitleScene} from './TitleScene';
import {toFrames} from '../theme';

const TITLE = toFrames(180);
export const CONDENSED_DURATION = TITLE + MAIN_RACE_DURATION + PROBLEM04_DURATION + CLOSING_SHORT_DURATION;

/** Condensed version: title → race + problems 01–03 on one map → problem 04 → short ending. */
export const Condensed: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={TITLE}>
      <TitleScene />
    </Series.Sequence>
    <Series.Sequence durationInFrames={MAIN_RACE_DURATION}>
      <MainRace />
    </Series.Sequence>
    <Series.Sequence durationInFrames={PROBLEM04_DURATION}>
      <Problem04 />
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLOSING_SHORT_DURATION}>
      <ClosingShort />
    </Series.Sequence>
  </Series>
);
