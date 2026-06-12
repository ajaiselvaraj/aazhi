import React from 'react';
import { Language } from '../../../types';
import ApplicationTracker from '../../ApplicationTracker';

interface Props {
  onBack: () => void;
  language: Language;
}

const ElectricityTracker: React.FC<Props> = ({ onBack, language }) => {
  return (
    <ApplicationTracker category="power" onBack={onBack} />
  );
};

export default ElectricityTracker;
