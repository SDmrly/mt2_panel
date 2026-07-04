import { render, screen, fireEvent } from '@testing-library/react';
import i18n from '../../i18n';
import { LanguageToggle } from './LanguageToggle';

it('TR|EN gösterir ve tıklayınca dili değiştirir', async () => {
  await i18n.changeLanguage('tr');
  render(<LanguageToggle />);
  fireEvent.click(screen.getByRole('button', { name: 'EN' }));
  expect(i18n.language).toBe('en');
  await i18n.changeLanguage('tr'); // testi izole et
});
