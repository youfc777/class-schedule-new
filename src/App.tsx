import { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { ClassRecordScreen } from './screens/ClassRecordScreen';
import './App.css';

type NavigationState =
  | { screen: 'Home' }
  | { screen: 'ClassRecord'; params: { scheduleId: number; className: string } };

export default function App() {
  const [nav, setNav] = useState<NavigationState>({ screen: 'Home' });

  const handleNavigate = (screen: string, params?: { scheduleId: number; className: string }) => {
    if (screen === 'ClassRecord' && params) {
      setNav({ screen: 'ClassRecord', params });
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

  return <HomeScreen onNavigate={handleNavigate} />;
}
