import { Alert, Button, Text } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../entities/product/format';
import { useStoreStatus } from '../../shared/store-status';
import { priceInAgorot } from '../../stores/cart.persistence';
import { cartStore } from '../../stores/cart.store';

const AGOROT_PER_SHEKEL = 100;

export const MinimumOrderNotice = observer(function MinimumOrderNotice() {
  const { minimumAgorot, missingAgorot, status } = useMinimumOrderStatus();
  if (status.isPending || cartStore.subtotalAgorot === null) return null;
  if (status.isError || minimumAgorot === null) return <Alert color="orange" role="alert">
    לא ניתן לבדוק כרגע את מינימום ההזמנה.
    <Button variant="subtle" onClick={() => void status.refetch()}>ניסיון נוסף</Button>
  </Alert>;
  if (missingAgorot === null || missingAgorot <= 0) return null;
  return <Alert color="orange" title="מה תרצו להוסיף כדי להגיע למינימום ההזמנה?" role="status">
    <Text size="sm">מינימום המוצרים הוא {formatPrice(minimumAgorot / AGOROT_PER_SHEKEL)}.
      {' '}חסרים {formatPrice(missingAgorot / AGOROT_PER_SHEKEL)} להשלמת ההזמנה; דמי המשלוח אינם נכללים במינימום.</Text>
    <Button component={Link} to="/catalog" variant="light" mt="sm" onClick={cartStore.close}>לבחירת מוצרים נוספים</Button>
  </Alert>;
});

export function useMinimumOrderStatus() {
  const status = useStoreStatus();
  const minimumAgorot = priceInAgorot(status.data?.minimumProductSubtotal ?? '');
  const subtotal = cartStore.subtotalAgorot;
  const missingAgorot = minimumAgorot === null || subtotal === null ? null : Math.max(minimumAgorot - subtotal, 0);
  return { minimumAgorot, missingAgorot, isMet: missingAgorot === 0, status };
}
