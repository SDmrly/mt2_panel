import '@testing-library/jest-dom';
import i18n from './i18n';

// Testlerde deterministik dil: jsdom/happy-dom navigator locale'e düşse bile Türkçe kalsın.
await i18n.changeLanguage('tr');
