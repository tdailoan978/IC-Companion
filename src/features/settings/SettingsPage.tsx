import { Link } from 'react-router';
import { BuildStamp } from '../../app/BuildStamp.tsx';
import { useThemeChoice } from '../../app/useThemeChoice.ts';
import { DEFAULT_SETTINGS, updateSettings, useSettings, ZH_SIZE_PX, type ZhSize } from '../../lib/settings.ts';
import { THEME_CHOICES } from '../../lib/theme.ts';
import { BackupSettings } from './BackupSettings.tsx';
import { Segmented, SettingsSection, Stepper, Switch } from './controls.tsx';
import { SpeechSettings } from './SpeechSettings.tsx';
import './settings.css';

const SIZES: { value: ZhSize; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra large' },
];

/** Settings (PLAN.md 5.4): appearance, speech, review limits, backup and reset. */
export function SettingsPage() {
  const settings = useSettings();
  const [theme, setTheme] = useThemeChoice();

  return (
    <div className="page settings-page">
      <h1>Settings</h1>

      <SettingsSection title="Appearance">
        <Segmented
          label="Theme"
          hint="Auto follows the iPad's own Light or Dark setting."
          value={theme}
          options={THEME_CHOICES}
          onChange={setTheme}
        />
        <Segmented
          label="Chinese text size"
          value={settings.zhSize}
          options={SIZES}
          onChange={(zhSize) => updateSettings({ zhSize })}
        />
        <Switch
          label="Show pinyin by default"
          hint="Grammar and Dialogues start with pinyin shown or hidden; each screen still has its own Pinyin toggle."
          on={settings.showPinyin}
          onChange={(showPinyin) => updateSettings({ showPinyin })}
        />
        <figure className="size-sample">
          <span className="sample-zh" lang="zh-Hans" style={{ fontSize: `${ZH_SIZE_PX[settings.zhSize]}px` }}>
            今天比昨天冷。
          </span>
          {settings.showPinyin && <span className="pinyin">Jīntiān bǐ zuótiān lěng.</span>}
          <figcaption className="muted">Today is colder than yesterday. (Sample at the chosen size.)</figcaption>
        </figure>
      </SettingsSection>

      <SpeechSettings />

      <SettingsSection title="Review">
        <Stepper
          label="New review cards per day"
          hint={`Words not yet reviewed that may join review each day. Default ${DEFAULT_SETTINGS.newCardsPerDay}.`}
          value={settings.newCardsPerDay}
          min={5}
          max={50}
          step={5}
          onChange={(newCardsPerDay) => updateSettings({ newCardsPerDay })}
        />
        <Stepper
          label="Cards per session"
          hint={`The most cards in one review session. Default ${DEFAULT_SETTINGS.sessionCap}.`}
          value={settings.sessionCap}
          min={10}
          max={100}
          step={10}
          onChange={(sessionCap) => updateSettings({ sessionCap })}
        />
      </SettingsSection>

      <SettingsSection title="Study plan">
        <p className="settings-pad">
          Study days, daily time and finish date are set on the <Link to="/plan">Study plan</Link> page.
        </p>
      </SettingsSection>

      <BackupSettings refreshKey={`${theme}|${JSON.stringify(settings)}`} />

      <footer className="settings-footer">
        <BuildStamp />
      </footer>
    </div>
  );
}
