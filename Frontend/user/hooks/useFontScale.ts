import { useTranslation } from 'react-i18next';

export const useFontScale = () => {
  const { i18n } = useTranslation();

  const getScale = () => {
    switch (i18n.language) {
      case 'ta':
        return 1.15;
      case 'hi':
        return 1.1;
      default:
        return 1;
    }
  };

  return getScale();
};
