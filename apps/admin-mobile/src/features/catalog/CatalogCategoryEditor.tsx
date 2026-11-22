import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Accordion, Anchor, Breadcrumbs, Button, Group, Menu, Modal, NumberInput, Stack, Switch, Text, TextInput } from '@mantine/core';
import { catalogStore as store } from './catalog.store.js';

export const CatalogBreadcrumbs = observer(function CatalogBreadcrumbs() {
  const category = store.selectedCategory;
  return <Breadcrumbs separator="/" aria-label="מיקום בקטלוג" style={{ flexWrap: 'wrap' }}>
    {store.selectedCategoryId ? <Anchor component="button" type="button" disabled={store.saving} onClick={() => store.selectCategory('')}>הקטלוג שלי</Anchor> : <Text>הקטלוג שלי</Text>}
    {category && (store.product ? <Anchor component="button" type="button" disabled={store.saving} onClick={() => store.close()}>{category.name}</Anchor> :
      <Menu><Menu.Target><Button size="compact-sm" variant="subtle" disabled={store.saving}>{category.name} ▾</Button></Menu.Target>
        <Menu.Dropdown>{store.catalog?.categories.map((item) => <Menu.Item key={item.categoryId} onClick={() => store.selectCategory(item.categoryId)}>{item.name}</Menu.Item>)}</Menu.Dropdown>
      </Menu>)}
    {store.product && <Text aria-current="page">{store.product.productId ? store.product.name : 'מוצר חדש'}</Text>}
  </Breadcrumbs>;
});

export const CatalogCategoryEditor = observer(function CatalogCategoryEditor() {
  const form = store.category;
  const [advanced, setAdvanced] = useState<string | null>(null);
  useEffect(() => setAdvanced(null), [form?.categoryId, Boolean(form)]);
  return <Modal opened={!!form} onClose={() => store.closeCategory()} title={form?.categoryId ? 'עריכת קטגוריה' : 'קטגוריה חדשה'} centered>
    {form && <form onSubmit={(event) => { event.preventDefault(); void store.saveCategory(); }}><Stack>
      <TextInput label="שם הקטגוריה" required maxLength={100} disabled={store.saving} value={form.name} onChange={(event) => { form.name = event.currentTarget.value; }} />
      <Accordion variant="contained" value={advanced} onChange={setAdvanced}><Accordion.Item value="advanced">
        <Accordion.Control>הגדרות מתקדמות</Accordion.Control><Accordion.Panel><Stack>
          <NumberInput label="סדר הצגה" min={0} allowDecimal={false} disabled={store.saving} value={form.sortOrder} onChange={(value) => { form.sortOrder = Number(value); }} />
          <Switch label="הקטגוריה מוצגת באתר" disabled={store.saving} checked={form.status === 'active'} onChange={(event) => { form.status = event.currentTarget.checked ? 'active' : 'hidden'; }} />
        </Stack></Accordion.Panel>
      </Accordion.Item></Accordion>
      <Group><Button type="submit" loading={store.saving} disabled={!form.name.trim()}>שמירת קטגוריה</Button>
        <Button variant="subtle" disabled={store.saving} onClick={() => store.closeCategory()}>ביטול</Button></Group>
    </Stack></form>}
  </Modal>;
});
