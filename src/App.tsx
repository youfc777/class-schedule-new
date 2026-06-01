import { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { ClassRecordScreen } from './screens/ClassRecordScreen';
import { DutyTableScreen } from './screens/DutyTableScreen';
import './App.css';

type NavigationState =
  | { screen: 'Home' }
  | { screen: 'ClassRecord'; params: { scheduleId: number; className: string } }
  | { screen: 'DutyTable'; params: { buttonId: number; buttonLabel: string } };

export default function App() {
  const [nav, setNav] = useState<NavigationState>({ screen: 'Home' });

  const handleNavigate = (screen: string, params?: any) => {
    if (screen === 'ClassRecord' && params) {
      setNav({ screen: 'ClassRecord', params });
    } else if (screen === 'DutyTable' && params) {
      setNav({ screen: 'DutyTable', params });
    } else {
      setNav({ screen: 'Home' });
    }
  };

  if (nav.screen === 'ClassRecord') {
    return (
      <ClassRecordScreen
        scheduleId={nav.params.scheduleId}
        className={nav.params.className}
        onNavigate={handleNavigate}
      />
    );
  }

  if (nav.screen === 'DutyTable') {
    return (
      <DutyTableScreen
        buttonId={nav.params.buttonId}
        buttonLabel={nav.params.buttonLabel}
        onNavigate={handleNavigate}
      />
    );
  }

  return <HomeScreen onNavigate={handleNavigate} />;
}
