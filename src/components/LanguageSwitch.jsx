import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useI18n } from '../i18n/LanguageProvider';

const OPTIONS = [
  { id: 'uk', label: 'УКР' },
  { id: 'ru', label: 'РУС' },
  { id: 'en', label: 'EN' },
];

function LanguageSwitch({ size = 'small', fullWidth = false }) {
  const { lang, setLang } = useI18n();

  return (
    <ToggleButtonGroup
      size={size}
      exclusive
      value={lang}
      fullWidth={fullWidth}
      onChange={(_, next) => {
        if (next) setLang(next);
      }}
      aria-label="language"
    >
      {OPTIONS.map((option) => (
        <ToggleButton key={option.id} value={option.id}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export default LanguageSwitch;
