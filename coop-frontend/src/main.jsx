import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import '@fontsource/kanit/300.css'
import '@fontsource/kanit/400.css'
import '@fontsource/kanit/500.css'
import '@fontsource/kanit/700.css'
import './index.css'
import App from './App.jsx'
import GlobalAlertModalProvider from './components/GlobalAlertModalProvider.jsx'

const theme = createTheme({
  typography: {
    fontFamily: '"Prompt", "Noto Sans Thai", "Kanit", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  palette: {
    primary: {
      main: '#7C3AED',
      light: '#F5F3FF',
      dark: '#6D28D9',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#64748B',
      light: '#F1F5F9',
      dark: '#334155',
      contrastText: '#FFFFFF',
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          fontFamily: '"Prompt", "Noto Sans Thai", "Kanit", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiModal: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiDialog: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiPopover: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiMenu: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
  },
})

// แถบล่างมือถือ (.m-tabbar) เป็น fixed อ้างอิง layout viewport ซึ่งอาจสูงกว่าจอที่เห็นจริง
// (เช่นตอนแถบ URL ของ Safari แสดงอยู่) จึงคำนวณระยะที่ต้องยกขึ้นจาก visualViewport
if (window.visualViewport) {
  const vv = window.visualViewport;
  const updateTabbarOffset = () => {
    const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--tabbar-offset', `${offset}px`);
  };
  vv.addEventListener('resize', updateTabbarOffset);
  vv.addEventListener('scroll', updateTabbarOffset);
  updateTabbarOffset();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalAlertModalProvider>
        <App />
      </GlobalAlertModalProvider>
    </ThemeProvider>
  </StrictMode>,
)
