import { useEffect, useRef, useState } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { adminUiStore } from '../../stores/admin-ui.store.js';

const IDLE_MS = 10 * 60 * 1000;

export const OrderDateReminder = observer(function OrderDateReminder() {
  const [opened, setOpened] = useState(false);
  const openRef = useRef(false);
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(check, Math.max(0, IDLE_MS - (Date.now() - lastActivity.current))); };
    const check = () => {
      if (openRef.current) return;
      if (Date.now() - lastActivity.current >= IDLE_MS) { openRef.current = true; setOpened(true); }
      else schedule();
    };
    const activity = () => { if (openRef.current) return; if (Date.now() - lastActivity.current >= IDLE_MS) check(); else { lastActivity.current = Date.now(); schedule(); } };
    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    schedule();
    return () => { clearTimeout(timer); events.forEach(event => window.removeEventListener(event, activity)); document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check); };
  }, [opened]);
  const close = () => { openRef.current = false; lastActivity.current = Date.now(); setOpened(false); };
  const date = adminUiStore.deliveryDate;
  return <Modal opened={opened} onClose={close} title="התאריך שנבחר להזמנות" closeOnClickOutside={false}>
      <Text>המסך נשאר פתוח ללא פעילות במשך 10 דקות. תאריך ההזמנות שנבחר הוא <b>{date}</b>. האם להמשיך בתאריך זה?</Text>
      <Group mt="md"><Button onClick={close}>המשך באותו תאריך</Button><Button variant="light" onClick={close}>בדיקת התאריך</Button></Group>
    </Modal>;
});
