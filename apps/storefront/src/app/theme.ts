import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'chocolate',
  colors: {
    chocolate: ['#f6f1ed', '#e8ded5', '#cdb9aa', '#b4957d', '#9b7658', '#825b3c', '#69452e', '#523424', '#3d271c', '#2e1e17'],
  },
  fontFamily: 'Arial, sans-serif',
  headings: { fontFamily: 'Arial, sans-serif', fontWeight: '800' },
  defaultRadius: 'lg',
  components: {
    Button: { defaultProps: { size: 'md', color: 'chocolate.8' } },
    Container: { defaultProps: { size: 'xl' } },
  },
});
