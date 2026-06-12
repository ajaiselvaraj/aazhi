import React from 'react';
import { Language } from '../../../types';
import ApplicationTracker from '../../ApplicationTracker';

interface Props {
  onBack: () => void;
  language: Language;
}

const MunicipalTracker: React.FC<Props> = ({ onBack, language }) => {
  return (
    <ApplicationTracker category="municipal" onBack={onBack} />
  );
};

export default MunicipalTracker;
