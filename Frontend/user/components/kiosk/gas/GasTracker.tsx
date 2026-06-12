import React from 'react';
import { Language } from '../../../types';
import ApplicationTracker from '../../ApplicationTracker';

interface Props {
  onBack: () => void;
  language: Language;
}

const GasTracker: React.FC<Props> = ({ onBack, language }) => {
  return (
    <ApplicationTracker category="gas" onBack={onBack} />
  );
};

export default GasTracker;
